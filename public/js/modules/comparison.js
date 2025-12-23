/**
 * Co-op Maps - Comparison Module
 * Compare two diagrams side-by-side
 */

(function() {
    'use strict';

    CoopMaps.registerModule('comparison', {
        savedDiagrams: [],

        init() {
            console.log('Comparison module initialized');
            this.loadSavedDiagrams();
        },

        loadSavedDiagrams() {
            // Load from localStorage
            const saved = localStorage.getItem('coopmaps_diagrams');
            if (saved) {
                try {
                    this.savedDiagrams = JSON.parse(saved);
                } catch (e) {
                    this.savedDiagrams = [];
                }
            }
        },

        // Show comparison mode selection
        showComparisonDialog() {
            const isExpress = CoopMaps.isExpressMode;

            // Get available diagrams (current + saved)
            const diagrams = this.getAvailableDiagrams();

            // Remove existing panel
            const existing = document.getElementById('comparisonDialog');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'comparisonDialog';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '24px'};">
                        Compare Diagrams
                    </h2>
                    <button onclick="document.getElementById('comparisonDialog').remove(); document.getElementById('comparisonBackdrop').remove();" style="
                        background: none;
                        border: ${isExpress ? '1px solid #7f8c8d' : 'none'};
                        font-size: 24px;
                        cursor: pointer;
                        color: #7f8c8d;
                        padding: 5px 10px;
                    ">&times;</button>
                </div>

                <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px;">
                    Select two diagrams to compare side-by-side. Differences will be highlighted.
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div>
                        <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 10px;">
                            Left Diagram (Base)
                        </label>
                        <select id="compareLeft" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: ${isExpress ? '0' : '8px'};
                            font-size: 14px;
                            background: white;
                        ">
                            <option value="current">Current Diagram</option>
                            ${diagrams.map(d => `<option value="${d.id}">${d.title} (${d.date})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 10px;">
                            Right Diagram (Compare)
                        </label>
                        <select id="compareRight" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: ${isExpress ? '0' : '8px'};
                            font-size: 14px;
                            background: white;
                        ">
                            ${diagrams.length > 0
                                ? diagrams.map(d => `<option value="${d.id}">${d.title} (${d.date})</option>`).join('')
                                : '<option value="">No saved diagrams</option>'
                            }
                        </select>
                    </div>
                </div>

                ${diagrams.length === 0 ? `
                    <div style="
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        padding: 15px;
                        border-radius: ${isExpress ? '0' : '8px'};
                        margin-bottom: 20px;
                    ">
                        <strong style="color: #856404;">No saved diagrams found</strong>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #856404;">
                            Save your current diagram first using the Diagrams tab, or use Timeline snapshots to compare different versions.
                        </p>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="document.getElementById('comparisonDialog').remove(); document.getElementById('comparisonBackdrop').remove();" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#bdc3c7' : '#ecf0f1'};
                        color: #2c3e50;
                        border: ${isExpress ? '1px solid #7f8c8d' : 'none'};
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="CoopMaps.modules.comparison.startComparison()" ${diagrams.length === 0 ? 'disabled' : ''} style="
                        padding: 12px 24px;
                        background: ${diagrams.length === 0 ? '#bdc3c7' : (isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)')};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: ${diagrams.length === 0 ? 'not-allowed' : 'pointer'};
                    ">Compare</button>
                </div>
            `;

            panel.innerHTML = html;

            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.id = 'comparisonBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;
            backdrop.onclick = () => {
                backdrop.remove();
                panel.remove();
            };

            document.body.appendChild(backdrop);
            document.body.appendChild(panel);
        },

        getAvailableDiagrams() {
            const diagrams = [];

            // Get from persistence module if available
            if (CoopMaps.modules.persistence && CoopMaps.modules.persistence.savedDiagrams) {
                CoopMaps.modules.persistence.savedDiagrams.forEach(d => {
                    diagrams.push({
                        id: d.id,
                        title: d.title || 'Untitled',
                        date: new Date(d.savedAt || Date.now()).toLocaleDateString()
                    });
                });
            }

            // Get from timeline snapshots
            const timeline = CoopMaps.state.data.timeline || [];
            timeline.forEach((snapshot, i) => {
                diagrams.push({
                    id: `snapshot_${i}`,
                    title: snapshot.label || `Snapshot ${i + 1}`,
                    date: snapshot.date || 'Unknown'
                });
            });

            return diagrams;
        },

        startComparison() {
            const leftSelect = document.getElementById('compareLeft');
            const rightSelect = document.getElementById('compareRight');

            if (!leftSelect || !rightSelect) return;

            const leftId = leftSelect.value;
            const rightId = rightSelect.value;

            // Get diagram data
            const leftData = this.getDiagramData(leftId);
            const rightData = this.getDiagramData(rightId);

            if (!leftData || !rightData) {
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Could not load diagram data', 'error');
                } else {
                    alert('Could not load diagram data');
                }
                return;
            }

            // Close dialog
            document.getElementById('comparisonDialog')?.remove();
            document.getElementById('comparisonBackdrop')?.remove();

            // Show comparison view
            this.showComparisonView(leftData, rightData);
        },

        getDiagramData(id) {
            if (id === 'current') {
                return {
                    title: CoopMaps.state.data.diagramProperties?.title || 'Current Diagram',
                    enterprises: CoopMaps.state.data.enterprises || [],
                    relationships: CoopMaps.state.data.relationships || []
                };
            }

            // Check timeline snapshots
            if (id.startsWith('snapshot_')) {
                const index = parseInt(id.replace('snapshot_', ''));
                const timeline = CoopMaps.state.data.timeline || [];
                if (timeline[index]) {
                    return {
                        title: timeline[index].label || `Snapshot ${index + 1}`,
                        enterprises: timeline[index].data?.enterprises || [],
                        relationships: timeline[index].data?.relationships || []
                    };
                }
            }

            // Check persistence saved diagrams
            if (CoopMaps.modules.persistence && CoopMaps.modules.persistence.savedDiagrams) {
                const saved = CoopMaps.modules.persistence.savedDiagrams.find(d => d.id === id);
                if (saved) {
                    return {
                        title: saved.title || 'Saved Diagram',
                        enterprises: saved.enterprises || [],
                        relationships: saved.relationships || []
                    };
                }
            }

            return null;
        },

        showComparisonView(leftData, rightData) {
            const isExpress = CoopMaps.isExpressMode;

            // Calculate differences
            const diff = this.calculateDifferences(leftData, rightData);

            // Create full-screen comparison view
            const view = document.createElement('div');
            view.id = 'comparisonView';
            view.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #f5f5f5;
                z-index: 9999;
                display: flex;
                flex-direction: column;
            `;

            view.innerHTML = `
                <!-- Header -->
                <div style="
                    background: ${isExpress ? '#2c3e50' : 'linear-gradient(135deg, #2c3e50, #34495e)'};
                    color: white;
                    padding: 15px 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h2 style="margin: 0; font-size: 18px;">
                        Comparison: ${leftData.title} vs ${rightData.title}
                    </h2>
                    <button onclick="document.getElementById('comparisonView').remove()" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        padding: 8px 20px;
                        border-radius: ${isExpress ? '0' : '6px'};
                        cursor: pointer;
                        font-weight: 600;
                    ">Close Comparison</button>
                </div>

                <!-- Summary Bar -->
                <div style="
                    background: white;
                    padding: 15px 25px;
                    display: flex;
                    gap: 30px;
                    border-bottom: 1px solid #e0e0e0;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            width: 12px;
                            height: 12px;
                            background: #27ae60;
                            border-radius: 3px;
                        "></span>
                        <span style="font-size: 13px;"><strong>${diff.added.enterprises}</strong> enterprises added</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            width: 12px;
                            height: 12px;
                            background: #e74c3c;
                            border-radius: 3px;
                        "></span>
                        <span style="font-size: 13px;"><strong>${diff.removed.enterprises}</strong> enterprises removed</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            width: 12px;
                            height: 12px;
                            background: #3498db;
                            border-radius: 3px;
                        "></span>
                        <span style="font-size: 13px;"><strong>${diff.added.relationships}</strong> relationships added</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            width: 12px;
                            height: 12px;
                            background: #9b59b6;
                            border-radius: 3px;
                        "></span>
                        <span style="font-size: 13px;"><strong>${diff.removed.relationships}</strong> relationships removed</span>
                    </div>
                </div>

                <!-- Side by Side View -->
                <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden;">
                    <!-- Left Panel -->
                    <div style="
                        border-right: 2px solid #2c3e50;
                        padding: 20px;
                        overflow-y: auto;
                        background: white;
                    ">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">
                            ${leftData.title}
                            <span style="font-weight: normal; color: #7f8c8d; font-size: 13px; margin-left: 10px;">
                                (${leftData.enterprises.length} enterprises, ${leftData.relationships.length} relationships)
                            </span>
                        </h3>
                        ${this.renderEnterpriseList(leftData.enterprises, diff.removedEnterprises, 'removed')}
                    </div>

                    <!-- Right Panel -->
                    <div style="
                        padding: 20px;
                        overflow-y: auto;
                        background: white;
                    ">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">
                            ${rightData.title}
                            <span style="font-weight: normal; color: #7f8c8d; font-size: 13px; margin-left: 10px;">
                                (${rightData.enterprises.length} enterprises, ${rightData.relationships.length} relationships)
                            </span>
                        </h3>
                        ${this.renderEnterpriseList(rightData.enterprises, diff.addedEnterprises, 'added')}
                    </div>
                </div>
            `;

            document.body.appendChild(view);
        },

        calculateDifferences(leftData, rightData) {
            const leftEnterpriseIds = new Set(leftData.enterprises.map(e => e.id));
            const rightEnterpriseIds = new Set(rightData.enterprises.map(e => e.id));

            const leftRelIds = new Set(leftData.relationships.map(r => r.id));
            const rightRelIds = new Set(rightData.relationships.map(r => r.id));

            const addedEnterprises = rightData.enterprises.filter(e => !leftEnterpriseIds.has(e.id));
            const removedEnterprises = leftData.enterprises.filter(e => !rightEnterpriseIds.has(e.id));

            const addedRelationships = rightData.relationships.filter(r => !leftRelIds.has(r.id));
            const removedRelationships = leftData.relationships.filter(r => !rightRelIds.has(r.id));

            return {
                added: {
                    enterprises: addedEnterprises.length,
                    relationships: addedRelationships.length
                },
                removed: {
                    enterprises: removedEnterprises.length,
                    relationships: removedRelationships.length
                },
                addedEnterprises: new Set(addedEnterprises.map(e => e.id)),
                removedEnterprises: new Set(removedEnterprises.map(e => e.id))
            };
        },

        renderEnterpriseList(enterprises, highlightSet, highlightType) {
            if (enterprises.length === 0) {
                return '<p style="color: #95a5a6;">No enterprises</p>';
            }

            const typeColors = {
                cooperative: '#3498db',
                ncm: '#9b59b6',
                social: '#f1c40f',
                private: '#e74c3c',
                state: '#27ae60',
                excluded: '#95a5a6'
            };

            return enterprises.map(ent => {
                const isHighlighted = highlightSet.has(ent.id);
                const bgColor = isHighlighted
                    ? (highlightType === 'added' ? '#d4edda' : '#f8d7da')
                    : 'white';
                const borderColor = isHighlighted
                    ? (highlightType === 'added' ? '#27ae60' : '#e74c3c')
                    : '#ecf0f1';

                return `
                    <div style="
                        padding: 12px;
                        border: 2px solid ${borderColor};
                        border-radius: 8px;
                        margin-bottom: 10px;
                        background: ${bgColor};
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <div style="
                            width: 10px;
                            height: 10px;
                            border-radius: 50%;
                            background: ${typeColors[ent.type] || '#95a5a6'};
                        "></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50;">${ent.name || 'Unnamed'}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">${ent.type || 'unknown'}</div>
                        </div>
                        ${isHighlighted ? `
                            <span style="
                                background: ${highlightType === 'added' ? '#27ae60' : '#e74c3c'};
                                color: white;
                                padding: 4px 10px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 600;
                            ">${highlightType === 'added' ? 'NEW' : 'REMOVED'}</span>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
    });
})();
