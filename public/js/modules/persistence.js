/**
 * Co-op Maps - Persistence Module
 * Handles saving and loading diagrams from localStorage with enhanced features
 */

(function() {
    'use strict';

    CoopMaps.registerModule('persistence', {
        currentDiagramId: null,  // Local ID for localStorage
        currentCloudId: null,    // Database UUID for cloud saves
        isDirty: false,
        autoSaveInterval: null,
        lastSaveTime: null,
        userPassword: null,      // Cached password for cloud operations

        init() {
            console.log('Persistence module initialized');
            this.bindEvents();
            this.setupAutoSave();
            this.checkForSavedDiagrams();
        },

        // Get API URL
        getApiUrl() {
            // Use CoopMapsConfig.API_BASE_URL but strip /api since it's included in fetch calls
            if (window.CoopMapsConfig?.API_BASE_URL) {
                // API_BASE_URL ends with /api, so return origin only
                return window.CoopMapsConfig.API_BASE_URL.replace(/\/api$/, '');
            }
            return window.CONFIG?.API_URL || '';
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

        getStorageInfo() {
            try {
                const currentData = localStorage.getItem('coopmaps_diagrams') || '{}';
                const currentSize = new Blob([currentData]).size;
                const estimatedLimit = 5 * 1024 * 1024; // 5MB
                const usagePercent = ((currentSize / estimatedLimit) * 100).toFixed(1);

                return {
                    currentSize: currentSize,
                    currentSizeMB: (currentSize / 1024 / 1024).toFixed(2),
                    estimatedLimit: estimatedLimit,
                    usagePercent: usagePercent,
                    remaining: estimatedLimit - currentSize,
                    remainingMB: ((estimatedLimit - currentSize) / 1024 / 1024).toFixed(2)
                };
            } catch (e) {
                console.error('Error getting storage info:', e);
                return null;
            }
        },

        saveDiagrams(diagrams) {
            try {
                const dataString = JSON.stringify(diagrams);
                const size = new Blob([dataString]).size;
                const estimatedLimit = 5 * 1024 * 1024; // 5MB

                // Warn if approaching limit (80%)
                if (size > estimatedLimit * 0.8) {
                    const sizeMB = (size / 1024 / 1024).toFixed(2);
                    const usagePercent = ((size / estimatedLimit) * 100).toFixed(1);

                    if (!confirm(`WARNING: You are using ${usagePercent}% (${sizeMB} MB) of your browser storage.\n\nConsider:\n• Deleting old diagrams\n• Exporting diagrams to JSON files\n• Reducing timeline snapshots\n\nContinue saving?`)) {
                        return false;
                    }
                }

                localStorage.setItem('coopmaps_diagrams', dataString);
                return true;
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    const storageInfo = this.getStorageInfo();
                    let message = 'Storage quota exceeded! Your diagrams cannot be saved.\n\n';

                    if (storageInfo) {
                        message += `Current usage: ${storageInfo.currentSizeMB} MB\n`;
                        message += `Estimated limit: ${(storageInfo.estimatedLimit / 1024 / 1024).toFixed(0)} MB\n\n`;
                    }

                    message += 'To free up space:\n';
                    message += '• Delete old diagrams you no longer need\n';
                    message += '• Export diagrams to JSON files and delete local copies\n';
                    message += '• Delete timeline snapshots you don\'t need\n';
                    message += '• Clear browser cache and try again';

                    alert(message);
                } else {
                    alert('Failed to save diagram. Please try again.');
                }
                return false;
            }
        },

        // ============================================================
        // DATABASE (CLOUD) SAVE/LOAD METHODS
        // ============================================================

        async saveToCloud(title, password) {
            console.log('saveToCloud called with title:', title, 'password length:', password?.length);

            const thumbnail = this.generateThumbnail();
            const diagramData = {
                enterprises: CoopMaps.state.data.enterprises,
                relationships: CoopMaps.state.data.relationships,
                metadata: CoopMaps.state.data.diagramProperties,
                timeline: CoopMaps.state.data.timeline || [],
                annotations: CoopMaps.state.data.annotations || [],
                groups: CoopMaps.state.data.groups || [],
                uiPreferences: {
                    connectorStyle: CoopMaps.state.ui.connectorStyle || 'orthogonal',
                    zoom: CoopMaps.state.ui.zoom,
                    canvasSize: CoopMaps.state.ui.canvasSize
                }
            };

            const apiUrl = this.getApiUrl();
            console.log('API URL:', apiUrl);
            console.log('Full save URL:', `${apiUrl}/api/maps/save`);

            try {
                const response = await fetch(`${apiUrl}/api/maps/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title,
                        password: password,
                        diagramData: diagramData,
                        thumbnail: thumbnail
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to save');
                }

                this.currentCloudId = result.mapId;
                this.userPassword = password;
                this.isDirty = false;
                this.lastSaveTime = new Date().toISOString();
                this.updateSaveIndicator();

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Map saved to cloud successfully!', 'success');
                }

                return result;
            } catch (error) {
                console.error('Error saving to cloud:', error);
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Failed to save to cloud: ' + error.message, 'error');
                }
                throw error;
            }
        },

        async updateCloudSave(password) {
            if (!this.currentCloudId) {
                throw new Error('No cloud map loaded');
            }

            const thumbnail = this.generateThumbnail();
            const diagramData = {
                enterprises: CoopMaps.state.data.enterprises,
                relationships: CoopMaps.state.data.relationships,
                metadata: CoopMaps.state.data.diagramProperties,
                timeline: CoopMaps.state.data.timeline || [],
                annotations: CoopMaps.state.data.annotations || [],
                groups: CoopMaps.state.data.groups || [],
                uiPreferences: {
                    connectorStyle: CoopMaps.state.ui.connectorStyle || 'orthogonal',
                    zoom: CoopMaps.state.ui.zoom,
                    canvasSize: CoopMaps.state.ui.canvasSize
                }
            };

            try {
                const response = await fetch(`${this.getApiUrl()}/api/maps/${this.currentCloudId}/save`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Map-Password': password || this.userPassword
                    },
                    body: JSON.stringify({
                        title: CoopMaps.state.data.diagramProperties.title,
                        diagramData: diagramData,
                        thumbnail: thumbnail
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to save');
                }

                this.isDirty = false;
                this.lastSaveTime = new Date().toISOString();
                this.updateSaveIndicator();

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Map saved!', 'success');
                }

                return result;
            } catch (error) {
                console.error('Error updating cloud save:', error);
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Failed to save: ' + error.message, 'error');
                }
                throw error;
            }
        },

        async loadFromCloud(mapId, password) {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/maps/${mapId}`, {
                    headers: {
                        'X-Map-Password': password
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load');
                }

                const map = result.map;
                const diagramData = map.diagramData;

                // Load diagram data into state
                CoopMaps.state.data.enterprises = diagramData.enterprises || [];
                CoopMaps.state.data.relationships = diagramData.relationships || [];
                CoopMaps.state.data.diagramProperties = diagramData.metadata || { title: map.title };
                CoopMaps.state.data.timeline = diagramData.timeline || [];
                CoopMaps.state.data.annotations = diagramData.annotations || [];
                CoopMaps.state.data.groups = diagramData.groups || [];

                // Load UI preferences
                if (diagramData.uiPreferences) {
                    if (diagramData.uiPreferences.connectorStyle) {
                        CoopMaps.state.ui.connectorStyle = diagramData.uiPreferences.connectorStyle;
                    }
                    if (diagramData.uiPreferences.canvasSize) {
                        CoopMaps.state.ui.canvasSize = diagramData.uiPreferences.canvasSize;
                    }
                }

                this.currentCloudId = mapId;
                this.userPassword = password;
                this.currentDiagramId = null; // Clear local ID
                this.isDirty = false;
                this.lastSaveTime = map.lastEditedAt || map.submittedAt;

                // Re-render
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification(`Loaded: ${map.title}`, 'success');
                }

                return map;
            } catch (error) {
                console.error('Error loading from cloud:', error);
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Failed to load: ' + error.message, 'error');
                }
                throw error;
            }
        },

        async getMyCloudMaps(password) {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/maps/my-maps`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password: password })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch maps');
                }

                return result.maps;
            } catch (error) {
                console.error('Error fetching cloud maps:', error);
                throw error;
            }
        },

        // ============================================================
        // LOCAL SAVE/LOAD METHODS (Original localStorage functionality)
        // ============================================================

        saveCurrentDiagram() {
            // If we have a cloud ID, save to cloud
            if (this.currentCloudId && this.userPassword) {
                this.updateCloudSave(this.userPassword).catch(err => {
                    console.error('Cloud save failed, falling back to local:', err);
                    this.saveCurrentDiagramLocal();
                });
                return;
            }

            // Otherwise save locally
            if (!this.currentDiagramId) {
                this.saveAsNewDiagram();
                return;
            }

            this.saveCurrentDiagramLocal();
        },

        saveCurrentDiagramLocal() {
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
                    // FIXED: Save timeline data (was missing before)
                    timeline: CoopMaps.state.data.timeline || [],
                    // FIXED: Save annotations/notes data (was missing before)
                    annotations: CoopMaps.state.data.annotations || [],
                    // Save groups if they exist
                    groups: CoopMaps.state.data.groups || [],
                    // Include security/password data
                    security: CoopMaps.state.data.security || null,
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
            console.log('saveAsNewDiagram called');
            const name = prompt('Enter a name for this diagram:',
                CoopMaps.state.data.diagramProperties.title || 'My Diagram');

            if (!name) {
                console.log('User cancelled name prompt');
                return;
            }

            console.log('Diagram name:', name);

            // Always require password for cloud save
            const doCloudSave = (password) => {
                console.log('doCloudSave callback triggered, password length:', password?.length);
                alert('DEBUG: About to call saveToCloud with name=' + name + ' password length=' + (password?.length || 0));
                this.saveToCloud(name, password)
                    .then(() => {
                        CoopMaps.state.data.diagramProperties.title = name;
                        this.showSaveAnimation();
                        if (CoopMaps.state.ui.activeTab === 'diagrams') {
                            CoopMaps.updateSidebar();
                        }
                    })
                    .catch(err => {
                        console.error('Cloud save failed:', err);
                        // Fallback to local save
                        this.saveAsNewDiagramLocal(name);
                    });
            };

            // Show password dialog for cloud save
            if (CoopMaps.modules.collaboration) {
                CoopMaps.modules.collaboration.showSetPasswordDialog((password) => {
                    doCloudSave(password);
                });
            } else {
                // Fallback to local save if no collaboration module
                this.saveAsNewDiagramLocal(name);
            }
        },

        // Local-only save (fallback when cloud is unavailable)
        saveAsNewDiagramLocal(name) {
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
                    timeline: CoopMaps.state.data.timeline || [],
                    annotations: CoopMaps.state.data.annotations || [],
                    groups: CoopMaps.state.data.groups || [],
                    security: CoopMaps.state.data.security || null,
                    uiPreferences: {
                        connectorStyle: CoopMaps.state.ui.connectorStyle || 'orthogonal',
                        zoom: CoopMaps.state.ui.zoom,
                        canvasSize: CoopMaps.state.ui.canvasSize
                    }
                }
            };

            if (this.saveDiagrams(diagrams)) {
                this.currentDiagramId = id;
                this.currentCloudId = null; // Clear cloud ID
                CoopMaps.state.data.diagramProperties.title = name;
                this.lastSaveTime = new Date().toISOString();
                this.isDirty = false;
                this.updateSaveIndicator();
                this.showSaveAnimation();

                if (CoopMaps.state.ui.activeTab === 'diagrams') {
                    CoopMaps.updateSidebar();
                }

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Saved locally (offline mode)', 'info');
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

            // FIXED: Load timeline data (was missing before)
            CoopMaps.state.data.timeline = diagram.data.timeline || [];

            // FIXED: Load annotations/notes data (was missing before)
            CoopMaps.state.data.annotations = diagram.data.annotations || [];

            // Load groups if they exist
            CoopMaps.state.data.groups = diagram.data.groups || [];

            // Load security/password data
            CoopMaps.state.data.security = diagram.data.security || null;

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

            // FIXED: Refresh timeline UI after loading
            if (CoopMaps.modules.timeline && CoopMaps.modules.timeline.refreshTimelinePanel) {
                CoopMaps.modules.timeline.refreshTimelinePanel();
            }

            // Check if map is password protected
            if (CoopMaps.modules.collaboration) {
                CoopMaps.modules.collaboration.onMapLoaded();
            }
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

        // Submit map for consideration to be published on community browse page
        showSubmitForConsiderationDialog() {
            // Remove existing modal
            const existing = document.getElementById('submitMapModal');
            if (existing) existing.remove();

            const diagramName = CoopMaps.state.data.diagramProperties?.name ||
                                CoopMaps.state.data.diagramProperties?.title || 'Untitled Map';
            const diagramDesc = CoopMaps.state.data.diagramProperties?.description || '';
            const author = CoopMaps.state.data.diagramProperties?.author || '';

            const useAnimation = !CoopMaps.isExpressMode;

            const modal = document.createElement('div');
            modal.id = 'submitMapModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, ${CoopMaps.isExpressMode ? '0.7' : '0.8'});
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                ${useAnimation ? 'animation: fadeIn 0.3s ease;' : ''}
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    ${CoopMaps.isExpressMode ? 'border: 2px solid #7f8c8d;' : 'border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);'}
                    padding: ${CoopMaps.isExpressMode ? '20px' : '30px'};
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    ${useAnimation ? 'animation: slideIn 0.3s ease;' : ''}
                ">
                    <h2 style="
                        margin: 0 0 10px 0;
                        color: #2c3e50;
                        font-size: ${CoopMaps.isExpressMode ? '16px' : '20px'};
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                        </svg>
                        Submit for Consideration
                    </h2>

                    <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
                        Submit your map for review by Principle 5. If approved, it will be published to the
                        <a href="browse.html" target="_blank" style="color: #3498db;">Community Maps gallery</a>
                        for others to view and learn from.
                    </p>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Map Title *
                        </label>
                        <input type="text" id="submitMapTitle" value="${this.escapeHtml(diagramName)}" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Author/Organization *
                        </label>
                        <input type="text" id="submitMapAuthor" value="${this.escapeHtml(author)}" placeholder="Your name or organization" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Email Address *
                        </label>
                        <input type="email" id="submitMapEmail" placeholder="your@email.com" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                        <small style="color: #95a5a6; font-size: 12px;">We'll notify you when your map is reviewed</small>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Description
                        </label>
                        <textarea id="submitMapDescription" placeholder="Describe your cooperative ecosystem map..." style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                            min-height: 80px;
                            resize: vertical;
                            font-family: inherit;
                        ">${this.escapeHtml(diagramDesc)}</textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                            Tags (comma-separated)
                        </label>
                        <input type="text" id="submitMapTags" placeholder="e.g., worker-owned, regional, food" style="
                            width: 100%;
                            padding: 10px;
                            border: ${CoopMaps.isExpressMode ? '2px inset #bdc3c7' : '1px solid #ddd'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>

                    <div style="
                        background: ${CoopMaps.isExpressMode ? '#f5f5f5' : '#f8f9fa'};
                        padding: 15px;
                        ${CoopMaps.isExpressMode ? 'border: 1px solid #bdc3c7;' : 'border-radius: 8px;'}
                        margin-bottom: 20px;
                        font-size: 13px;
                        color: #7f8c8d;
                    ">
                        <strong style="color: #2c3e50;">What happens next?</strong>
                        <ul style="margin: 10px 0 0 20px; padding: 0;">
                            <li>Your map will be reviewed by Principle 5 moderators</li>
                            <li>You'll receive an email notification about the decision</li>
                            <li>Approved maps appear on the Community Maps page</li>
                            <li>You can still edit your local copy after submission</li>
                        </ul>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="document.getElementById('submitMapModal').remove()" style="
                            flex: 1;
                            padding: 12px;
                            border: ${CoopMaps.isExpressMode ? '2px outset #bdc3c7' : '1px solid #ddd'};
                            background: ${CoopMaps.isExpressMode ? '#ecf0f1' : '#f8f9fa'};
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            color: #2c3e50;
                        ">
                            Cancel
                        </button>
                        <button onclick="CoopMaps.modules.persistence.submitMapForConsideration()" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            background: ${CoopMaps.isExpressMode ? '#27ae60' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'};
                            color: white;
                            ${CoopMaps.isExpressMode ? '' : 'border-radius: 8px;'}
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">
                            Submit for Review
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Close on Escape
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        },

        async submitMapForConsideration() {
            const title = document.getElementById('submitMapTitle')?.value?.trim();
            const author = document.getElementById('submitMapAuthor')?.value?.trim();
            const email = document.getElementById('submitMapEmail')?.value?.trim();
            const description = document.getElementById('submitMapDescription')?.value?.trim();
            const tagsInput = document.getElementById('submitMapTags')?.value?.trim();

            // Validation
            if (!title) {
                alert('Please enter a map title');
                return;
            }
            if (!author) {
                alert('Please enter your name or organization');
                return;
            }
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email address');
                return;
            }

            // Parse tags
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            // Generate thumbnail
            const thumbnail = this.generateThumbnail();

            // Prepare submission data
            const mapData = {
                title: title,
                author: author,
                email: email,
                description: description || '',
                tags: tags,
                thumbnail: thumbnail,
                diagramData: {
                    enterprises: CoopMaps.state.data.enterprises,
                    relationships: CoopMaps.state.data.relationships,
                    groups: CoopMaps.state.data.groups || [],
                    timeline: CoopMaps.state.data.timeline || [],
                    diagramProperties: {
                        ...CoopMaps.state.data.diagramProperties,
                        title: title,
                        author: author,
                        description: description
                    }
                }
            };

            try {
                // Show loading state
                const submitBtn = document.querySelector('#submitMapModal button:last-child');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                }

                // Submit via API
                const response = await CoopMapsAPI.submitMap(mapData);

                // Close modal
                document.getElementById('submitMapModal')?.remove();

                // Show success message
                if (CoopMaps.isExpressMode) {
                    alert('Success! Your map has been submitted for review. You will receive an email notification when it has been reviewed.');
                } else {
                    this.showSubmissionSuccessDialog(response);
                }

            } catch (error) {
                console.error('Submission error:', error);

                // Re-enable button
                const submitBtn = document.querySelector('#submitMapModal button:last-child');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit for Review';
                }

                alert('Failed to submit map: ' + (error.message || 'Unknown error. Please try again.'));
            }
        },

        showSubmissionSuccessDialog(response) {
            const successModal = document.createElement('div');
            successModal.style.cssText = `
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
                animation: fadeIn 0.3s ease;
            `;

            successModal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 450px;
                    width: 90%;
                    text-align: center;
                    animation: slideIn 0.3s ease;
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>

                    <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 24px;">
                        Submitted Successfully!
                    </h2>

                    <p style="color: #7f8c8d; margin-bottom: 25px; line-height: 1.6;">
                        Your map has been submitted for review. The Principle 5 team will review it
                        and you'll receive an email notification with the decision.
                    </p>

                    ${response?.submissionId ? `
                    <p style="color: #95a5a6; font-size: 13px; margin-bottom: 20px;">
                        Submission ID: <code style="background: #f5f5f5; padding: 2px 8px; border-radius: 4px;">${response.submissionId}</code>
                    </p>
                    ` : ''}

                    <button onclick="this.closest('div').parentElement.remove()" style="
                        padding: 14px 40px;
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 600;
                    ">
                        Done
                    </button>
                </div>
            `;

            document.body.appendChild(successModal);

            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) successModal.remove();
            });
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
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
                        flex-wrap: wrap;
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

                        <button onclick="CoopMaps.modules.persistence.showSubmitForConsiderationDialog()" style="
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        ">Submit for Approval</button>
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
