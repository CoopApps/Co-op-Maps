/**
 * Co-opMaps - Symbol Key Module
 * Generates a symbol key/legend showing all enterprise types and relationships used in the diagram
 */

(function() {
    'use strict';

    const symbolKey = {
        init() {
            console.log('Symbol Key module initialized');
        },

        generateKey() {
            const state = window.CoopMaps.state.data;
            const shapes = window.CoopMaps.modules.shapes;

            if (!shapes) {
                window.CoopMaps.showNotification('Shapes module not loaded', 'error');
                return;
            }

            // Get unique enterprise types in use
            const typesInUse = new Set();
            state.enterprises.forEach(ent => typesInUse.add(ent.type));

            // Get unique relationship types in use
            const relTypesInUse = new Set();
            state.relationships.forEach(rel => relTypesInUse.add(rel.type));

            let html = `
                <div class="modal symbol-key-panel" id="symbolKeyModal" style="display: flex;">
                    <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                        <h2 style="margin-bottom: 20px;">Symbol Key</h2>
                        <p style="margin-bottom: 30px; color: var(--gray);">
                            Legend showing all enterprise types and relationships used in this diagram.
                        </p>

                        <h3 style="margin-bottom: 16px; color: var(--dark); font-size: 18px;">
                            Enterprise Types
                        </h3>

                        <div class="key-items" style="display: grid; gap: 12px; margin-bottom: 32px;">
            `;

            // Enterprise types
            typesInUse.forEach(typeKey => {
                const type = shapes.enterpriseTypes[typeKey];
                if (type) {
                    html += `
                        <div class="key-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px;">
                            <div style="background: ${type.color}; color: white; font-size: 32px; width: 60px; height: 60px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${type.icon}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--dark); margin-bottom: 4px;">
                                    ${type.label}
                                </div>
                                <div style="font-size: 13px; color: var(--gray);">
                                    ${type.description}
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            if (typesInUse.size === 0) {
                html += `
                    <div style="padding: 40px; text-align: center; color: var(--gray); background: var(--light-gray); border-radius: 8px;">
                        No enterprises in diagram yet
                    </div>
                `;
            }

            html += `
                        </div>

                        <h3 style="margin-bottom: 16px; color: var(--dark); font-size: 18px;">
                            Relationship Types
                        </h3>

                        <div class="key-items" style="display: grid; gap: 12px; margin-bottom: 32px;">
            `;

            // Relationship types
            relTypesInUse.forEach(typeKey => {
                const type = shapes.relationshipTypes[typeKey];
                if (type) {
                    html += `
                        <div class="key-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px;">
                            <svg width="80" height="40" style="flex-shrink: 0;">
                                <line x1="10" y1="20" x2="70" y2="20"
                                      stroke="${type.color}" stroke-width="3"
                                      stroke-dasharray="${type.style === 'dashed' ? '10,5' : (type.style === 'dotted' ? '3,3' : '')}"/>
                                <polygon points="70,20 62,16 62,24" fill="${type.color}"/>
                            </svg>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: ${type.color};">
                                    ${type.label}
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            if (relTypesInUse.size === 0) {
                html += `
                    <div style="padding: 40px; text-align: center; color: var(--gray); background: var(--light-gray); border-radius: 8px;">
                        No relationships in diagram yet
                    </div>
                `;
            }

            html += `
                        </div>

                        <h3 style="margin-bottom: 16px; color: var(--dark); font-size: 18px;">
                            Additional Notations
                        </h3>

                        <div class="key-items" style="display: grid; gap: 12px; margin-bottom: 24px;">
                            <div class="key-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px;">
                                <div style="width: 60px; height: 60px; background: var(--primary); border-radius: 8px; position: relative; flex-shrink: 0;">
                                    <div style="position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background: #f39c12; border-radius: 50%;"></div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark);">Primary Tier</div>
                                    <div style="font-size: 13px; color: var(--gray);">Indicated by orange dot</div>
                                </div>
                            </div>

                            <div class="key-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px;">
                                <div style="width: 60px; height: 60px; background: var(--secondary); border-radius: 8px; position: relative; flex-shrink: 0;">
                                    <div style="position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background: #95a5a6; border-radius: 50%;"></div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark);">Secondary Tier</div>
                                    <div style="font-size: 13px; color: var(--gray);">Indicated by gray dot</div>
                                </div>
                            </div>

                            <div class="key-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px;">
                                <div style="width: 70px; height: 70px; background: var(--info); border: 3px dashed #e74c3c; border-radius: 8px; flex-shrink: 0;"></div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark);">Generic Set</div>
                                    <div style="font-size: 13px; color: var(--gray);">Dashed red border indicates a set of similar enterprises</div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button
                                class="btn-secondary"
                                onclick="CoopMaps.modules.symbolKey.printKey()"
                                style="padding: 12px 24px; background: white; border: 2px solid var(--primary); color: var(--primary); border-radius: 8px; cursor: pointer; font-weight: 600;">
                                Print Key
                            </button>
                            <button
                                class="btn-primary"
                                onclick="document.getElementById('symbolKeyModal').remove()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
        },

        printKey() {
            window.print();
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('symbolKey', symbolKey);
    }
})();
