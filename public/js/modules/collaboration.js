/**
 * Co-op Maps - Collaboration Module
 * Password-based map protection for collaborative editing
 * Integrates with backend /api/maps/* endpoints for secure storage
 */

(function() {
    'use strict';

    CoopMaps.registerModule('collaboration', {
        isUnlocked: false,
        currentPassword: null,
        currentMapId: null, // Server-side map ID

        init() {
            console.log('Collaboration module initialized');
        },

        // Simple hash function for client-side (not cryptographically secure, but works offline)
        // Real security comes from server-side bcrypt when submitted
        async hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + 'coopmaps_salt_2025');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        // Verify password against stored hash (for local files)
        async verifyPassword(password, storedHash) {
            const hash = await this.hashPassword(password);
            return hash === storedHash;
        },

        // Verify password with server (for server-stored maps)
        async verifyServerPassword(mapId, password) {
            try {
                const response = await fetch(`/api/maps/${mapId}/verify-password`, {
                    headers: { 'X-Map-Password': password }
                });
                return response.ok;
            } catch (e) {
                console.error('Server password verification failed:', e);
                return false;
            }
        },

        // Check if current map has password protection
        hasPassword() {
            return !!(CoopMaps.state.data.security && CoopMaps.state.data.security.passwordHash);
        },

        // Check if map is currently unlocked for editing
        canEdit() {
            // No password = can edit
            if (!this.hasPassword()) return true;
            // Has password and unlocked = can edit
            return this.isUnlocked;
        },

        // Show set password dialog (for first save)
        showSetPasswordDialog(onSuccess) {
            const isExpress = CoopMaps.isExpressMode;

            const backdrop = document.createElement('div');
            backdrop.id = 'passwordBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.id = 'setPasswordDialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 450px;
                width: 90%;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            dialog.innerHTML = `
                <h2 style="margin: 0 0 10px 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '22px'};">
                    Set Map Password
                </h2>
                <p style="color: #7f8c8d; margin: 0 0 20px 0; font-size: 14px;">
                    A password is required to save your map. Share the password with collaborators to allow them to edit.
                </p>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Password
                    </label>
                    <input type="password" id="newPassword" placeholder="Enter password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Confirm Password
                    </label>
                    <input type="password" id="confirmPassword" placeholder="Confirm password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div id="passwordError" style="
                    color: #e74c3c;
                    font-size: 13px;
                    margin-bottom: 15px;
                    display: none;
                "></div>

                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 12px;
                    border-radius: ${isExpress ? '0' : '8px'};
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #856404;
                ">
                    <strong>Important:</strong> Remember this password! Share it with anyone you want to collaborate with.
                    If you forget it, only a Principle 5 admin can reset it.
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelPasswordBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="setPasswordBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#27ae60' : 'linear-gradient(135deg, #27ae60, #229954)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Set Password & Save</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            // Focus password field
            document.getElementById('newPassword').focus();

            // Handle set password
            document.getElementById('setPasswordBtn').onclick = async () => {
                const password = document.getElementById('newPassword').value;
                const confirm = document.getElementById('confirmPassword').value;
                const errorEl = document.getElementById('passwordError');

                if (!password) {
                    errorEl.textContent = 'Please enter a password';
                    errorEl.style.display = 'block';
                    return;
                }

                if (password.length < 4) {
                    errorEl.textContent = 'Password must be at least 4 characters';
                    errorEl.style.display = 'block';
                    return;
                }

                if (password !== confirm) {
                    errorEl.textContent = 'Passwords do not match';
                    errorEl.style.display = 'block';
                    return;
                }

                // Hash and store password
                const hash = await this.hashPassword(password);
                CoopMaps.state.data.security = {
                    passwordHash: hash,
                    createdAt: new Date().toISOString(),
                    lastEditedAt: new Date().toISOString()
                };

                this.isUnlocked = true;
                this.currentPassword = password;

                backdrop.remove();
                dialog.remove();

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Password set successfully', 'success');
                }

                if (onSuccess) onSuccess();
            };

            // Handle cancel (does NOT save - password is mandatory)
            document.getElementById('cancelPasswordBtn').onclick = () => {
                backdrop.remove();
                dialog.remove();
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Save cancelled - password is required', 'info');
                }
            };

            // Handle enter key
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('setPasswordBtn').click();
                }
            });

            // Close on backdrop click (same as cancel)
            backdrop.onclick = () => {
                backdrop.remove();
                dialog.remove();
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Save cancelled - password is required', 'info');
                }
            };
        },

        // Show unlock dialog (when loading a protected map)
        showUnlockDialog(onSuccess, onCancel) {
            const isExpress = CoopMaps.isExpressMode;

            const backdrop = document.createElement('div');
            backdrop.id = 'unlockBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.id = 'unlockDialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 400px;
                width: 90%;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            const mapTitle = CoopMaps.state.data.diagramProperties?.title || 'This map';

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: ${isExpress ? '#e74c3c' : 'linear-gradient(135deg, #e74c3c, #c0392b)'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 15px;
                    ">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <h2 style="margin: 0 0 5px 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '22px'};">
                        Protected Map
                    </h2>
                    <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
                        "${mapTitle}" is password protected
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <input type="password" id="unlockPassword" placeholder="Enter password to edit" style="
                        width: 100%;
                        padding: 14px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                        text-align: center;
                    ">
                </div>

                <div id="unlockError" style="
                    color: #e74c3c;
                    font-size: 13px;
                    margin-bottom: 15px;
                    text-align: center;
                    display: none;
                "></div>

                <div style="display: flex; gap: 12px;">
                    <button id="viewOnlyBtn" style="
                        flex: 1;
                        padding: 12px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">View Only</button>
                    <button id="unlockBtn" style="
                        flex: 1;
                        padding: 12px;
                        background: ${isExpress ? '#27ae60' : 'linear-gradient(135deg, #27ae60, #229954)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Unlock</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            document.getElementById('unlockPassword').focus();

            // Handle unlock
            document.getElementById('unlockBtn').onclick = async () => {
                const password = document.getElementById('unlockPassword').value;
                const errorEl = document.getElementById('unlockError');

                if (!password) {
                    errorEl.textContent = 'Please enter the password';
                    errorEl.style.display = 'block';
                    return;
                }

                const storedHash = CoopMaps.state.data.security.passwordHash;
                const isValid = await this.verifyPassword(password, storedHash);

                if (isValid) {
                    this.isUnlocked = true;
                    this.currentPassword = password;

                    backdrop.remove();
                    dialog.remove();

                    if (CoopMaps.showNotification) {
                        CoopMaps.showNotification('Map unlocked for editing', 'success');
                    }

                    if (onSuccess) onSuccess();
                } else {
                    errorEl.textContent = 'Incorrect password';
                    errorEl.style.display = 'block';
                    document.getElementById('unlockPassword').value = '';
                    document.getElementById('unlockPassword').focus();
                }
            };

            // Handle view only
            document.getElementById('viewOnlyBtn').onclick = () => {
                this.isUnlocked = false;
                backdrop.remove();
                dialog.remove();

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Viewing in read-only mode', 'info');
                }

                this.showReadOnlyIndicator();
                if (onCancel) onCancel();
            };

            // Handle enter key
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('unlockBtn').click();
                }
            });
        },

        // Show read-only indicator
        showReadOnlyIndicator() {
            // Remove existing
            const existing = document.getElementById('readOnlyIndicator');
            if (existing) existing.remove();

            const indicator = document.createElement('div');
            indicator.id = 'readOnlyIndicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #e74c3c;
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 13px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
            `;
            indicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Read-Only Mode</span>
                <span style="opacity: 0.8; font-size: 11px;">(Click to unlock)</span>
            `;

            indicator.onclick = () => {
                this.showUnlockDialog(() => {
                    indicator.remove();
                });
            };

            document.body.appendChild(indicator);
        },

        // Remove read-only indicator
        hideReadOnlyIndicator() {
            const indicator = document.getElementById('readOnlyIndicator');
            if (indicator) indicator.remove();
        },

        // Show change password dialog
        showChangePasswordDialog() {
            if (!this.hasPassword()) {
                // No existing password - just set one
                this.showSetPasswordDialog();
                return;
            }

            if (!this.isUnlocked) {
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Unlock the map first to change password', 'error');
                }
                return;
            }

            const isExpress = CoopMaps.isExpressMode;

            const backdrop = document.createElement('div');
            backdrop.id = 'changePasswordBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.id = 'changePasswordDialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 400px;
                width: 90%;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '22px'};">
                    Change Password
                </h2>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        New Password
                    </label>
                    <input type="password" id="newPassword2" placeholder="Enter new password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Confirm New Password
                    </label>
                    <input type="password" id="confirmPassword2" placeholder="Confirm new password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div id="changePasswordError" style="
                    color: #e74c3c;
                    font-size: 13px;
                    margin-bottom: 15px;
                    display: none;
                "></div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelChangeBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="confirmChangeBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Change Password</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            document.getElementById('newPassword2').focus();

            const closeDialog = () => {
                backdrop.remove();
                dialog.remove();
            };

            document.getElementById('cancelChangeBtn').onclick = closeDialog;
            backdrop.onclick = closeDialog;

            document.getElementById('confirmChangeBtn').onclick = async () => {
                const newPass = document.getElementById('newPassword2').value;
                const confirmPass = document.getElementById('confirmPassword2').value;
                const errorEl = document.getElementById('changePasswordError');

                if (!newPass || newPass.length < 4) {
                    errorEl.textContent = 'Password must be at least 4 characters';
                    errorEl.style.display = 'block';
                    return;
                }

                if (newPass !== confirmPass) {
                    errorEl.textContent = 'Passwords do not match';
                    errorEl.style.display = 'block';
                    return;
                }

                const hash = await this.hashPassword(newPass);
                CoopMaps.state.data.security.passwordHash = hash;
                CoopMaps.state.data.security.lastEditedAt = new Date().toISOString();
                this.currentPassword = newPass;

                closeDialog();

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Password changed successfully', 'success');
                }
            };
        },

        // Remove password protection
        removePassword() {
            if (!this.isUnlocked && this.hasPassword()) {
                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Unlock the map first to remove protection', 'error');
                }
                return;
            }

            if (confirm('Remove password protection? Anyone will be able to edit this map.')) {
                delete CoopMaps.state.data.security;
                this.isUnlocked = true;
                this.currentPassword = null;

                if (CoopMaps.showNotification) {
                    CoopMaps.showNotification('Password protection removed', 'success');
                }
            }
        },

        // Called when loading a map file
        onMapLoaded() {
            this.isUnlocked = false;
            this.currentPassword = null;

            if (this.hasPassword()) {
                this.showUnlockDialog();
            }
        },

        // Update last edited timestamp
        updateLastEdited() {
            if (CoopMaps.state.data.security) {
                CoopMaps.state.data.security.lastEditedAt = new Date().toISOString();
            }
        },

        // ============================================================
        // SERVER-SIDE MAP STORAGE
        // ============================================================

        // Save map to server with password protection
        async saveToServer(password) {
            const props = CoopMaps.state.data.diagramProperties || {};

            // Prepare diagram data
            const diagramData = {
                enterprises: CoopMaps.state.data.enterprises || [],
                relationships: CoopMaps.state.data.relationships || [],
                notes: CoopMaps.state.data.notes || [],
                groups: CoopMaps.state.data.groups || [],
                diagramProperties: props
            };

            // Generate thumbnail if possible
            let thumbnail = null;
            try {
                const canvas = document.getElementById('canvas');
                if (canvas) {
                    thumbnail = canvas.toDataURL('image/png', 0.5);
                }
            } catch (e) {
                console.warn('Could not generate thumbnail:', e);
            }

            const payload = {
                title: props.title || 'Untitled Map',
                author: props.author || 'Anonymous',
                authorEmail: props.authorEmail || '',
                authorOrganization: props.organization || '',
                password: password,
                diagramData: diagramData,
                thumbnail: thumbnail,
                wdr: props.wdr || '',
                scopeGeographic: props.scopeGeographic || 'local',
                scopeEconomic: props.scopeEconomic || '',
                scopeUserDefined: props.scopeUserDefined || '',
                period: props.period || 'present',
                diagramDate: props.diagramDate || null,
                tags: props.tags || []
            };

            try {
                let response;
                let url;
                let method;

                if (this.currentMapId) {
                    // Update existing map
                    url = `/api/maps/${this.currentMapId}/edit`;
                    method = 'PUT';
                    response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Map-Password': password
                        },
                        body: JSON.stringify({
                            diagramData: diagramData,
                            thumbnail: thumbnail
                        })
                    });
                } else {
                    // Submit new map
                    url = '/api/maps/submit';
                    method = 'POST';
                    response = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to save map');
                }

                // Store map ID for future saves
                if (data.mapId) {
                    this.currentMapId = data.mapId;
                    CoopMaps.state.data.serverMapId = data.mapId;
                }

                this.currentPassword = password;
                this.isUnlocked = true;

                return { success: true, mapId: this.currentMapId || data.mapId, data };
            } catch (error) {
                console.error('Failed to save map to server:', error);
                throw error;
            }
        },

        // Load map from server by ID
        async loadFromServer(mapId, password) {
            try {
                const headers = {};
                if (password) {
                    headers['X-Map-Password'] = password;
                }

                const response = await fetch(`/api/maps/${mapId}`, { headers });
                const data = await response.json();

                if (!response.ok) {
                    if (data.requiresPassword) {
                        return { success: false, requiresPassword: true };
                    }
                    throw new Error(data.message || 'Failed to load map');
                }

                // Load map data into state
                const map = data.map;
                const diagramData = map.diagramData;

                CoopMaps.state.data.enterprises = diagramData.enterprises || [];
                CoopMaps.state.data.relationships = diagramData.relationships || [];
                CoopMaps.state.data.notes = diagramData.notes || [];
                CoopMaps.state.data.groups = diagramData.groups || [];
                CoopMaps.state.data.diagramProperties = diagramData.diagramProperties || {
                    title: map.title,
                    author: map.author
                };
                CoopMaps.state.data.serverMapId = mapId;

                this.currentMapId = mapId;
                this.currentPassword = password;
                this.isUnlocked = !!password;

                // Refresh canvas
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                return { success: true, map: map };
            } catch (error) {
                console.error('Failed to load map from server:', error);
                throw error;
            }
        },

        // Show dialog to save map with password to server
        showSaveToServerDialog() {
            const isExpress = CoopMaps.isExpressMode;
            const hasExistingMap = !!this.currentMapId;

            const backdrop = document.createElement('div');
            backdrop.id = 'saveServerBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.id = 'saveServerDialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            const props = CoopMaps.state.data.diagramProperties || {};

            dialog.innerHTML = `
                <h2 style="margin: 0 0 10px 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '22px'};">
                    ${hasExistingMap ? 'Update Map on Server' : 'Save Map to Server'}
                </h2>
                <p style="color: #7f8c8d; margin: 0 0 20px 0; font-size: 14px;">
                    ${hasExistingMap
                        ? 'Enter the password to update this map on the server.'
                        : 'Save your map online. Share the Map ID and password with collaborators so they can view and edit.'}
                </p>

                ${!hasExistingMap ? `
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Map Title *
                    </label>
                    <input type="text" id="serverMapTitle" value="${props.title || ''}" placeholder="Enter map title" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Author Name *
                    </label>
                    <input type="text" id="serverMapAuthor" value="${props.author || ''}" placeholder="Your name" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Author Email (for notifications)
                    </label>
                    <input type="email" id="serverMapEmail" value="${props.authorEmail || ''}" placeholder="your@email.com" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                ` : ''}

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Password *
                    </label>
                    <input type="password" id="serverMapPassword" value="${this.currentPassword || ''}" placeholder="${hasExistingMap ? 'Enter map password' : 'Create a password'}" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>

                ${!hasExistingMap ? `
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Confirm Password *
                    </label>
                    <input type="password" id="serverMapPasswordConfirm" placeholder="Confirm password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                ` : ''}

                <div id="serverSaveError" style="
                    color: #e74c3c;
                    font-size: 13px;
                    margin-bottom: 15px;
                    display: none;
                "></div>

                ${hasExistingMap ? `
                <div style="
                    background: #e8f4f8;
                    border: 1px solid #3498db;
                    padding: 12px;
                    border-radius: ${isExpress ? '0' : '8px'};
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #2980b9;
                ">
                    <strong>Map ID:</strong> <code style="background: white; padding: 2px 6px; border-radius: 4px;">${this.currentMapId}</code>
                </div>
                ` : `
                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 12px;
                    border-radius: ${isExpress ? '0' : '8px'};
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #856404;
                ">
                    <strong>Important:</strong> After saving, you'll receive a Map ID. Share this ID and the password with collaborators.
                </div>
                `}

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelServerSaveBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="confirmServerSaveBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#27ae60' : 'linear-gradient(135deg, #27ae60, #229954)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">${hasExistingMap ? 'Update Map' : 'Save to Server'}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            const closeDialog = () => {
                backdrop.remove();
                dialog.remove();
            };

            document.getElementById('cancelServerSaveBtn').onclick = closeDialog;
            backdrop.onclick = closeDialog;

            document.getElementById('confirmServerSaveBtn').onclick = async () => {
                const errorEl = document.getElementById('serverSaveError');
                const password = document.getElementById('serverMapPassword').value;

                if (!hasExistingMap) {
                    const title = document.getElementById('serverMapTitle').value.trim();
                    const author = document.getElementById('serverMapAuthor').value.trim();
                    const email = document.getElementById('serverMapEmail').value.trim();
                    const confirmPassword = document.getElementById('serverMapPasswordConfirm').value;

                    if (!title) {
                        errorEl.textContent = 'Map title is required';
                        errorEl.style.display = 'block';
                        return;
                    }

                    if (!author) {
                        errorEl.textContent = 'Author name is required';
                        errorEl.style.display = 'block';
                        return;
                    }

                    if (!password || password.length < 4) {
                        errorEl.textContent = 'Password must be at least 4 characters';
                        errorEl.style.display = 'block';
                        return;
                    }

                    if (password !== confirmPassword) {
                        errorEl.textContent = 'Passwords do not match';
                        errorEl.style.display = 'block';
                        return;
                    }

                    // Update diagram properties
                    CoopMaps.state.data.diagramProperties = {
                        ...CoopMaps.state.data.diagramProperties,
                        title: title,
                        author: author,
                        authorEmail: email
                    };
                } else {
                    if (!password) {
                        errorEl.textContent = 'Password is required';
                        errorEl.style.display = 'block';
                        return;
                    }
                }

                // Disable button and show loading
                const btn = document.getElementById('confirmServerSaveBtn');
                btn.disabled = true;
                btn.textContent = 'Saving...';

                try {
                    const result = await this.saveToServer(password);

                    closeDialog();

                    // Show success with Map ID
                    this.showMapIdDialog(result.mapId);

                } catch (error) {
                    errorEl.textContent = error.message || 'Failed to save map';
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = hasExistingMap ? 'Update Map' : 'Save to Server';
                }
            };
        },

        // Show Map ID after successful save
        showMapIdDialog(mapId) {
            const isExpress = CoopMaps.isExpressMode;

            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 450px;
                width: 90%;
                text-align: center;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            dialog.innerHTML = `
                <div style="
                    width: 60px; height: 60px;
                    background: ${isExpress ? '#27ae60' : 'linear-gradient(135deg, #27ae60, #229954)'};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 15px;
                ">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #2c3e50;">Map Saved!</h2>
                <p style="color: #7f8c8d; margin: 0 0 20px 0; font-size: 14px;">
                    Share this Map ID and password with collaborators:
                </p>
                <div style="
                    background: #f8f9fa;
                    border: 2px solid #ecf0f1;
                    border-radius: ${isExpress ? '0' : '8px'};
                    padding: 15px;
                    margin-bottom: 20px;
                ">
                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">MAP ID</div>
                    <div id="mapIdDisplay" style="
                        font-family: monospace;
                        font-size: 14px;
                        color: #2c3e50;
                        word-break: break-all;
                        user-select: all;
                    ">${mapId}</div>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="copyMapIdBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Copy Map ID</button>
                    <button id="closeMapIdBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Close</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            const closeDialog = () => {
                backdrop.remove();
                dialog.remove();
            };

            document.getElementById('closeMapIdBtn').onclick = closeDialog;
            backdrop.onclick = closeDialog;

            document.getElementById('copyMapIdBtn').onclick = () => {
                navigator.clipboard.writeText(mapId).then(() => {
                    const btn = document.getElementById('copyMapIdBtn');
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.textContent = 'Copy Map ID';
                    }, 2000);
                });
            };
        },

        // Show dialog to load map from server
        showLoadFromServerDialog() {
            const isExpress = CoopMaps.isExpressMode;

            const backdrop = document.createElement('div');
            backdrop.id = 'loadServerBackdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.id = 'loadServerDialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: ${isExpress ? '#ecf0f1' : 'white'};
                border: ${isExpress ? '2px solid #7f8c8d' : 'none'};
                border-radius: ${isExpress ? '0' : '16px'};
                padding: ${isExpress ? '20px' : '30px'};
                max-width: 450px;
                width: 90%;
                box-shadow: ${isExpress ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)'};
                z-index: 10001;
            `;

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="
                        width: 60px; height: 60px;
                        background: ${isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 15px;
                    ">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </div>
                    <h2 style="margin: 0 0 5px 0; color: #2c3e50; font-size: ${isExpress ? '18px' : '22px'};">
                        Load Map from Server
                    </h2>
                    <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
                        Enter the Map ID shared with you
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Map ID
                    </label>
                    <input type="text" id="loadMapId" placeholder="e.g., a1b2c3d4-e5f6-..." style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        font-family: monospace;
                        box-sizing: border-box;
                    ">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                        Password (for editing)
                    </label>
                    <input type="password" id="loadMapPassword" placeholder="Enter password or leave blank for view-only" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                    <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                        Leave blank to view public maps in read-only mode
                    </div>
                </div>

                <div id="loadServerError" style="
                    color: #e74c3c;
                    font-size: 13px;
                    margin-bottom: 15px;
                    display: none;
                "></div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelLoadServerBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#ecf0f1' : 'white'};
                        color: #7f8c8d;
                        border: 2px solid #ecf0f1;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="confirmLoadServerBtn" style="
                        padding: 12px 24px;
                        background: ${isExpress ? '#3498db' : 'linear-gradient(135deg, #3498db, #2980b9)'};
                        color: white;
                        border: none;
                        border-radius: ${isExpress ? '0' : '8px'};
                        font-weight: 600;
                        cursor: pointer;
                    ">Load Map</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialog);

            document.getElementById('loadMapId').focus();

            const closeDialog = () => {
                backdrop.remove();
                dialog.remove();
            };

            document.getElementById('cancelLoadServerBtn').onclick = closeDialog;
            backdrop.onclick = closeDialog;

            document.getElementById('confirmLoadServerBtn').onclick = async () => {
                const errorEl = document.getElementById('loadServerError');
                const mapId = document.getElementById('loadMapId').value.trim();
                const password = document.getElementById('loadMapPassword').value;

                if (!mapId) {
                    errorEl.textContent = 'Please enter a Map ID';
                    errorEl.style.display = 'block';
                    return;
                }

                // Basic UUID validation
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(mapId)) {
                    errorEl.textContent = 'Invalid Map ID format';
                    errorEl.style.display = 'block';
                    return;
                }

                // Disable button and show loading
                const btn = document.getElementById('confirmLoadServerBtn');
                btn.disabled = true;
                btn.textContent = 'Loading...';

                try {
                    const result = await this.loadFromServer(mapId, password);

                    if (result.requiresPassword) {
                        errorEl.textContent = 'This map requires a password to view';
                        errorEl.style.display = 'block';
                        btn.disabled = false;
                        btn.textContent = 'Load Map';
                        return;
                    }

                    closeDialog();

                    if (CoopMaps.showNotification) {
                        const editMode = password ? '' : ' (read-only)';
                        CoopMaps.showNotification(`Map loaded successfully${editMode}`, 'success');
                    }

                    if (!password) {
                        this.showReadOnlyIndicator();
                    }

                } catch (error) {
                    errorEl.textContent = error.message || 'Failed to load map';
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Load Map';
                }
            };

            // Handle enter key
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('confirmLoadServerBtn').click();
                }
            });
        }
    });
})();
