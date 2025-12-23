/**
 * Co-op Maps - Layers Module
 * Filter visibility by relationship type and enterprise type
 */

(function() {
    'use strict';

    CoopMaps.registerModule('layers', {
        // Layer visibility state
        visibility: {
            relationships: {
                G: true, I: true, L: true, M: true, O: true, P: true, S: true, INNER: true
            },
            enterprises: {
                cooperative: true, ncm: true, social: true, private: true,
                state: true, excluded: true, partnership: true, public: true,
                charity: true, community: true
            }
        },

        init() {
            console.log('Layers module initialized');
            // Load saved visibility state
            this.loadState();
        },

        loadState() {
            try {
                const saved = localStorage.getItem('coopmaps_layers');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.visibility = { ...this.visibility, ...parsed };
                }
            } catch (e) {
                console.warn('Could not load layers state');
            }
        },

        saveState() {
            try {
                localStorage.setItem('coopmaps_layers', JSON.stringify(this.visibility));
            } catch (e) {
                console.warn('Could not save layers state');
            }
        },

        // Show layers panel
        showLayersPanel() {
            const existing = document.getElementById('layersModal');
            if (existing) existing.remove();

            const useAnimation = !CoopMaps.isExpressMode;

            const modal = document.createElement('div');
            modal.id = 'layersModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            const relationshipTypes = [
                { id: 'G', name: 'Governance', color: '#e74c3c' },
                { id: 'I', name: 'Investment', color: '#27ae60' },
                { id: 'L', name: 'Asset Lock', color: '#f39c12' },
                { id: 'M', name: 'Membership', color: '#9b59b6' },
                { id: 'O', name: 'Ownership', color: '#34495e' },
                { id: 'P', name: 'Partnership', color: '#3498db' },
                { id: 'S', name: 'Supply', color: '#16a085' },
                { id: 'INNER', name: 'Inner Segment', color: '#95a5a6' }
            ];

            const enterpriseTypes = [
                { id: 'cooperative', name: 'Co-operative', color: '#3498db' },
                { id: 'ncm', name: 'Non-co-op Mutual', color: '#9b59b6' },
                { id: 'social', name: 'Social Enterprise', color: '#f1c40f' },
                { id: 'private', name: 'Private', color: '#e74c3c' },
                { id: 'state', name: 'State', color: '#27ae60' },
                { id: 'excluded', name: 'Excluded', color: '#95a5a6' },
                { id: 'partnership', name: 'Partnership', color: '#1abc9c' },
                { id: 'public', name: 'Public Listed', color: '#e67e22' },
                { id: 'charity', name: 'Charity', color: '#8e44ad' },
                { id: 'community', name: 'Community Org', color: '#16a085' }
            ];

            const relationshipChecks = relationshipTypes.map(r => `
                <label style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    cursor: pointer;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox"
                        ${this.visibility.relationships[r.id] ? 'checked' : ''}
                        onchange="CoopMaps.modules.layers.toggleRelationship('${r.id}')"
                        style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="
                        width: 20px;
                        height: 4px;
                        background: ${r.color};
                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 2px;'}
                    "></span>
                    <span style="color: #2c3e50;">${r.name}</span>
                </label>
            `).join('');

            const enterpriseChecks = enterpriseTypes.map(e => `
                <label style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    cursor: pointer;
                    ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox"
                        ${this.visibility.enterprises[e.id] ? 'checked' : ''}
                        onchange="CoopMaps.modules.layers.toggleEnterprise('${e.id}')"
                        style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="
                        width: 16px;
                        height: 16px;
                        background: ${e.color};
                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                    "></span>
                    <span style="color: #2c3e50;">${e.name}</span>
                </label>
            `).join('');

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                            </svg>
                            Layers
                        </h2>
                        <button onclick="CoopMaps.modules.layers.closePanel()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Relationships Column -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h3 style="margin: 0; color: #2c3e50; font-size: 14px;">Relationships</h3>
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="CoopMaps.modules.layers.showAllRelationships()" style="
                                        padding: 4px 8px;
                                        background: #27ae60;
                                        color: white;
                                        border: none;
                                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">All</button>
                                    <button onclick="CoopMaps.modules.layers.hideAllRelationships()" style="
                                        padding: 4px 8px;
                                        background: #e74c3c;
                                        color: white;
                                        border: none;
                                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">None</button>
                                </div>
                            </div>
                            <div style="background: #f8f9fa; ${CoopMaps.isExpressMode ? 'border: 1px solid #bdc3c7;' : 'border-radius: 8px;'} padding: 10px;">
                                ${relationshipChecks}
                            </div>
                        </div>

                        <!-- Enterprises Column -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h3 style="margin: 0; color: #2c3e50; font-size: 14px;">Enterprises</h3>
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="CoopMaps.modules.layers.showAllEnterprises()" style="
                                        padding: 4px 8px;
                                        background: #27ae60;
                                        color: white;
                                        border: none;
                                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">All</button>
                                    <button onclick="CoopMaps.modules.layers.hideAllEnterprises()" style="
                                        padding: 4px 8px;
                                        background: #e74c3c;
                                        color: white;
                                        border: none;
                                        ${CoopMaps.isExpressMode ? '' : 'border-radius: 4px;'}
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">None</button>
                                </div>
                            </div>
                            <div style="background: #f8f9fa; ${CoopMaps.isExpressMode ? 'border: 1px solid #bdc3c7;' : 'border-radius: 8px;'} padding: 10px;">
                                ${enterpriseChecks}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 14px;">Quick Filters</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <button onclick="CoopMaps.modules.layers.showOnlyGovernance()" style="
                                padding: 8px 12px;
                                background: ${CoopMaps.isExpressMode ? '#e74c3c' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'};
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                                cursor: pointer;
                                font-size: 12px;
                            ">Governance Only</button>
                            <button onclick="CoopMaps.modules.layers.showOnlySupply()" style="
                                padding: 8px 12px;
                                background: ${CoopMaps.isExpressMode ? '#16a085' : 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)'};
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                                cursor: pointer;
                                font-size: 12px;
                            ">Supply Chain Only</button>
                            <button onclick="CoopMaps.modules.layers.showOnlyCoops()" style="
                                padding: 8px 12px;
                                background: ${CoopMaps.isExpressMode ? '#3498db' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'};
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                                cursor: pointer;
                                font-size: 12px;
                            ">Co-ops Only</button>
                            <button onclick="CoopMaps.modules.layers.resetLayers()" style="
                                padding: 8px 12px;
                                background: ${CoopMaps.isExpressMode ? '#2c3e50' : 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'};
                                color: white;
                                border: none;
                                ${CoopMaps.isExpressMode ? '' : 'border-radius: 6px;'}
                                cursor: pointer;
                                font-size: 12px;
                            ">Show All</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closePanel();
            });
        },

        closePanel() {
            const modal = document.getElementById('layersModal');
            if (modal) modal.remove();
        },

        toggleRelationship(type) {
            this.visibility.relationships[type] = !this.visibility.relationships[type];
            this.saveState();
            this.applyFilters();
        },

        toggleEnterprise(type) {
            this.visibility.enterprises[type] = !this.visibility.enterprises[type];
            this.saveState();
            this.applyFilters();
        },

        showAllRelationships() {
            Object.keys(this.visibility.relationships).forEach(k => {
                this.visibility.relationships[k] = true;
            });
            this.saveState();
            this.applyFilters();
            this.showLayersPanel(); // Refresh
        },

        hideAllRelationships() {
            Object.keys(this.visibility.relationships).forEach(k => {
                this.visibility.relationships[k] = false;
            });
            this.saveState();
            this.applyFilters();
            this.showLayersPanel(); // Refresh
        },

        showAllEnterprises() {
            Object.keys(this.visibility.enterprises).forEach(k => {
                this.visibility.enterprises[k] = true;
            });
            this.saveState();
            this.applyFilters();
            this.showLayersPanel(); // Refresh
        },

        hideAllEnterprises() {
            Object.keys(this.visibility.enterprises).forEach(k => {
                this.visibility.enterprises[k] = false;
            });
            this.saveState();
            this.applyFilters();
            this.showLayersPanel(); // Refresh
        },

        // Quick filters
        showOnlyGovernance() {
            Object.keys(this.visibility.relationships).forEach(k => {
                this.visibility.relationships[k] = (k === 'G');
            });
            this.saveState();
            this.applyFilters();
            this.closePanel();
            if (CoopMaps.showNotification) {
                CoopMaps.showNotification('Showing Governance relationships only', 'info');
            }
        },

        showOnlySupply() {
            Object.keys(this.visibility.relationships).forEach(k => {
                this.visibility.relationships[k] = (k === 'S');
            });
            this.saveState();
            this.applyFilters();
            this.closePanel();
            if (CoopMaps.showNotification) {
                CoopMaps.showNotification('Showing Supply relationships only', 'info');
            }
        },

        showOnlyCoops() {
            Object.keys(this.visibility.enterprises).forEach(k => {
                this.visibility.enterprises[k] = (k === 'cooperative');
            });
            this.saveState();
            this.applyFilters();
            this.closePanel();
            if (CoopMaps.showNotification) {
                CoopMaps.showNotification('Showing Co-operatives only', 'info');
            }
        },

        resetLayers() {
            Object.keys(this.visibility.relationships).forEach(k => {
                this.visibility.relationships[k] = true;
            });
            Object.keys(this.visibility.enterprises).forEach(k => {
                this.visibility.enterprises[k] = true;
            });
            this.saveState();
            this.applyFilters();
            this.closePanel();
            if (CoopMaps.showNotification) {
                CoopMaps.showNotification('All layers visible', 'info');
            }
        },

        applyFilters() {
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }
        },

        // Check if a relationship should be visible
        isRelationshipVisible(type) {
            return this.visibility.relationships[type] !== false;
        },

        // Check if an enterprise should be visible based on its type
        isEnterpriseVisible(type) {
            return this.visibility.enterprises[type] !== false;
        },

        // Get count of visible/hidden items
        getStats() {
            const relVisible = Object.values(this.visibility.relationships).filter(v => v).length;
            const relTotal = Object.keys(this.visibility.relationships).length;
            const entVisible = Object.values(this.visibility.enterprises).filter(v => v).length;
            const entTotal = Object.keys(this.visibility.enterprises).length;

            return {
                relationships: { visible: relVisible, total: relTotal },
                enterprises: { visible: entVisible, total: entTotal }
            };
        }
    });
})();
