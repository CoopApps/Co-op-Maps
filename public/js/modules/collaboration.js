/**
 * Co-op Maps - Collaboration Module
 * Password-based map protection for collaborative editing
 */

(function() {
    'use strict';

    CoopMaps.registerModule('collaboration', {
        isUnlocked: false,
        currentPassword: null,

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

        // Verify password against stored hash
        async verifyPassword(password, storedHash) {
            const hash = await this.hashPassword(password);
            return hash === storedHash;
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
        }
    });
})();
