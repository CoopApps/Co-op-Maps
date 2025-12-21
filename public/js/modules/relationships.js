// Module 4: Relationships Module (Complete Rewrite with Improved Orthogonal Support)
(function() {
    'use strict';

    CoopMaps.registerModule('relationships', {
        relationshipCreationActive: false,
        startEnterprise: null,
        previewX: 0,
        previewY: 0,
        hoverRelationship: null,

        // Relationship type configurations with colors and styles
        relationshipTypes: {
            'G': { label: 'Governance', color: '#e74c3c', style: 'solid', letter: 'G' },
            'I': { label: 'Investment', color: '#27ae60', style: 'solid', letter: 'I' },
            'L': { label: 'Asset Lock', color: '#f39c12', style: 'solid', letter: 'L' },
            'M': { label: 'Member', color: '#9b59b6', style: 'solid', letter: 'M' },
            'O': { label: 'Owns', color: '#34495e', style: 'solid', letter: 'O' },
            'P': { label: 'Partner', color: '#3498db', style: 'solid', letter: 'P' },
            'S': { label: 'Supplies', color: '#16a085', style: 'solid', letter: 'S' },
            'INNER': { label: 'Inner Segment', color: '#95a5a6', style: 'dashed', letter: '' }
        },

        // Segmentation marker types
        segmentationTypes: {
            start: {
                'individual': { label: 'Individual', marker: 'none' },
                'entireSet': { label: 'Entire Set', marker: 'filledCircle' },
                'subset': { label: 'Subset', marker: 'hollowCircle' }
            },
            end: {
                'individual': { label: 'Individual', marker: 'filledArrow' },
                'entireSet': { label: 'Entire Set', marker: 'filledTriangle' },
                'subset': { label: 'Subset', marker: 'hollowTriangle' }
            }
        },

        init() {
            console.log('Relationships module initialized');
            this.bindKeyboardShortcuts();
            this.createModeIndicator();
        },

        createModeIndicator() {
            const indicator = document.createElement('div');
            indicator.id = 'relationshipModeIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
                font-weight: 600;
                z-index: 10000;
                display: none;
                animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;
            indicator.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🔗</span>
                    <span>Relationship Mode Active - Click two enterprises to connect (ESC to exit mode)</span>
                </div>
            `;
            document.body.appendChild(indicator);
        },

        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // R key to toggle relationship mode
                if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.toggleRelationshipMode();
                    }
                }

                // ESC to cancel
                if (e.key === 'Escape' && this.relationshipCreationActive) {
                    e.preventDefault();
                    this.cancelRelationshipCreation();
                }
            });
        },

        toggleRelationshipMode() {
            this.relationshipCreationActive = !this.relationshipCreationActive;

            const indicator = document.getElementById('relationshipModeIndicator');
            if (indicator) {
                indicator.style.display = this.relationshipCreationActive ? 'block' : 'none';
            }

            const btn = document.getElementById('relationshipModeBtn');
            if (btn) {
                if (this.relationshipCreationActive) {
                    btn.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
                    btn.style.color = 'white';
                    btn.style.boxShadow = '0 4px 12px rgba(46, 204, 113, 0.3)';
                } else {
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.boxShadow = '';
                    this.cancelRelationshipCreation();
                }
            }

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        handleCanvasClick(x, y) {
            if (!this.relationshipCreationActive) return false;

            const enterprise = CoopMaps.modules.canvas.getItemAtPosition(x, y);
            if (!enterprise) return false;

            if (!this.startEnterprise) {
                // First click - select start enterprise
                this.startEnterprise = enterprise;

                // Visual feedback
                const indicator = document.getElementById('relationshipModeIndicator');
                if (indicator) {
                    indicator.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 18px;">🔗</span>
                            <span>Selected: ${enterprise.name}</span>
                            <span style="opacity: 0.8; font-size: 12px; margin-left: 8px;">Click target enterprise</span>
                        </div>
                    `;
                }
                return true;
            } else if (this.startEnterprise.id === enterprise.id) {
                // Clicked same enterprise - show error
                CoopMaps.showNotification('Please select a different enterprise', 'error');
                return true;
            } else {
                // Second click - create relationship
                this.showRelationshipDialog(this.startEnterprise, enterprise);
                return true;
            }
        },

        showRelationshipDialog(startEnt, endEnt) {
            // Create modal backdrop
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease-out;
            `;

            // Step 1: Select relationship type
            const typeDialog = document.createElement('div');
            typeDialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            let html = `
                <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 24px;">Create Relationship</h2>
                <p style="margin: 0 0 24px 0; color: #7f8c8d; font-size: 14px;">
                    From <strong>${startEnt.name}</strong> to <strong>${endEnt.name}</strong>
                </p>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #34495e;">
                        Relationship Type
                    </label>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            `;

            Object.entries(this.relationshipTypes).forEach(([key, type]) => {
                if (key === 'INNER') return; // Skip INNER type in normal selection
                html += `
                    <button class="rel-type-option" data-type="${key}" style="
                        padding: 16px;
                        border: 2px solid #ecf0f1;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: left;
                    " onmouseover="this.style.borderColor='${type.color}'; this.style.transform='translateY(-2px)';"
                       onmouseout="if(!this.classList.contains('selected')) { this.style.borderColor='#ecf0f1'; this.style.transform='translateY(0)'; }">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <div style="
                                width: 24px;
                                height: 24px;
                                border-radius: 50%;
                                background: ${type.color};
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: 12px;
                            ">${type.letter}</div>
                            <span style="font-weight: 600; color: #2c3e50;">${type.label}</span>
                        </div>
                        <div style="font-size: 12px; color: #95a5a6;">Click to select</div>
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelRelBtn" style="
                        padding: 10px 24px;
                        border: 2px solid #ecf0f1;
                        border-radius: 8px;
                        background: white;
                        color: #7f8c8d;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Cancel</button>
                    <button id="nextStepBtn" disabled style="
                        padding: 10px 24px;
                        border: none;
                        border-radius: 8px;
                        background: #bdc3c7;
                        color: white;
                        font-weight: 600;
                        cursor: not-allowed;
                        transition: all 0.2s;
                    ">Next Step →</button>
                </div>
            `;

            typeDialog.innerHTML = html;
            modal.appendChild(typeDialog);
            document.body.appendChild(modal);

            let selectedType = null;

            // Bind type selection
            typeDialog.querySelectorAll('.rel-type-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    typeDialog.querySelectorAll('.rel-type-option').forEach(b => {
                        b.classList.remove('selected');
                        b.style.borderColor = '#ecf0f1';
                        b.style.background = 'white';
                    });
                    btn.classList.add('selected');
                    const type = this.relationshipTypes[btn.dataset.type];
                    btn.style.borderColor = type.color;
                    btn.style.background = `${type.color}10`;
                    selectedType = btn.dataset.type;

                    // Enable next button
                    const nextBtn = document.getElementById('nextStepBtn');
                    nextBtn.disabled = false;
                    nextBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                    nextBtn.style.cursor = 'pointer';
                });
            });

            // Cancel button
            document.getElementById('cancelRelBtn').addEventListener('click', () => {
                modal.remove();
                this.cancelRelationshipCreation();
            });

            // Next step button
            document.getElementById('nextStepBtn').addEventListener('click', () => {
                if (selectedType) {
                    modal.remove();
                    this.showSegmentationDialog(startEnt, endEnt, selectedType);
                }
            });

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    this.cancelRelationshipCreation();
                }
            });
        },

        showSegmentationDialog(startEnt, endEnt, relType) {
            // Only show if either enterprise is a generic set
            const needsSegmentation = startEnt.isGenericSet || endEnt.isGenericSet;

            if (!needsSegmentation) {
                // Create relationship directly
                this.createRelationship(startEnt, endEnt, relType, 'individual', 'individual');
                return;
            }

            // Create modal backdrop
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease-out;
            `;

            const segDialog = document.createElement('div');
            segDialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            let html = `
                <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 24px;">Segmentation Markers</h2>
                <p style="margin: 0 0 24px 0; color: #7f8c8d; font-size: 14px;">
                    Configure how this relationship connects to generic sets
                </p>
            `;

            // Start segmentation (if needed)
            if (startEnt.isGenericSet) {
                html += `
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #34495e;">
                            Start Point: ${startEnt.name}
                        </label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                `;

                Object.entries(this.segmentationTypes.start).forEach(([key, seg]) => {
                    html += `
                        <button class="seg-start-option" data-seg="${key}" style="
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 8px;
                            background: white;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-align: center;
                        " onmouseover="this.style.borderColor='#3498db'; this.style.transform='translateY(-2px)';"
                           onmouseout="if(!this.classList.contains('selected')) { this.style.borderColor='#ecf0f1'; this.style.transform='translateY(0)'; }">
                            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${seg.label}</div>
                            <div style="font-size: 11px; color: #95a5a6;">${seg.marker}</div>
                        </button>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }

            // End segmentation (if needed)
            if (endEnt.isGenericSet) {
                html += `
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #34495e;">
                            End Point: ${endEnt.name}
                        </label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                `;

                Object.entries(this.segmentationTypes.end).forEach(([key, seg]) => {
                    html += `
                        <button class="seg-end-option" data-seg="${key}" style="
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 8px;
                            background: white;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-align: center;
                        " onmouseover="this.style.borderColor='#3498db'; this.style.transform='translateY(-2px)';"
                           onmouseout="if(!this.classList.contains('selected')) { this.style.borderColor='#ecf0f1'; this.style.transform='translateY(0)'; }">
                            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${seg.label}</div>
                            <div style="font-size: 11px; color: #95a5a6;">${seg.marker}</div>
                        </button>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }

            html += `
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelSegBtn" style="
                        padding: 10px 24px;
                        border: 2px solid #ecf0f1;
                        border-radius: 8px;
                        background: white;
                        color: #7f8c8d;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Cancel</button>
                    <button id="createRelBtn" style="
                        padding: 10px 24px;
                        border: none;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Create Relationship</button>
                </div>
            `;

            segDialog.innerHTML = html;
            modal.appendChild(segDialog);
            document.body.appendChild(modal);

            let startSeg = 'individual';
            let endSeg = 'individual';

            // Bind start segmentation selection
            if (startEnt.isGenericSet) {
                segDialog.querySelectorAll('.seg-start-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        segDialog.querySelectorAll('.seg-start-option').forEach(b => {
                            b.classList.remove('selected');
                            b.style.borderColor = '#ecf0f1';
                            b.style.background = 'white';
                        });
                        btn.classList.add('selected');
                        btn.style.borderColor = '#3498db';
                        btn.style.background = '#3498db10';
                        startSeg = btn.dataset.seg;
                    });
                });

                // Select first option by default
                const firstStart = segDialog.querySelector('.seg-start-option');
                if (firstStart) firstStart.click();
            }

            // Bind end segmentation selection
            if (endEnt.isGenericSet) {
                segDialog.querySelectorAll('.seg-end-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        segDialog.querySelectorAll('.seg-end-option').forEach(b => {
                            b.classList.remove('selected');
                            b.style.borderColor = '#ecf0f1';
                            b.style.background = 'white';
                        });
                        btn.classList.add('selected');
                        btn.style.borderColor = '#3498db';
                        btn.style.background = '#3498db10';
                        endSeg = btn.dataset.seg;
                    });
                });

                // Select first option by default
                const firstEnd = segDialog.querySelector('.seg-end-option');
                if (firstEnd) firstEnd.click();
            }

            // Cancel button
            document.getElementById('cancelSegBtn').addEventListener('click', () => {
                modal.remove();
                this.cancelRelationshipCreation();
            });

            // Create button
            document.getElementById('createRelBtn').addEventListener('click', () => {
                modal.remove();
                this.createRelationship(startEnt, endEnt, relType, startSeg, endSeg);
            });

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    this.cancelRelationshipCreation();
                }
            });
        },

        createRelationship(startEnt, endEnt, type, startSeg, endSeg) {
            const relationship = {
                id: CoopMaps.generateId(),
                startEnterpriseId: startEnt.id,
                endEnterpriseId: endEnt.id,
                type: type,
                startSegmentation: startSeg || 'individual',
                endSegmentation: endSeg || 'individual'
            };

            CoopMaps.state.data.relationships.push(relationship);
            CoopMaps.saveState();

            // Success notification
            CoopMaps.showNotification(`Relationship created: ${startEnt.name} → ${endEnt.name}`, 'success');

            // Exit relationship mode
            this.cancelRelationshipCreation();

            // Trigger canvas update
            document.dispatchEvent(new CustomEvent('diagram-changed'));
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        updatePreview(x, y) {
            if (this.relationshipCreationActive && this.startEnterprise) {
                this.previewX = x;
                this.previewY = y;
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }
            }
        },

        drawCreationPreview(ctx) {
            if (!this.startEnterprise || !this.relationshipCreationActive) return;

            const startX = this.startEnterprise.x + this.startEnterprise.width / 2;
            const startY = this.startEnterprise.y + this.startEnterprise.height / 2;

            ctx.save();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.globalAlpha = 0.7;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(this.previewX, this.previewY);
            ctx.stroke();

            // Draw preview endpoint
            ctx.setLineDash([]);
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(this.previewX, this.previewY, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        },

        cancelRelationshipCreation() {
            this.relationshipCreationActive = false;
            this.startEnterprise = null;
            this.previewX = 0;
            this.previewY = 0;

            const indicator = document.getElementById('relationshipModeIndicator');
            if (indicator) {
                indicator.style.display = 'none';
                indicator.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">🔗</span>
                        <span>Relationship Mode Active</span>
                        <span style="opacity: 0.8; font-size: 12px; margin-left: 8px;">Press ESC to exit</span>
                    </div>
                `;
            }

            const btn = document.getElementById('relationshipModeBtn');
            if (btn) {
                btn.style.background = '';
                btn.style.color = '';
                btn.style.boxShadow = '';
            }

            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        // Main relationship rendering function
        drawRelationships(ctx) {
            const connectorStyle = CoopMaps.state.data.diagramProperties?.connectorStyle || 'orthogonal';

            if (connectorStyle === 'orthogonal') {
                this.drawOrthogonalRelationships(ctx);
            } else {
                this.drawDirectRelationships(ctx);
            }
        },

        // Draw all relationships using direct (straight line) style
        drawDirectRelationships(ctx) {
            const relationships = CoopMaps.state.data.relationships || [];
            const enterprises = CoopMaps.state.data.enterprises || [];

            // Group relationships by enterprise pairs to detect bidirectional
            const relationshipGroups = new Map();

            relationships.forEach(rel => {
                const startEnt = enterprises.find(e => e.id === rel.startEnterpriseId);
                const endEnt = enterprises.find(e => e.id === rel.endEnterpriseId);

                if (!startEnt || !endEnt) return;

                // Create a consistent key for the pair (always smaller ID first)
                const pairKey = [rel.startEnterpriseId, rel.endEnterpriseId].sort().join('-');

                if (!relationshipGroups.has(pairKey)) {
                    relationshipGroups.set(pairKey, {
                        forward: [],
                        backward: [],
                        startEnt,
                        endEnt
                    });
                }

                const group = relationshipGroups.get(pairKey);

                // Determine if this is forward or backward based on sorted IDs
                const isForward = rel.startEnterpriseId < rel.endEnterpriseId;
                if (isForward) {
                    group.forward.push(rel);
                } else {
                    group.backward.push(rel);
                }
            });

            // Draw each group
            relationshipGroups.forEach(group => {
                const hasForward = group.forward.length > 0;
                const hasBackward = group.backward.length > 0;
                const isBidirectional = hasForward && hasBackward;

                // Draw forward relationships
                if (hasForward) {
                    const startEnt = enterprises.find(e => e.id === group.forward[0].startEnterpriseId);
                    const endEnt = enterprises.find(e => e.id === group.forward[0].endEnterpriseId);
                    this.drawDirectRelationshipGroup(ctx, group.forward, startEnt, endEnt, isBidirectional);
                }

                // Draw backward relationships
                if (hasBackward) {
                    const startEnt = enterprises.find(e => e.id === group.backward[0].startEnterpriseId);
                    const endEnt = enterprises.find(e => e.id === group.backward[0].endEnterpriseId);
                    this.drawDirectRelationshipGroup(ctx, group.backward, startEnt, endEnt, isBidirectional);
                }
            });
        },

        drawDirectRelationshipGroup(ctx, relationships, startEnt, endEnt, hasOppositeDirection) {
            if (!hasOppositeDirection) {
                // Single direction - draw straight line
                const start = this.getConnectionPoint(startEnt, endEnt, 'start');
                const end = this.getConnectionPoint(endEnt, startEnt, 'end');

                // Draw path
                ctx.save();
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                ctx.restore();

                // Draw markers and badges
                this.drawSegmentationMarkers(ctx, start, end, relationships[0]);
                this.drawRelationshipBadges(ctx, [start, end], relationships);

                return;
            }

            // Bidirectional - need offset
            const baseStart = this.getConnectionPoint(startEnt, endEnt, 'start');
            const baseEnd = this.getConnectionPoint(endEnt, startEnt, 'end');

            // ALWAYS calculate perpendicular based on a consistent reference direction
            // Use alphabetical order of IDs to determine the reference direction
            const refStart = startEnt.id < endEnt.id ? startEnt : endEnt;
            const refEnd = startEnt.id < endEnt.id ? endEnt : startEnt;

            // Get reference points for consistent perpendicular calculation
            const refStartPoint = this.getConnectionPoint(refStart, refEnd, 'start');
            const refEndPoint = this.getConnectionPoint(refEnd, refStart, 'end');

            // Calculate perpendicular based on reference direction
            const dx = refEndPoint.x - refStartPoint.x;
            const dy = refEndPoint.y - refStartPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const perpX = -dy / distance;
            const perpY = dx / distance;

            // Determine which direction this group represents
            const isForwardDirection = (startEnt.id === refStart.id && endEnt.id === refEnd.id);

            // Apply offset based on direction
            const OFFSET = 40;
            const offsetMultiplier = isForwardDirection ? -1 : 1;

            const start = {
                x: baseStart.x + perpX * OFFSET * offsetMultiplier,
                y: baseStart.y + perpY * OFFSET * offsetMultiplier
            };

            const end = {
                x: baseEnd.x + perpX * OFFSET * offsetMultiplier,
                y: baseEnd.y + perpY * OFFSET * offsetMultiplier
            };

            // Draw path
            ctx.save();
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.restore();

            // Draw markers and badges
            this.drawSegmentationMarkers(ctx, start, end, relationships[0]);
            this.drawRelationshipBadges(ctx, [start, end], relationships);
        },

        // Draw all relationships using orthogonal (right-angle) style
        drawOrthogonalRelationships(ctx) {
            const relationships = CoopMaps.state.data.relationships || [];
            const enterprises = CoopMaps.state.data.enterprises || [];

            // Group relationships by enterprise pairs
            const relationshipGroups = new Map();

            relationships.forEach(rel => {
                const startEnt = enterprises.find(e => e.id === rel.startEnterpriseId);
                const endEnt = enterprises.find(e => e.id === rel.endEnterpriseId);

                if (!startEnt || !endEnt) return;

                const pairKey = [rel.startEnterpriseId, rel.endEnterpriseId].sort().join('-');

                if (!relationshipGroups.has(pairKey)) {
                    relationshipGroups.set(pairKey, {
                        forward: [],
                        backward: [],
                        startEnt,
                        endEnt
                    });
                }

                const group = relationshipGroups.get(pairKey);
                const isForward = rel.startEnterpriseId < rel.endEnterpriseId;

                if (isForward) {
                    group.forward.push(rel);
                } else {
                    group.backward.push(rel);
                }
            });

            // Draw each group
            relationshipGroups.forEach(group => {
                const hasForward = group.forward.length > 0;
                const hasBackward = group.backward.length > 0;
                const isBidirectional = hasForward && hasBackward;

                if (hasForward) {
                    const startEnt = enterprises.find(e => e.id === group.forward[0].startEnterpriseId);
                    const endEnt = enterprises.find(e => e.id === group.forward[0].endEnterpriseId);
                    this.drawOrthogonalRelationshipGroup(ctx, group.forward, startEnt, endEnt, isBidirectional);
                }

                if (hasBackward) {
                    const startEnt = enterprises.find(e => e.id === group.backward[0].startEnterpriseId);
                    const endEnt = enterprises.find(e => e.id === group.backward[0].endEnterpriseId);
                    this.drawOrthogonalRelationshipGroup(ctx, group.backward, startEnt, endEnt, isBidirectional);
                }
            });
        },

        drawOrthogonalRelationshipGroup(ctx, relationships, startEnt, endEnt, hasOppositeDirection) {
            // Calculate orthogonal path
            const path = this.calculateOrthogonalPath(startEnt, endEnt, hasOppositeDirection);

            if (!path || path.length < 2) return;

            // Draw the path
            ctx.save();
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
            ctx.restore();

            // Draw segmentation markers
            this.drawSegmentationMarkers(ctx, path[0], path[path.length - 1], relationships[0]);

            // Draw relationship badges
            this.drawRelationshipBadges(ctx, path, relationships);
        },

        calculateOrthogonalPath(startEnt, endEnt, isBidirectional) {
            // Get connection points
            const start = this.getConnectionPoint(startEnt, endEnt, 'start');
            const end = this.getConnectionPoint(endEnt, startEnt, 'end');

            // Apply offset for bidirectional relationships
            let offsetStart = start;
            let offsetEnd = end;

            if (isBidirectional) {
                const OFFSET = 40;
                const refStart = startEnt.id < endEnt.id ? startEnt : endEnt;
                const isForward = (startEnt.id === refStart.id);

                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const perpX = -dy / distance;
                const perpY = dx / distance;

                const offsetMult = isForward ? -1 : 1;

                offsetStart = {
                    x: start.x + perpX * OFFSET * offsetMult,
                    y: start.y + perpY * OFFSET * offsetMult
                };

                offsetEnd = {
                    x: end.x + perpX * OFFSET * offsetMult,
                    y: end.y + perpY * OFFSET * offsetMult
                };
            }

            // Simple orthogonal routing with 2 segments
            const path = [];
            path.push(offsetStart);

            // Determine routing direction based on relative positions
            const dx = offsetEnd.x - offsetStart.x;
            const dy = offsetEnd.y - offsetStart.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal first
                const midX = offsetStart.x + dx / 2;
                path.push({ x: midX, y: offsetStart.y });
                path.push({ x: midX, y: offsetEnd.y });
            } else {
                // Vertical first
                const midY = offsetStart.y + dy / 2;
                path.push({ x: offsetStart.x, y: midY });
                path.push({ x: offsetEnd.x, y: midY });
            }

            path.push(offsetEnd);

            // Optimize path by removing redundant points
            return this.optimizePath(path);
        },

        optimizePath(path) {
            if (path.length <= 2) return path;

            const optimized = [path[0]];

            for (let i = 1; i < path.length - 1; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const next = path[i + 1];

                // Check if this point is redundant (collinear)
                const dx1 = curr.x - prev.x;
                const dy1 = curr.y - prev.y;
                const dx2 = next.x - curr.x;
                const dy2 = next.y - curr.y;

                // If not collinear, keep the point
                if (Math.abs(dx1 * dy2 - dy1 * dx2) > 0.01) {
                    optimized.push(curr);
                }
            }

            optimized.push(path[path.length - 1]);
            return optimized;
        },

        getConnectionPoint(fromEnt, toEnt, role) {
            // Calculate center points
            const fromCenterX = fromEnt.x + fromEnt.width / 2;
            const fromCenterY = fromEnt.y + fromEnt.height / 2;
            const toCenterX = toEnt.x + toEnt.width / 2;
            const toCenterY = toEnt.y + toEnt.height / 2;

            // Calculate angle from center to center
            const dx = toCenterX - fromCenterX;
            const dy = toCenterY - fromCenterY;
            const angle = Math.atan2(dy, dx);

            // Account for participation/tier indicators
            const indicatorOffset = 13; // Space for indicators

            // Calculate adjusted bounds
            let left = fromEnt.x - indicatorOffset;
            let right = fromEnt.x + fromEnt.width;
            let top = fromEnt.y - indicatorOffset;
            let bottom = fromEnt.y + fromEnt.height;

            // For NCM, extend bottom
            if (fromEnt.enterpriseType === 'ncm') {
                bottom += fromEnt.height * 0.2;
            }

            // Determine which edge to connect to based on angle
            let x, y;

            if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
                // Connect to left or right edge
                if (dx > 0) {
                    // Right edge
                    x = right;
                    y = fromCenterY;
                } else {
                    // Left edge
                    x = left;
                    y = fromCenterY;
                }
            } else {
                // Connect to top or bottom edge
                if (dy > 0) {
                    // Bottom edge
                    x = fromCenterX;
                    y = bottom;
                } else {
                    // Top edge
                    x = fromCenterX;
                    y = top;
                }
            }

            return { x, y };
        },

        drawSegmentationMarkers(ctx, start, end, relationship) {
            if (!relationship) return;

            ctx.save();

            // Start marker
            if (relationship.startSegmentation !== 'individual') {
                const markerType = this.segmentationTypes.start[relationship.startSegmentation];
                if (markerType) {
                    this.drawMarker(ctx, start, markerType.marker, 'start', relationship.type);
                }
            }

            // End marker (arrow)
            const endMarkerType = this.segmentationTypes.end[relationship.endSegmentation];
            if (endMarkerType) {
                // Calculate arrow angle
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const angle = Math.atan2(dy, dx);

                this.drawMarker(ctx, end, endMarkerType.marker, 'end', relationship.type, angle);
            }

            ctx.restore();
        },

        drawMarker(ctx, point, markerType, position, relType, angle = 0) {
            const type = this.relationshipTypes[relType];
            const color = type ? type.color : '#34495e';

            ctx.save();
            ctx.translate(point.x, point.y);
            ctx.rotate(angle);

            switch (markerType) {
                case 'filledCircle':
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'hollowCircle':
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'filledArrow':
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(0, -6);
                    ctx.lineTo(0, 6);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'filledTriangle':
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(12, 0);
                    ctx.lineTo(0, -8);
                    ctx.lineTo(0, 8);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'hollowTriangle':
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.moveTo(12, 0);
                    ctx.lineTo(0, -8);
                    ctx.lineTo(0, 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        },

        drawRelationshipBadges(ctx, path, relationships) {
            if (!path || path.length < 2) return;

            // Find midpoint of path for badge placement
            const midIndex = Math.floor(path.length / 2);
            const midPoint = path.length % 2 === 0
                ? {
                    x: (path[midIndex - 1].x + path[midIndex].x) / 2,
                    y: (path[midIndex - 1].y + path[midIndex].y) / 2
                  }
                : path[midIndex];

            // Draw badges for each relationship
            const badgeSize = 24;
            const badgeSpacing = 28;
            const totalWidth = relationships.length * badgeSpacing - 4;
            let startX = midPoint.x - totalWidth / 2;

            ctx.save();
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            relationships.forEach((rel, index) => {
                const type = this.relationshipTypes[rel.type];
                if (!type) return;

                const badgeX = startX + index * badgeSpacing;
                const badgeY = midPoint.y;

                // Badge background
                ctx.fillStyle = 'white';
                ctx.strokeStyle = type.color;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Badge fill
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeSize / 2 - 3, 0, Math.PI * 2);
                ctx.fill();

                // Badge letter
                ctx.fillStyle = 'white';
                ctx.fillText(type.letter, badgeX, badgeY);
            });

            ctx.restore();
        },

        // Context menu for relationship deletion
        handleCanvasRightClick(x, y) {
            const hoveredRel = this.getRelationshipAt(x, y);

            if (hoveredRel) {
                this.showRelationshipContextMenu(x, y, hoveredRel);
                return true;
            }

            return false;
        },

        getRelationshipAt(x, y) {
            const relationships = CoopMaps.state.data.relationships || [];
            const enterprises = CoopMaps.state.data.enterprises || [];
            const tolerance = 10;

            for (const rel of relationships) {
                const startEnt = enterprises.find(e => e.id === rel.startEnterpriseId);
                const endEnt = enterprises.find(e => e.id === rel.endEnterpriseId);

                if (!startEnt || !endEnt) continue;

                const start = this.getConnectionPoint(startEnt, endEnt, 'start');
                const end = this.getConnectionPoint(endEnt, startEnt, 'end');

                // Check if point is near the line segment
                const distance = this.pointToLineDistance(x, y, start.x, start.y, end.x, end.y);

                if (distance < tolerance) {
                    return rel;
                }
            }

            return null;
        },

        pointToLineDistance(px, py, x1, y1, x2, y2) {
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) {
                param = dot / lenSq;
            }

            let xx, yy;

            if (param < 0) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }

            const dx = px - xx;
            const dy = py - yy;

            return Math.sqrt(dx * dx + dy * dy);
        },

        showRelationshipContextMenu(x, y, relationship) {
            // Remove existing context menu
            const existing = document.getElementById('relationshipContextMenu');
            if (existing) existing.remove();

            const menu = document.createElement('div');
            menu.id = 'relationshipContextMenu';
            menu.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                padding: 8px 0;
                min-width: 180px;
            `;

            const type = this.relationshipTypes[relationship.type];
            const enterprises = CoopMaps.state.data.enterprises || [];
            const startEnt = enterprises.find(e => e.id === relationship.startEnterpriseId);
            const endEnt = enterprises.find(e => e.id === relationship.endEnterpriseId);

            menu.innerHTML = `
                <div style="padding: 8px 16px; font-size: 12px; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">
                    ${type ? type.label : 'Relationship'}
                </div>
                <div style="padding: 4px 16px; font-size: 11px; color: #95a5a6;">
                    ${startEnt ? startEnt.name : 'Unknown'} → ${endEnt ? endEnt.name : 'Unknown'}
                </div>
                <button id="deleteRelBtn" style="
                    width: 100%;
                    padding: 10px 16px;
                    border: none;
                    background: white;
                    color: #e74c3c;
                    text-align: left;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#fee'" onmouseout="this.style.background='white'">
                    Delete Relationship
                </button>
            `;

            document.body.appendChild(menu);

            // Delete button
            document.getElementById('deleteRelBtn').addEventListener('click', () => {
                this.deleteRelationship(relationship.id);
                menu.remove();
            });

            // Close menu on click outside
            setTimeout(() => {
                const closeMenu = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };
                document.addEventListener('click', closeMenu);
            }, 0);
        },

        deleteRelationship(relationshipId) {
            const index = CoopMaps.state.data.relationships.findIndex(r => r.id === relationshipId);

            if (index !== -1) {
                CoopMaps.saveState();
                CoopMaps.state.data.relationships.splice(index, 1);

                CoopMaps.showNotification('Relationship deleted', 'success');

                document.dispatchEvent(new CustomEvent('diagram-changed'));

                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }
            }
        }
    });
})();
