/**
 * Auto-Save Module
 * Handles debounced auto-saving of draft maps with conflict detection
 */

(function() {
    'use strict';

    // Check if CoopMaps global exists
    if (typeof window.CoopMaps === 'undefined') {
        console.error('CoopMaps global not found. AutoSave module cannot initialize.');
        return;
    }

    const AutoSaveModule = {
        autoSaveInterval: null,
        saveDebounceTimeout: null,
        lastSaveTime: null,
        currentDraftId: null,
        isDirty: false,
        isSaving: false,
        saveStatus: 'saved', // 'saved', 'saving', 'error', 'pending'
        retryCount: 0,

        // Configuration
        config: {
            debounceDelay: 3000, // 3 seconds after last change
            autoSaveInterval: 60000, // 60 seconds max between saves
            maxRetries: 3,
            enabled: true
        },

        /**
         * Initialize the auto-save module
         */
        init: function() {
            console.log('Auto-save module initialized');
            this.bindEvents();
            this.createSaveIndicator();
        },

        /**
         * Create save indicator UI element if it doesn't exist
         */
        createSaveIndicator: function() {
            if (document.getElementById('autoSaveIndicator')) return;

            const indicator = document.createElement('div');
            indicator.id = 'autoSaveIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                padding: 8px 16px;
                background: white;
                border: 1px solid #ecf0f1;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 2000;
                display: none;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 13px;
            `;
            document.body.appendChild(indicator);
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            const self = this;

            // Listen for diagram changes
            document.addEventListener('diagram-changed', function(e) {
                self.onDiagramChange(e.detail);
            });

            // Update save indicator periodically
            setInterval(function() {
                self.updateSaveIndicator();
            }, 5000);

            // Save before page unload if there are unsaved changes
            window.addEventListener('beforeunload', function(e) {
                if (self.isDirty && self.currentDraftId) {
                    e.preventDefault();
                    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                    return e.returnValue;
                }
            });
        },

        /**
         * Start auto-save for a draft
         */
        startAutoSave: function(draftId) {
            if (!this.config.enabled) {
                console.log('Auto-save is disabled');
                return;
            }

            this.currentDraftId = draftId;
            this.isDirty = false;
            this.lastSaveTime = new Date();
            this.retryCount = 0;
            this.saveStatus = 'saved';

            // Start interval-based auto-save (fallback if debounce never triggers)
            const self = this;
            this.autoSaveInterval = setInterval(function() {
                if (self.isDirty && !self.isSaving) {
                    self.saveDraft();
                }
            }, this.config.autoSaveInterval);

            // Show indicator
            const indicator = document.getElementById('autoSaveIndicator');
            if (indicator) {
                indicator.style.display = 'flex';
            }

            console.log('Auto-save started for draft:', draftId);
        },

        /**
         * Stop auto-save
         */
        stopAutoSave: function() {
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            if (this.saveDebounceTimeout) {
                clearTimeout(this.saveDebounceTimeout);
                this.saveDebounceTimeout = null;
            }
            this.currentDraftId = null;
            this.isDirty = false;

            // Hide indicator
            const indicator = document.getElementById('autoSaveIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }

            console.log('Auto-save stopped');
        },

        /**
         * Handle diagram change event
         */
        onDiagramChange: function(detail) {
            if (!this.currentDraftId || !this.config.enabled) return;

            this.isDirty = true;
            this.saveStatus = 'pending';
            this.updateSaveIndicator();

            // Clear existing debounce timeout
            if (this.saveDebounceTimeout) {
                clearTimeout(this.saveDebounceTimeout);
            }

            // Set new debounce timeout
            const self = this;
            this.saveDebounceTimeout = setTimeout(function() {
                if (self.isDirty && !self.isSaving) {
                    self.saveDraft(detail);
                }
            }, this.config.debounceDelay);
        },

        /**
         * Save draft to server
         */
        saveDraft: async function(changeDetail) {
            if (!this.currentDraftId || this.isSaving) return;

            this.isSaving = true;
            this.saveStatus = 'saving';
            this.updateSaveIndicator();

            const diagramData = this.collectDiagramData();
            const thumbnail = await this.generateThumbnail();

            try {
                const accessToken = this.getAccessToken();
                if (!accessToken) {
                    throw new Error('Not authenticated');
                }

                const response = await fetch(`${this.getApiUrl()}/api/drafts/${this.currentDraftId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        diagramData: diagramData,
                        thumbnail: thumbnail,
                        changesSummary: changeDetail ? {
                            type: changeDetail.type,
                            timestamp: new Date().toISOString()
                        } : null
                    })
                });

                if (!response.ok) {
                    // Check for new access token in response headers
                    const newToken = response.headers.get('X-New-Access-Token');
                    if (newToken) {
                        this.updateAccessToken(newToken);
                        // Retry with new token
                        return this.saveDraft(changeDetail);
                    }
                    throw new Error(`Save failed: ${response.status}`);
                }

                const result = await response.json();

                this.isDirty = false;
                this.lastSaveTime = new Date(result.draft.last_edited_at || result.savedAt);
                this.saveStatus = 'saved';
                this.retryCount = 0;

                console.log('Auto-save successful:', this.lastSaveTime);

            } catch (error) {
                console.error('Auto-save error:', error);
                this.saveStatus = 'error';
                this.retryCount++;

                // Show error notification
                this.showNotification('Failed to auto-save. Your changes may not be saved.', 'error');

                // Retry if under max retries
                if (this.retryCount < this.config.maxRetries) {
                    const self = this;
                    setTimeout(function() {
                        if (self.isDirty) {
                            console.log(`Retrying save (attempt ${self.retryCount + 1}/${self.config.maxRetries})`);
                            self.saveDraft(changeDetail);
                        }
                    }, 2000 * this.retryCount); // Exponential backoff
                }
            } finally {
                this.isSaving = false;
                this.updateSaveIndicator();
            }
        },

        /**
         * Collect current diagram data
         */
        collectDiagramData: function() {
            const state = window.CoopMaps.state;
            return {
                enterprises: state.data.enterprises || [],
                relationships: state.data.relationships || [],
                metadata: state.data.diagramProperties || {},
                timeline: state.data.timeline || [],
                annotations: state.data.annotations || [],
                groups: state.data.groups || [],
                uiPreferences: {
                    connectorStyle: state.ui.connectorStyle || 'orthogonal',
                    zoom: state.ui.zoom,
                    canvasSize: state.ui.canvasSize
                }
            };
        },

        /**
         * Generate thumbnail from canvas
         */
        generateThumbnail: async function() {
            const canvas = document.querySelector('canvas#canvas, canvas');
            if (!canvas) {
                console.warn('Canvas not found for thumbnail generation');
                return null;
            }

            try {
                const thumbCanvas = document.createElement('canvas');
                const thumbCtx = thumbCanvas.getContext('2d');
                const scale = 0.2; // 20% size

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

        /**
         * Update save indicator UI
         */
        updateSaveIndicator: function() {
            const indicator = document.getElementById('autoSaveIndicator');
            if (!indicator || !this.currentDraftId) return;

            let text = '';
            let icon = '';
            let color = '';

            switch (this.saveStatus) {
                case 'saved':
                    if (this.lastSaveTime) {
                        const secondsAgo = Math.floor((new Date() - this.lastSaveTime) / 1000);
                        if (secondsAgo < 60) {
                            text = `Saved ${secondsAgo}s ago`;
                        } else if (secondsAgo < 3600) {
                            text = `Saved ${Math.floor(secondsAgo / 60)}m ago`;
                        } else {
                            text = `Saved ${Math.floor(secondsAgo / 3600)}h ago`;
                        }
                    } else {
                        text = 'All changes saved';
                    }
                    icon = '✓';
                    color = '#27ae60';
                    break;
                case 'saving':
                    text = 'Saving...';
                    icon = '⟳';
                    color = '#3498db';
                    break;
                case 'pending':
                    text = 'Unsaved changes';
                    icon = '•';
                    color = '#f39c12';
                    break;
                case 'error':
                    text = this.retryCount > 0 ? `Save failed (retry ${this.retryCount}/${this.config.maxRetries})` : 'Save failed';
                    icon = '⚠';
                    color = '#e74c3c';
                    break;
            }

            indicator.innerHTML = `
                <span style="color: ${color}; font-weight: 600; margin-right: 5px;">${icon}</span>
                <span style="color: #7f8c8d; font-size: 13px;">${text}</span>
            `;
        },

        /**
         * Show notification to user
         */
        showNotification: function(message, type) {
            if (window.CoopMaps.showNotification) {
                window.CoopMaps.showNotification(message, type);
            } else {
                // Fallback to console
                console.log(`[${type}] ${message}`);
            }
        },

        /**
         * Get API base URL
         */
        getApiUrl: function() {
            return window.CoopMapsConfig?.API_BASE_URL?.replace(/\/api$/, '') || '';
        },

        /**
         * Get access token
         */
        getAccessToken: function() {
            if (window.CoopMaps.modules?.auth) {
                return window.CoopMaps.modules.auth.getAccessToken();
            }
            return localStorage.getItem('coopmaps_access_token');
        },

        /**
         * Update access token after refresh
         */
        updateAccessToken: function(newToken) {
            if (window.CoopMaps.modules?.auth && window.CoopMaps.modules.auth.updateAccessToken) {
                window.CoopMaps.modules.auth.updateAccessToken(newToken);
            } else {
                localStorage.setItem('coopmaps_access_token', newToken);
            }
        },

        /**
         * Enable/disable auto-save
         */
        setEnabled: function(enabled) {
            this.config.enabled = enabled;
            console.log('Auto-save', enabled ? 'enabled' : 'disabled');
        }
    };

    // Register module with CoopMaps
    if (window.CoopMaps.registerModule) {
        window.CoopMaps.registerModule('autoSave', AutoSaveModule);
    } else {
        // Fallback if registerModule doesn't exist
        window.CoopMaps.modules = window.CoopMaps.modules || {};
        window.CoopMaps.modules.autoSave = AutoSaveModule;
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            AutoSaveModule.init();
        });
    } else {
        AutoSaveModule.init();
    }

})();
