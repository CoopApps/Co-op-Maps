/**
 * Co-opMaps - Relationships Module
 * Handles relationship/connector creation and management between enterprises
 */

(function() {
    'use strict';

    const relationships = {
        relationshipCreationActive: false,
        startEnterprise: null,
        previewX: 0,
        previewY: 0,

        init() {
            console.log('Relationships module initialized');
            this.bindKeyboardShortcuts();
        },

        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'r' || e.key === 'R') {
                    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                        // Don't trigger if typing in an input
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                            this.toggleRelationshipMode();
                        }
                    }
                }
            });
        },

        toggleRelationshipMode() {
            this.relationshipCreationActive = !this.relationshipCreationActive;

            const btn = document.getElementById('relationshipModeBtn');
            if (btn) {
                if (this.relationshipCreationActive) {
                    btn.style.background = 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary-dark) 100%)';
                    btn.style.color = 'white';
                    btn.textContent = 'Creating Relationship... (ESC to cancel)';
                    window.CoopMaps.showNotification('Click on two enterprises to create a relationship', 'info');
                } else {
                    btn.style.background = 'var(--primary)';
                    btn.style.color = 'white';
                    btn.textContent = 'Create Relationship';
                    this.cancelRelationshipCreation();
                }
            }
        },

        handleCanvasClick(x, y) {
            if (!this.relationshipCreationActive) return;

            const canvas = window.CoopMaps.modules.canvas;
            if (!canvas) return;

            const enterprise = canvas.getEnterpriseAt(x, y);
            if (!enterprise) return;

            if (!this.startEnterprise) {
                // First click - select start enterprise
                this.startEnterprise = enterprise;
                window.CoopMaps.showNotification(`Selected ${enterprise.name} as start. Click another enterprise to complete.`, 'info');
            } else if (this.startEnterprise.id === enterprise.id) {
                // Clicked same enterprise
                window.CoopMaps.showNotification('Please select a different enterprise', 'error');
            } else {
                // Second click - create relationship
                this.createRelationship(this.startEnterprise, enterprise);
                this.cancelRelationshipCreation();
            }
        },

        createRelationship(startEnt, endEnt, type = 'G') {
            const relationship = {
                id: window.CoopMaps.generateId(),
                startEnterpriseId: startEnt.id,
                endEnterpriseId: endEnt.id,
                type: type,
                startSegmentation: 'individual',
                endSegmentation: 'individual',
                color: null, // Will use default from relationship type
                customProperties: {}
            };

            const state = window.CoopMaps.state.data;
            state.relationships.push(relationship);

            window.CoopMaps.saveState();

            if (window.CoopMaps.modules.canvas) {
                window.CoopMaps.modules.canvas.render();
            }

            window.CoopMaps.showNotification(`Relationship created: ${startEnt.name} → ${endEnt.name}`, 'success');

            // Show relationship type selector dialog
            this.showRelationshipTypeDialog(relationship);
        },

        showRelationshipTypeDialog(relationship) {
            const shapes = window.CoopMaps.modules.shapes;
            if (!shapes) return;

            let html = `
                <div class="modal" id="relationshipTypeModal" style="display: flex;">
                    <div class="modal-content">
                        <h2 style="margin-bottom: 20px;">Select Relationship Type</h2>
                        <p style="margin-bottom: 20px; color: var(--gray);">
                            What type of exchange does this relationship represent?
                        </p>
                        <div style="display: grid; gap: 12px;">
            `;

            Object.keys(shapes.relationshipTypes).forEach(typeKey => {
                const type = shapes.relationshipTypes[typeKey];
                const isSelected = typeKey === relationship.type;
                html += `
                    <button
                        class="rel-type-btn ${isSelected ? 'selected' : ''}"
                        data-type="${typeKey}"
                        style="padding: 16px; text-align: left; border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--light-gray)'}; border-radius: 8px; background: ${isSelected ? 'rgba(52, 152, 219, 0.1)' : 'white'}; cursor: pointer; transition: var(--transition-fast);">
                        <div style="font-weight: 600; color: ${type.color}; margin-bottom: 4px;">
                            ${type.label}
                        </div>
                        <div style="font-size: 12px; color: var(--gray);">
                            Style: ${type.style}
                        </div>
                    </button>
                `;
            });

            html += `
                        </div>
                        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn-secondary" onclick="document.getElementById('relationshipTypeModal').remove();" style="padding: 10px 20px; background: var(--light-gray); border: none; border-radius: 8px; cursor: pointer;">
                                Cancel
                            </button>
                            <button class="btn-primary" onclick="CoopMaps.modules.relationships.saveRelationshipType('${relationship.id}'); document.getElementById('relationshipTypeModal').remove();">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);

            // Bind type selection
            document.querySelectorAll('.rel-type-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.rel-type-btn').forEach(b => {
                        b.classList.remove('selected');
                        b.style.border = '2px solid var(--light-gray)';
                        b.style.background = 'white';
                    });
                    this.classList.add('selected');
                    this.style.border = '2px solid var(--primary)';
                    this.style.background = 'rgba(52, 152, 219, 0.1)';
                    relationship.type = this.dataset.type;
                });
            });
        },

        saveRelationshipType(relationshipId) {
            window.CoopMaps.saveState();
            if (window.CoopMaps.modules.canvas) {
                window.CoopMaps.modules.canvas.render();
            }
        },

        updatePreview(x, y) {
            this.previewX = x;
            this.previewY = y;
        },

        drawCreationPreview(ctx) {
            if (!this.startEnterprise) return;

            const startX = this.startEnterprise.x + this.startEnterprise.width / 2;
            const startY = this.startEnterprise.y + this.startEnterprise.height / 2;

            ctx.save();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(this.previewX, this.previewY);
            ctx.stroke();

            ctx.restore();
        },

        cancelRelationshipCreation() {
            this.relationshipCreationActive = false;
            this.startEnterprise = null;
            this.previewX = 0;
            this.previewY = 0;

            const btn = document.getElementById('relationshipModeBtn');
            if (btn) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.textContent = 'Create Relationship';
            }

            if (window.CoopMaps.modules.canvas) {
                window.CoopMaps.modules.canvas.render();
            }
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('relationships', relationships);
    }
})();
