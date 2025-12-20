/**
 * Co-opMaps - Enterprises Module
 * Handles enterprise symbol gallery and management
 */

(function() {
    'use strict';

    const enterprises = {
        init() {
            console.log('Enterprises module initialized');
        },

        renderSymbolGallery() {
            const shapes = window.CoopMaps.modules.shapes;
            if (!shapes) return '<div class="loading">Loading shapes...</div>';

            let html = `
                <div class="symbol-gallery">
                    <h3 style="margin-bottom: 20px; color: var(--dark); font-size: 18px;">
                        Enterprise Types
                    </h3>
                    <p style="margin-bottom: 20px; font-size: 13px; color: var(--gray);">
                        Drag and drop symbols onto the canvas to add enterprises to your map.
                    </p>
            `;

            // Create draggable cards for each enterprise type
            Object.keys(shapes.enterpriseTypes).forEach(typeKey => {
                const type = shapes.enterpriseTypes[typeKey];
                html += `
                    <div class="symbol-card" draggable="true" data-type="${typeKey}">
                        <div class="symbol-icon" style="background: ${type.color}; color: white; font-size: 36px; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                            ${type.icon}
                        </div>
                        <div class="symbol-label" style="font-weight: 600; color: var(--dark); margin-bottom: 6px;">
                            ${type.label}
                        </div>
                        <div class="symbol-description" style="font-size: 11px; color: var(--gray); line-height: 1.4;">
                            ${type.description}
                        </div>
                    </div>
                `;
            });

            html += '</div>';

            // Add CSS for symbol cards
            html += `
                <style>
                    .symbol-gallery {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .symbol-card {
                        padding: 20px;
                        background: white;
                        border: 2px solid var(--light-gray);
                        border-radius: 12px;
                        cursor: grab;
                        transition: var(--transition-fast);
                        text-align: center;
                    }

                    .symbol-card:hover {
                        border-color: var(--primary);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
                    }

                    .symbol-card:active {
                        cursor: grabbing;
                        transform: translateY(0);
                    }

                    .symbol-card.dragging {
                        opacity: 0.5;
                    }
                </style>
            `;

            return html;
        },

        bindDragEvents() {
            const cards = document.querySelectorAll('.symbol-card');
            cards.forEach(card => {
                card.addEventListener('dragstart', this.onDragStart.bind(this));
                card.addEventListener('dragend', this.onDragEnd.bind(this));
            });
        },

        onDragStart(e) {
            const type = e.target.dataset.type;
            e.dataTransfer.setData('enterpriseType', type);
            e.target.classList.add('dragging');
        },

        onDragEnd(e) {
            e.target.classList.remove('dragging');
        },

        addEnterpriseToCanvas(type, x, y) {
            const shapes = window.CoopMaps.modules.shapes;
            if (!shapes) return;

            const typeInfo = shapes.enterpriseTypes[type];
            if (!typeInfo) return;

            const enterprise = {
                id: window.CoopMaps.generateId(),
                type: type,
                name: typeInfo.label,
                x: x - 70, // Center on drop point
                y: y - 50,
                width: 140,
                height: 100,
                roles: [],
                tier: 'other',
                isGenericSet: false,
                fill: typeInfo.color,
                stroke: shapes.darkenColor(typeInfo.color, 20),
                shape: 'rectangle',
                showIcon: true,
                customProperties: {}
            };

            const state = window.CoopMaps.state.data;
            state.enterprises.push(enterprise);
            state.selectedItem = { type: 'enterprise', id: enterprise.id };

            window.CoopMaps.saveState();

            if (window.CoopMaps.modules.canvas) {
                window.CoopMaps.modules.canvas.render();
            }

            window.CoopMaps.updateSidebar();
            window.CoopMaps.showNotification(`${typeInfo.label} added to canvas`, 'success');
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('enterprises', enterprises);
    }
})();
