/**
 * Draft Collaboration Module
 * Handles real-time collaboration on draft maps via Socket.io
 */

(function() {
    'use strict';

    // Check if CoopMaps global exists
    if (typeof window.CoopMaps === 'undefined') {
        console.error('CoopMaps global not found. DraftCollaboration module cannot initialize.');
        return;
    }

    const DraftCollaborationModule = {
        socket: null,
        currentDraftId: null,
        collaborators: [],
        isConnected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,

        /**
         * Initialize the draft collaboration module
         */
        init: function() {
            console.log('Draft collaboration module initialized');
            this.createCollaboratorsIndicator();
        },

        /**
         * Create collaborators indicator UI element if it doesn't exist
         */
        createCollaboratorsIndicator: function() {
            if (document.getElementById('collaboratorsIndicator')) return;

            const indicator = document.createElement('div');
            indicator.id = 'collaboratorsIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 110px;
                right: 20px;
                padding: 8px 16px;
                background: white;
                border: 1px solid #ecf0f1;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 2000;
                display: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            document.body.appendChild(indicator);
        },

        /**
         * Connect to Socket.io server
         */
        connect: function() {
            if (this.socket && this.isConnected) {
                console.log('Already connected to collaboration server');
                return;
            }

            const token = this.getAccessToken();
            if (!token) {
                console.error('Cannot connect: no access token');
                return;
            }

            const socketUrl = this.getSocketUrl();

            // Initialize Socket.io connection
            this.socket = io(socketUrl, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.bindSocketEvents();
        },

        /**
         * Bind Socket.io event handlers
         */
        bindSocketEvents: function() {
            const self = this;

            this.socket.on('connect', function() {
                console.log('Draft collaboration socket connected');
                self.isConnected = true;
                self.reconnectAttempts = 0;

                // Rejoin draft if we were in one
                if (self.currentDraftId) {
                    console.log('Rejoining draft after reconnection:', self.currentDraftId);
                    self.joinDraft(self.currentDraftId);
                }

                self.showNotification('Connected to collaboration server', 'success');
            });

            this.socket.on('disconnect', function(reason) {
                console.log('Draft collaboration socket disconnected:', reason);
                self.isConnected = false;

                if (reason === 'io server disconnect') {
                    // Server disconnected, manually reconnect
                    self.socket.connect();
                }

                self.showNotification('Disconnected from collaboration server', 'warning');
            });

            this.socket.on('connect_error', function(error) {
                console.error('Connection error:', error);
                self.reconnectAttempts++;

                if (self.reconnectAttempts >= self.maxReconnectAttempts) {
                    self.showNotification('Failed to connect to collaboration server', 'error');
                }
            });

            this.socket.on('joined-draft', function(data) {
                const { draftId, users } = data;
                console.log(`Joined draft: ${draftId}`, users);
                self.collaborators = users || [];
                self.updateCollaboratorsList(self.collaborators);
            });

            this.socket.on('user-joined-draft', function(data) {
                const { userId, email } = data;
                console.log(`User joined draft: ${email}`);

                // Add to collaborators list
                if (!self.collaborators.find(c => c.userId === userId)) {
                    self.collaborators.push({ userId, email });
                }

                self.updateCollaboratorsList(self.collaborators);
                self.showNotification(`${email} joined the draft`, 'info');
            });

            this.socket.on('user-left-draft', function(data) {
                const { userId } = data;
                console.log(`User left draft: ${userId}`);

                // Remove from collaborators list
                self.collaborators = self.collaborators.filter(c => c.userId !== userId);
                self.updateCollaboratorsList(self.collaborators);
            });

            this.socket.on('draft-changed', function(data) {
                const { changeType, data: changeData, userId, email, timestamp } = data;
                console.log(`Draft changed by ${email}:`, changeType);
                self.handleRemoteChange(changeType, changeData, userId, email);
            });

            this.socket.on('draft-cursor-update', function(data) {
                const { userId, email, cursor, selection } = data;
                self.updateRemoteCursor(userId, email, cursor, selection);
            });

            this.socket.on('draft-sync', function(data) {
                const { draftId, diagramData, lastEditedAt } = data;
                console.log('Draft sync received');
                self.handleDraftSync(diagramData, lastEditedAt);
            });

            this.socket.on('entity-locked', function(data) {
                const { entityId, entityType, lockedBy, email } = data;
                console.log(`Entity locked: ${entityType} ${entityId} by ${email}`);
                self.handleEntityLocked(entityId, entityType, lockedBy, email);
            });

            this.socket.on('entity-unlocked', function(data) {
                const { entityId, entityType } = data;
                console.log(`Entity unlocked: ${entityType} ${entityId}`);
                self.handleEntityUnlocked(entityId, entityType);
            });

            this.socket.on('error', function(data) {
                console.error('Socket error:', data.message);
                self.showNotification(data.message, 'error');
            });
        },

        /**
         * Join a draft room
         */
        joinDraft: function(draftId) {
            if (!this.socket || !this.isConnected) {
                console.log('Connecting to socket before joining draft...');
                this.connect();

                // Wait for connection then join
                const self = this;
                this.socket.once('connect', function() {
                    self.socket.emit('join-draft', { draftId });
                });
            } else {
                this.socket.emit('join-draft', { draftId });
            }

            this.currentDraftId = draftId;

            // Show collaborators indicator
            const indicator = document.getElementById('collaboratorsIndicator');
            if (indicator) {
                indicator.style.display = 'block';
            }
        },

        /**
         * Leave current draft room
         */
        leaveDraft: function() {
            if (this.socket && this.currentDraftId) {
                this.socket.emit('leave-draft', { draftId: this.currentDraftId });
            }

            this.currentDraftId = null;
            this.collaborators = [];
            this.updateCollaboratorsList([]);

            // Hide collaborators indicator
            const indicator = document.getElementById('collaboratorsIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        },

        /**
         * Broadcast a change to collaborators
         */
        broadcastChange: function(changeType, data) {
            if (!this.socket || !this.currentDraftId || !this.isConnected) return;

            this.socket.emit('draft-change', {
                draftId: this.currentDraftId,
                changeType: changeType,
                data: data
            });
        },

        /**
         * Broadcast cursor position
         */
        broadcastCursor: function(cursor, selection) {
            if (!this.socket || !this.currentDraftId || !this.isConnected) return;

            this.socket.emit('draft-cursor', {
                draftId: this.currentDraftId,
                cursor: cursor,
                selection: selection
            });
        },

        /**
         * Request sync from server
         */
        requestSync: function() {
            if (!this.socket || !this.currentDraftId) return;

            this.socket.emit('request-draft-sync', {
                draftId: this.currentDraftId
            });
        },

        /**
         * Lock an entity for editing
         */
        lockEntity: function(entityId, entityType) {
            if (!this.socket || !this.currentDraftId) return;

            this.socket.emit('lock-entity', {
                draftId: this.currentDraftId,
                entityId: entityId,
                entityType: entityType
            });
        },

        /**
         * Unlock an entity after editing
         */
        unlockEntity: function(entityId, entityType) {
            if (!this.socket || !this.currentDraftId) return;

            this.socket.emit('unlock-entity', {
                draftId: this.currentDraftId,
                entityId: entityId,
                entityType: entityType
            });
        },

        /**
         * Handle remote change from another user
         */
        handleRemoteChange: function(changeType, data, userId, email) {
            // Temporarily disable auto-save while applying remote changes
            const autoSave = window.CoopMaps.modules?.autoSave;
            const wasAutoSaveActive = autoSave?.currentDraftId;

            if (wasAutoSaveActive && autoSave.stopAutoSave) {
                autoSave.stopAutoSave();
            }

            // Apply the change based on type
            const state = window.CoopMaps.state;

            try {
                switch (changeType) {
                    case 'enterprise-added':
                        if (state.data.enterprises) {
                            state.data.enterprises.push(data);
                        }
                        break;

                    case 'enterprise-updated':
                        if (state.data.enterprises) {
                            const entIndex = state.data.enterprises.findIndex(e => e.id === data.id);
                            if (entIndex !== -1) {
                                state.data.enterprises[entIndex] = {
                                    ...state.data.enterprises[entIndex],
                                    ...data
                                };
                            }
                        }
                        break;

                    case 'enterprise-deleted':
                        if (state.data.enterprises) {
                            state.data.enterprises = state.data.enterprises.filter(e => e.id !== data.id);
                        }
                        break;

                    case 'relationship-added':
                        if (state.data.relationships) {
                            state.data.relationships.push(data);
                        }
                        break;

                    case 'relationship-updated':
                        if (state.data.relationships) {
                            const relIndex = state.data.relationships.findIndex(r => r.id === data.id);
                            if (relIndex !== -1) {
                                state.data.relationships[relIndex] = {
                                    ...state.data.relationships[relIndex],
                                    ...data
                                };
                            }
                        }
                        break;

                    case 'relationship-deleted':
                        if (state.data.relationships) {
                            state.data.relationships = state.data.relationships.filter(r => r.id !== data.id);
                        }
                        break;

                    case 'full-update':
                        // Complete state replacement (for major changes)
                        if (data.enterprises) state.data.enterprises = data.enterprises;
                        if (data.relationships) state.data.relationships = data.relationships;
                        if (data.groups) state.data.groups = data.groups;
                        break;
                }

                // Re-render canvas
                if (window.CoopMaps.modules?.canvas && window.CoopMaps.modules.canvas.render) {
                    window.CoopMaps.modules.canvas.render();
                }

                console.log(`Applied remote change: ${changeType} by ${email}`);
            } catch (error) {
                console.error('Error applying remote change:', error);
                // Request sync to recover
                this.requestSync();
            }

            // Restart auto-save
            if (wasAutoSaveActive && autoSave.startAutoSave) {
                autoSave.startAutoSave(this.currentDraftId);
            }
        },

        /**
         * Handle draft sync from server
         */
        handleDraftSync: function(diagramData, lastEditedAt) {
            const autoSave = window.CoopMaps.modules?.autoSave;

            // Check if local changes are newer
            if (autoSave && autoSave.lastSaveTime) {
                const serverTime = new Date(lastEditedAt);
                if (serverTime < autoSave.lastSaveTime) {
                    console.log('Local changes are newer, keeping local state');
                    return;
                }
            }

            // Apply synced data
            const state = window.CoopMaps.state;
            state.data.enterprises = diagramData.enterprises || [];
            state.data.relationships = diagramData.relationships || [];
            state.data.diagramProperties = diagramData.metadata || {};
            state.data.timeline = diagramData.timeline || [];
            state.data.annotations = diagramData.annotations || [];
            state.data.groups = diagramData.groups || [];

            // Apply UI preferences if present
            if (diagramData.uiPreferences) {
                if (diagramData.uiPreferences.connectorStyle) {
                    state.ui.connectorStyle = diagramData.uiPreferences.connectorStyle;
                }
                if (diagramData.uiPreferences.canvasSize) {
                    state.ui.canvasSize = diagramData.uiPreferences.canvasSize;
                }
            }

            // Re-render
            if (window.CoopMaps.modules?.canvas && window.CoopMaps.modules.canvas.render) {
                window.CoopMaps.modules.canvas.render();
            }

            this.showNotification('Draft synced with latest changes', 'success');
        },

        /**
         * Handle entity locked by another user
         */
        handleEntityLocked: function(entityId, entityType, lockedBy, email) {
            // Visual indicator that entity is being edited by someone else
            const element = document.getElementById(entityId);
            if (element) {
                element.style.outline = '2px solid #e74c3c';
                element.setAttribute('data-locked-by', email);
                element.setAttribute('title', `Being edited by ${email}`);
            }
        },

        /**
         * Handle entity unlocked
         */
        handleEntityUnlocked: function(entityId, entityType) {
            const element = document.getElementById(entityId);
            if (element) {
                element.style.outline = '';
                element.removeAttribute('data-locked-by');
                element.removeAttribute('title');
            }
        },

        /**
         * Update remote cursor display (placeholder for visual implementation)
         */
        updateRemoteCursor: function(userId, email, cursor, selection) {
            // This is a placeholder - implement based on your UI design
            // Could show cursor positions or selection highlights
            console.log(`Remote cursor from ${email}:`, cursor, selection);
        },

        /**
         * Update collaborators list UI
         */
        updateCollaboratorsList: function(users) {
            this.collaborators = users;

            const container = document.getElementById('collaboratorsIndicator');
            if (!container) return;

            if (users.length === 0) {
                container.innerHTML = '<span style="color: #95a5a6; font-size: 13px;">No collaborators</span>';
                return;
            }

            const avatars = users.slice(0, 3).map(function(user) {
                const initial = user.email?.charAt(0).toUpperCase() || '?';
                const colors = ['#9b59b6', '#3498db', '#e74c3c', '#f39c12', '#27ae60'];
                const color = colors[Math.abs(hashCode(user.userId || user.email)) % colors.length];

                return `<div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${color};
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 14px;
                    margin-right: -8px;
                    border: 2px solid white;
                " title="${user.email}">${initial}</div>`;
            }).join('');

            const moreText = users.length > 3
                ? `<span style="margin-left: 10px; color: #7f8c8d; font-size: 13px;">+${users.length - 3} more</span>`
                : '';

            container.innerHTML = `
                <div style="display: flex; align-items: center;">
                    ${avatars}
                    ${moreText}
                </div>
            `;
        },

        /**
         * Disconnect from socket
         */
        disconnect: function() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
                this.isConnected = false;
            }
            this.leaveDraft();
        },

        /**
         * Show notification to user
         */
        showNotification: function(message, type) {
            if (window.CoopMaps.showNotification) {
                window.CoopMaps.showNotification(message, type);
            } else {
                console.log(`[${type}] ${message}`);
            }
        },

        /**
         * Get socket URL
         */
        getSocketUrl: function() {
            const apiUrl = window.CoopMapsConfig?.API_BASE_URL?.replace(/\/api$/, '') || '';
            return apiUrl || window.location.origin;
        },

        /**
         * Get access token
         */
        getAccessToken: function() {
            if (window.CoopMaps.modules?.auth && window.CoopMaps.modules.auth.getAccessToken) {
                return window.CoopMaps.modules.auth.getAccessToken();
            }
            return localStorage.getItem('coopmaps_access_token');
        }
    };

    /**
     * Simple hash function for consistent colors
     */
    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    // Register module with CoopMaps
    if (window.CoopMaps.registerModule) {
        window.CoopMaps.registerModule('draftCollaboration', DraftCollaborationModule);
    } else {
        window.CoopMaps.modules = window.CoopMaps.modules || {};
        window.CoopMaps.modules.draftCollaboration = DraftCollaborationModule;
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            DraftCollaborationModule.init();
        });
    } else {
        DraftCollaborationModule.init();
    }

})();
