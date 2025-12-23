/**
 * Co-op Maps - Persistence Module
 * Handles saving and loading diagrams from localStorage with enhanced features
 */

(function() {
    'use strict';

    CoopMaps.registerModule('persistence', {
        currentDiagramId: null,
        isDirty: false,
        autoSaveInterval: null,
        lastSaveTime: null,

        init() {
            console.log('Persistence module initialized');
            this.bindEvents();
            this.setupAutoSave();
            this.checkForSavedDiagrams();
        },

        bindEvents() {
            // Listen for diagram changes
            document.addEventListener('diagram-changed', () => {
                this.isDirty = true;
                this.updateSaveIndicator();
            });

            // Save on Ctrl+S
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentDiagram();
                }
            });

            // Warn before leaving with unsaved changes
            window.addEventListener('beforeunload', (e) => {
                if (this.isDirty) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        },

        setupAutoSave() {
            // Auto-save every 30 seconds if there are changes
            this.autoSaveInterval = setInterval(() => {
                if (this.isDirty && this.currentDiagramId) {
                    this.saveCurrentDiagram();
                }
            }, 30000);
        },

        checkForSavedDiagrams() {
            const diagrams = this.getAllDiagrams();
            if (Object.keys(diagrams).length > 0) {
                console.log(`Found ${Object.keys(diagrams).length} saved diagrams`);
            }
        },

        getAllDiagrams() {
            try {
                const saved = localStorage.getItem('coopmaps_diagrams');
                return saved ? JSON.parse(saved) : {};
            } catch (e) {
                console.error('Error loading diagrams:', e);
                return {};
            }
        },

        saveDiagrams(diagrams) {
            try {
                localStorage.setItem('coopmaps_diagrams', JSON.stringify(diagrams));
                return true;
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    alert('Storage quota exceeded. Please delete some diagrams to make space.');
                } else {
                    alert('Failed to save diagram. Please try again.');
                }
                return false;
            }
        },

        saveCurrentDiagram() {
            if (!this.currentDiagramId) {
                this.saveAsNewDiagram();
                return;
            }

            const diagrams = this.getAllDiagrams();
            const thumbnail = this.generateThumbnail();

            diagrams[this.currentDiagramId] = {
                name: CoopMaps.state.data.diagramProperties.title || 'Untitled Diagram',
                lastModified: new Date().toISOString(),
                enterpriseCount: CoopMaps.state.data.enterprises.length,
                relationshipCount: CoopMaps.state.data.relationships.length,
                thumbnail: thumbnail,
                data: {
                    enterprises: CoopMaps.state.data.enterprises,
                    relationships: CoopMaps.state.data.relationships,
                    metadata: CoopMaps.state.data.diagramProperties,
                    // Save UI preferences including connector style
                    uiPreferences: {
                        connectorStyle: CoopMaps.state.ui.connectorStyle || 'orthogonal',
                        zoom: CoopMaps.state.ui.zoom,
                        canvasSize: CoopMaps.state.ui.canvasSize
                    }
                }
            };

            if (this.saveDiagrams(diagrams)) {
                this.lastSaveTime = new Date().toISOString();
                this.isDirty = false;
                this.updateSaveIndicator();
                this.showSaveAnimation();

                if (CoopMaps.state.ui.activeTab === 'diagrams') {
                    CoopMaps.updateSidebar();
                }
            }
        },

        saveAsNewDiagram() {
            const name = prompt('Enter a name for this diagram:',
                CoopMaps.state.data.diagramProperties.title || 'My Diagram');

            if (!name) return;

            const diagrams = this.getAllDiagrams();
            const id = 'diagram_' + Date.now();
            const thumbnail = this.generateThumbnail();

            diagrams[id] = {
                name: name,
                lastModified: new Date().toISOString(),
                enterpriseCount: CoopMaps.state.data.enterprises.length,
                relationshipCount: CoopMaps.state.data.relationships.length,
                thumbnail: thumbnail,
                data: {
                    enterprises: CoopMaps.state.data.enterprises,
                    relationships: CoopMaps.state.data.relationships,
                    metadata: {
                        ...CoopMaps.state.data.diagramProperties,
                        title: name
                    },
                    // Save UI preferences
                    uiPreferences: {
                        connectorStyle: CoopMaps.state.ui.connectorStyle || 'orthogonal',
                        zoom: CoopMaps.state.ui.zoom,
                        canvasSize: CoopMaps.state.ui.canvasSize
                    }
                }
            };

            if (this.saveDiagrams(diagrams)) {
                this.currentDiagramId = id;
                CoopMaps.state.data.diagramProperties.title = name;
                this.lastSaveTime = new Date().toISOString();
                this.isDirty = false;
                this.updateSaveIndicator();
                this.showSaveAnimation();

                if (CoopMaps.state.ui.activeTab === 'diagrams') {
                    CoopMaps.updateSidebar();
                }
            }
        },

        loadDiagram(id) {
            const diagrams = this.getAllDiagrams();
            const diagram = diagrams[id];

            if (!diagram) {
                alert('Diagram not found');
                return;
            }

            if (this.isDirty) {
                if (!confirm('You have unsaved changes. Save before loading new diagram?')) {
                    this.saveCurrentDiagram();
                }
            }

            // Load diagram data
            CoopMaps.state.data.enterprises = diagram.data.enterprises || [];
            CoopMaps.state.data.relationships = diagram.data.relationships || [];
            CoopMaps.state.data.diagramProperties = diagram.data.metadata || {
                title: diagram.name,
                author: '',
                date: new Date().toISOString().split('T')[0],
                wdr: '',
                scope: { geographic: 'local', economic: '', userDefined: '' },
                period: 'present'
            };

            // Load UI preferences
            if (diagram.data.uiPreferences) {
                // Restore connector style
                CoopMaps.state.ui.connectorStyle = diagram.data.uiPreferences.connectorStyle || 'orthogonal';

                // Update connector style button
                const btn = document.getElementById('connectorStyleBtn');
                const textSpan = document.getElementById('connectorStyleText');
                const pathElement = document.getElementById('connectorStylePath');

                if (btn && textSpan && pathElement) {
                    if (CoopMaps.state.ui.connectorStyle === 'direct') {
                        textSpan.textContent = 'Direct';
                        pathElement.setAttribute('d', 'M3 3 L17 10');
                        btn.title = 'Toggle Connector Style (Currently: Direct)';
                    } else {
                        textSpan.textContent = 'Orthogonal';
                        pathElement.setAttribute('d', 'M3 3 L10 3 L10 10 L17 10');
                        btn.title = 'Toggle Connector Style (Currently: Orthogonal)';
                    }
                }

                // Restore zoom if saved
                if (diagram.data.uiPreferences.zoom) {
                    CoopMaps.state.ui.zoom = diagram.data.uiPreferences.zoom;
                }

                // Restore canvas size if saved
                if (diagram.data.uiPreferences.canvasSize && CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.setCanvasSize(diagram.data.uiPreferences.canvasSize);
                }
            }

            this.currentDiagramId = id;
            this.lastSaveTime = diagram.lastModified;
            this.isDirty = false;
            CoopMaps.state.data.selectedItem = null;

            // Re-render
            if (CoopMaps.modules.canvas) {
                CoopMaps.modules.canvas.render();
            }

            CoopMaps.updateSidebar();
            this.updateSaveIndicator();
            this.showLoadAnimation(diagram.name);
        },

        deleteDiagram(id) {
            if (!confirm('Are you sure you want to delete this diagram? This cannot be undone.')) {
                return;
            }

            const diagrams = this.getAllDiagrams();
            delete diagrams[id];

            if (this.saveDiagrams(diagrams)) {
                if (this.currentDiagramId === id) {
                    this.currentDiagramId = null;
                    this.isDirty = true;
                }

                if (CoopMaps.state.ui.activeTab === 'diagrams') {
                    CoopMaps.updateSidebar();
                }

                this.showDeleteAnimation();
            }
        },

        duplicateDiagram(id) {
            const diagrams = this.getAllDiagrams();
            const original = diagrams[id];

            if (!original) return;

            const newName = prompt('Enter name for the duplicate:', original.name + ' (Copy)');
            if (!newName) return;

            const newId = 'diagram_' + Date.now();
            const newDiagram = JSON.parse(JSON.stringify(original));
            newDiagram.name = newName;
            newDiagram.lastModified = new Date().toISOString();
            if (newDiagram.data.metadata) {
                newDiagram.data.metadata.title = newName;
            }

            diagrams[newId] = newDiagram;

            if (this.saveDiagrams(diagrams)) {
                if (CoopMaps.state.ui.activeTab === 'diagrams') {
                    CoopMaps.updateSidebar();
                }
                this.showDuplicateAnimation();
            }
        },

        exportToFile(id) {
            const diagrams = this.getAllDiagrams();
            const diagram = diagrams[id];

            if (!diagram) return;

            const exportData = {
                version: CoopMaps.version,
                exported: new Date().toISOString(),
                diagram: diagram
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)],
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${diagram.name.replace(/[^a-z0-9]/gi, '_')}_coopmaps.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        },

        importFromFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);

                        if (!data.diagram) {
                            throw new Error('Invalid file format');
                        }

                        const diagrams = this.getAllDiagrams();
                        const id = 'diagram_' + Date.now();

                        diagrams[id] = {
                            ...data.diagram,
                            lastModified: new Date().toISOString()
                        };

                        if (this.saveDiagrams(diagrams)) {
                            if (confirm('Import successful! Load the imported diagram now?')) {
                                this.loadDiagram(id);
                            } else if (CoopMaps.state.ui.activeTab === 'diagrams') {
                                CoopMaps.updateSidebar();
                            }
                        }
                    } catch (error) {
                        alert('Failed to import file: ' + error.message);
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        },

        generateThumbnail() {
            const canvas = document.getElementById('canvas');
            if (!canvas) return null;

            try {
                // Create a smaller canvas for thumbnail
                const thumbCanvas = document.createElement('canvas');
                const thumbCtx = thumbCanvas.getContext('2d');
                const scale = 0.1;

                thumbCanvas.width = canvas.width * scale;
                thumbCanvas.height = canvas.height * scale;

                thumbCtx.scale(scale, scale);
                thumbCtx.drawImage(canvas, 0, 0);

                return thumbCanvas.toDataURL('image/png');
            } catch (e) {
                console.error('Error generating thumbnail:', e);
                return null;
            }
        },

        updateSaveIndicator() {
            // This could update a UI element showing save status
            console.log('Save status:', this.isDirty ? 'Unsaved changes' : 'All changes saved');
        },

        showSaveAnimation() {
            // Skip fancy animation in Express mode
            if (CoopMaps.isExpressMode) {
                // Just log to console in Express mode
                console.log('Saved');
                return;
            }

            const animation = document.createElement('div');
            animation.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 30px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 16px rgba(46, 204, 113, 0.3);
                z-index: 3000;
                animation: slideInRight 0.5s ease;
            `;
            animation.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align: middle; margin-right: 6px;"><polyline points="20 6 9 17 4 12"/></svg>Saved';
            document.body.appendChild(animation);

            setTimeout(() => animation.remove(), 2000);
        },

        showLoadAnimation(name) {
            // Skip fancy animation in Express mode
            if (CoopMaps.isExpressMode) {
                alert(`Loaded "${name}"`);
                return;
            }

            const animation = document.createElement('div');
            animation.style.cssText = `
                position: fixed;
                top: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 30px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3);
                z-index: 3000;
                animation: slideDown 0.5s ease;
            `;
            animation.innerHTML = `Loaded "${name}"`;
            document.body.appendChild(animation);

            setTimeout(() => animation.remove(), 2000);
        },

        showDeleteAnimation() {
            CoopMaps.showNotification('Diagram deleted', 'info');
        },

        showDuplicateAnimation() {
            CoopMaps.showNotification('Diagram duplicated', 'success');
        },

        getStorageUsage() {
            try {
                const data = localStorage.getItem('coopmaps_diagrams') || '{}';
                const bytes = new Blob([data]).size;
                const kb = (bytes / 1024).toFixed(2);
                const mb = (bytes / 1048576).toFixed(2);

                return {
                    bytes: bytes,
                    kb: kb,
                    mb: mb,
                    percentage: Math.min((bytes / 5242880) * 100, 100) // 5MB estimate
                };
            } catch (e) {
                return { bytes: 0, kb: 0, mb: 0, percentage: 0 };
            }
        },

        getTimeSinceLastSave() {
            if (!this.lastSaveTime) return 'Never saved';

            const now = new Date();
            const saved = new Date(this.lastSaveTime);
            const diff = Math.floor((now - saved) / 1000);

            if (diff < 60) return 'Saved just now';
            if (diff < 3600) return `Saved ${Math.floor(diff / 60)} min ago`;
            if (diff < 86400) return `Saved ${Math.floor(diff / 3600)} hours ago`;
            return `Saved ${Math.floor(diff / 86400)} days ago`;
        },

        getCurrentDiagramInfo() {
            return {
                id: this.currentDiagramId,
                name: CoopMaps.state.data.diagramProperties.title || 'Untitled Diagram',
                enterpriseCount: CoopMaps.state.data.enterprises.length,
                relationshipCount: CoopMaps.state.data.relationships.length
            };
        },

        render() {
            const diagrams = this.getAllDiagrams();
            const currentDiagram = this.getCurrentDiagramInfo();
            const storage = this.getStorageUsage();

            return `
                <div style="padding: 25px;">
                    <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px;">
                        Saved Diagrams
                    </h3>

                    ${currentDiagram.id ? `
                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 25px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e9ecef;
                    ">
                        <h4 style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 14px;">
                            Currently Editing
                        </h4>
                        <div style="font-size: 18px; color: #2c3e50; font-weight: 600; margin-bottom: 12px;">
                            ${currentDiagram.name}
                        </div>
                        <div style="display: flex; gap: 20px; font-size: 13px; color: #95a5a6;">
                            <span>${currentDiagram.enterpriseCount} enterprises</span>
                            <span>${currentDiagram.relationshipCount} relationships</span>
                            <span>${this.getTimeSinceLastSave()}</span>
                        </div>
                    </div>
                    ` : ''}

                    <div class="action-buttons" style="
                        display: flex;
                        gap: 12px;
                        margin-bottom: 25px;
                    ">
                        <button onclick="CoopMaps.modules.persistence.saveAsNewDiagram()" style="
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        ">Save As New</button>

                        <button onclick="CoopMaps.modules.persistence.importFromFile()" style="
                            padding: 10px 20px;
                            background: white;
                            color: #3498db;
                            border: 2px solid #3498db;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        ">Import from File</button>
                    </div>

                    <div class="saved-diagrams">
                        ${Object.keys(diagrams).length === 0 ? `
                            <div style="
                                text-align: center;
                                padding: 40px;
                                color: #95a5a6;
                            ">
                                <p style="font-size: 16px;">No saved diagrams yet</p>
                                <p style="font-size: 14px;">Your diagrams will appear here</p>
                            </div>
                        ` : Object.entries(diagrams).map(([id, diagram]) => `
                            <div class="diagram-item" style="
                                background: white;
                                padding: 20px;
                                border-radius: 12px;
                                margin-bottom: 16px;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                                border: 1px solid #e9ecef;
                                transition: all 0.3s ease;
                                position: relative;
                            ">
                                ${id === currentDiagram.id ? `
                                <div style="
                                    position: absolute;
                                    top: 0;
                                    right: 0;
                                    background: #2196f3;
                                    color: white;
                                    padding: 4px 12px;
                                    font-size: 11px;
                                    font-weight: 600;
                                    border-bottom-left-radius: 8px;
                                ">ACTIVE</div>
                                ` : ''}

                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <div style="font-weight: 600; color: #2c3e50; font-size: 16px; margin-bottom: 4px;">
                                            ${diagram.name}
                                        </div>
                                        <div style="font-size: 13px; color: #7f8c8d;">
                                            ${new Date(diagram.lastModified).toLocaleDateString()}
                                        </div>
                                        <div style="font-size: 13px; color: #95a5a6; margin-top: 8px;">
                                            ${diagram.enterpriseCount} enterprises,
                                            ${diagram.relationshipCount} relationships
                                        </div>
                                    </div>
                                    ${diagram.thumbnail ? `
                                    <div style="
                                        width: 60px;
                                        height: 40px;
                                        background: url('${diagram.thumbnail}') center/cover;
                                        border-radius: 6px;
                                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                    "></div>
                                    ` : ''}
                                </div>

                                <div style="display: flex; gap: 8px; margin-top: 16px;">
                                    ${id !== currentDiagram.id ? `
                                    <button onclick="CoopMaps.modules.persistence.loadDiagram('${id}')" style="
                                        padding: 6px 16px;
                                        background: #3498db;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-size: 13px;
                                        font-weight: 500;
                                    ">Load</button>
                                    ` : ''}

                                    <button onclick="CoopMaps.modules.persistence.duplicateDiagram('${id}')" style="
                                        padding: 6px 16px;
                                        background: white;
                                        color: #2ecc71;
                                        border: 1px solid #2ecc71;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-size: 13px;
                                        font-weight: 500;
                                    ">Duplicate</button>

                                    <button onclick="CoopMaps.modules.persistence.exportToFile('${id}')" style="
                                        padding: 6px 16px;
                                        background: white;
                                        color: #9b59b6;
                                        border: 1px solid #9b59b6;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-size: 13px;
                                        font-weight: 500;
                                    ">Export</button>

                                    <button onclick="CoopMaps.modules.persistence.deleteDiagram('${id}')" style="
                                        padding: 6px 16px;
                                        background: white;
                                        color: #e74c3c;
                                        border: 1px solid #e74c3c;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-size: 13px;
                                        font-weight: 500;
                                        margin-left: auto;
                                    ">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="
                        margin-top: 30px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 12px;
                    ">
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #7f8c8d;">
                            Storage Usage
                        </h4>
                        <div style="
                            background: #e9ecef;
                            height: 8px;
                            border-radius: 4px;
                            overflow: hidden;
                            margin-bottom: 8px;
                        ">
                            <div style="
                                background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
                                height: 100%;
                                width: ${storage.percentage}%;
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                        <div style="font-size: 13px; color: #95a5a6;">
                            ${storage.kb} KB used (${storage.percentage.toFixed(1)}% of estimated 5MB limit)
                        </div>
                    </div>
                </div>
            `;
        }
    });
})();
