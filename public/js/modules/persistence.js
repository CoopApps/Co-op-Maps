/**
 * Co-opMaps - Persistence Module
 * Handles saving and loading diagrams from localStorage and cloud storage
 */

(function() {
    'use strict';

    const persistence = {
        STORAGE_KEY: 'coopmaps_diagrams',
        AUTOSAVE_KEY: 'coopmaps_autosave',
        AUTOSAVE_INTERVAL: 60000, // 1 minute
        autosaveTimer: null,

        init() {
            console.log('Persistence module initialized');
            this.startAutosave();
            this.loadAutosave();
        },

        render() {
            const diagrams = this.getLocalDiagrams();

            let html = `
                <div class="diagrams-panel">
                    <h3 style="margin-bottom: 20px; color: var(--dark); font-size: 18px;">
                        Saved Diagrams
                    </h3>

                    <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                        <button class="btn-primary" onclick="CoopMaps.modules.persistence.saveCurrentDiagram()" style="flex: 1;">
                            💾 Save Current
                        </button>
                        <button class="btn-primary" onclick="CoopMaps.modules.persistence.showLoadDialog()" style="flex: 1;">
                            📂 Load
                        </button>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: var(--dark); margin-bottom: 6px;">
                            Import Diagram
                        </label>
                        <input
                            type="file"
                            accept=".json"
                            onchange="CoopMaps.modules.persistence.importDiagram(this.files[0])"
                            style="width: 100%; padding: 10px; border: 2px solid var(--light-gray); border-radius: 8px; cursor: pointer;"
                        />
                        <p style="font-size: 12px; color: var(--gray); margin-top: 6px;">
                            Select a .json file to import a diagram
                        </p>
                    </div>

                    <h4 style="margin-bottom: 12px; color: var(--dark); font-size: 16px;">
                        Local Storage (${diagrams.length})
                    </h4>

                    <div class="diagrams-list">
            `;

            if (diagrams.length === 0) {
                html += `
                    <div style="padding: 40px; text-align: center; color: var(--gray); background: var(--light-gray); border-radius: 8px;">
                        <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;">📋</div>
                        <p>No saved diagrams yet</p>
                        <p style="font-size: 13px; margin-top: 8px;">Click "Save Current" to save your first diagram</p>
                    </div>
                `;
            } else {
                diagrams.forEach((diagram, index) => {
                    const date = new Date(diagram.savedAt).toLocaleString();
                    const enterprises = diagram.data.enterprises ? diagram.data.enterprises.length : 0;
                    const relationships = diagram.data.relationships ? diagram.data.relationships.length : 0;

                    html += `
                        <div class="diagram-card" style="padding: 16px; background: white; border: 2px solid var(--light-gray); border-radius: 12px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark); margin-bottom: 4px;">
                                        ${this.escapeHtml(diagram.title)}
                                    </div>
                                    <div style="font-size: 12px; color: var(--gray);">
                                        Saved: ${date}
                                    </div>
                                    <div style="font-size: 12px; color: var(--gray); margin-top: 4px;">
                                        ${enterprises} enterprises, ${relationships} relationships
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button
                                    onclick="CoopMaps.modules.persistence.loadDiagram(${index})"
                                    style="flex: 1; padding: 8px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                                    Load
                                </button>
                                <button
                                    onclick="CoopMaps.modules.persistence.deleteDiagram(${index})"
                                    style="padding: 8px 12px; background: var(--danger); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;

            return html;
        },

        bindEvents() {
            // Events are bound via onclick in HTML
        },

        getLocalDiagrams() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Error loading diagrams:', error);
                return [];
            }
        },

        saveLocalDiagram(diagram) {
            try {
                const diagrams = this.getLocalDiagrams();
                diagrams.push(diagram);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(diagrams));
                return true;
            } catch (error) {
                console.error('Error saving diagram:', error);
                return false;
            }
        },

        saveCurrentDiagram() {
            const state = window.CoopMaps.state.data;

            if (state.enterprises.length === 0 && state.relationships.length === 0) {
                window.CoopMaps.showNotification('Nothing to save - diagram is empty', 'error');
                return;
            }

            const title = prompt('Enter diagram name:', state.diagramMetadata.title || 'Untitled Diagram');
            if (!title) return;

            const diagram = {
                title: title,
                savedAt: new Date().toISOString(),
                data: {
                    metadata: state.diagramMetadata,
                    enterprises: state.enterprises,
                    relationships: state.relationships
                },
                version: window.CoopMaps.version
            };

            if (this.saveLocalDiagram(diagram)) {
                window.CoopMaps.showNotification('Diagram saved successfully', 'success');
                window.CoopMaps.updateSidebar();
            } else {
                window.CoopMaps.showNotification('Failed to save diagram', 'error');
            }
        },

        loadDiagram(index) {
            const diagrams = this.getLocalDiagrams();
            if (index < 0 || index >= diagrams.length) return;

            const diagram = diagrams[index];

            if (confirm(`Load "${diagram.title}"? Current work will be lost if not saved.`)) {
                const state = window.CoopMaps.state.data;
                state.diagramMetadata = diagram.data.metadata || state.diagramMetadata;
                state.enterprises = diagram.data.enterprises || [];
                state.relationships = diagram.data.relationships || [];
                state.selectedItem = null;

                window.CoopMaps.saveState();

                if (window.CoopMaps.modules.canvas) {
                    window.CoopMaps.modules.canvas.render();
                }

                window.CoopMaps.updateSidebar();
                window.CoopMaps.showNotification(`Loaded "${diagram.title}"`, 'success');
            }
        },

        deleteDiagram(index) {
            const diagrams = this.getLocalDiagrams();
            if (index < 0 || index >= diagrams.length) return;

            const diagram = diagrams[index];

            if (confirm(`Delete "${diagram.title}"? This cannot be undone.`)) {
                diagrams.splice(index, 1);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(diagrams));
                window.CoopMaps.showNotification('Diagram deleted', 'info');
                window.CoopMaps.updateSidebar();
            }
        },

        importDiagram(file) {
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate data
                    if (!data.version || !data.metadata || !data.enterprises) {
                        throw new Error('Invalid diagram file format');
                    }

                    if (confirm('Load this diagram? Current work will be lost if not saved.')) {
                        const state = window.CoopMaps.state.data;
                        state.diagramMetadata = data.metadata;
                        state.enterprises = data.enterprises || [];
                        state.relationships = data.relationships || [];
                        state.selectedItem = null;

                        window.CoopMaps.saveState();

                        if (window.CoopMaps.modules.canvas) {
                            window.CoopMaps.modules.canvas.render();
                        }

                        window.CoopMaps.updateSidebar();
                        window.CoopMaps.showNotification('Diagram imported successfully', 'success');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    window.CoopMaps.showNotification('Failed to import diagram - invalid file', 'error');
                }
            };

            reader.readAsText(file);
        },

        showLoadDialog() {
            const diagrams = this.getLocalDiagrams();

            if (diagrams.length === 0) {
                window.CoopMaps.showNotification('No saved diagrams', 'info');
                return;
            }

            // Switch to diagrams tab
            window.CoopMaps.state.ui.activeTab = 'diagrams';
            window.CoopMaps.updateSidebar();

            // Update tab selection
            document.querySelectorAll('.sidebar-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === 'diagrams') {
                    tab.classList.add('active');
                }
            });
        },

        // Autosave functionality
        startAutosave() {
            this.autosaveTimer = setInterval(() => {
                this.autosave();
            }, this.AUTOSAVE_INTERVAL);
        },

        autosave() {
            const state = window.CoopMaps.state.data;

            if (state.enterprises.length === 0 && state.relationships.length === 0) {
                return; // Don't autosave empty diagrams
            }

            try {
                const autosaveData = {
                    savedAt: new Date().toISOString(),
                    data: {
                        metadata: state.diagramMetadata,
                        enterprises: state.enterprises,
                        relationships: state.relationships
                    },
                    version: window.CoopMaps.version
                };

                localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(autosaveData));
                console.log('Autosaved at', autosaveData.savedAt);
            } catch (error) {
                console.error('Autosave failed:', error);
            }
        },

        loadAutosave() {
            try {
                const data = localStorage.getItem(this.AUTOSAVE_KEY);
                if (!data) return;

                const autosaveData = JSON.parse(data);
                const savedAt = new Date(autosaveData.savedAt);
                const now = new Date();
                const hoursSince = (now - savedAt) / (1000 * 60 * 60);

                // Only prompt if autosave is less than 24 hours old
                if (hoursSince < 24) {
                    const message = `Found autosaved work from ${savedAt.toLocaleString()}. Load it?`;
                    if (confirm(message)) {
                        const state = window.CoopMaps.state.data;
                        state.diagramMetadata = autosaveData.data.metadata;
                        state.enterprises = autosaveData.data.enterprises || [];
                        state.relationships = autosaveData.data.relationships || [];
                        state.selectedItem = null;

                        if (window.CoopMaps.modules.canvas) {
                            window.CoopMaps.modules.canvas.render();
                        }

                        window.CoopMaps.showNotification('Autosaved work restored', 'success');
                    }
                }
            } catch (error) {
                console.error('Error loading autosave:', error);
            }
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Register module
    if (window.CoopMaps) {
        window.CoopMaps.registerModule('persistence', persistence);
    }
})();
