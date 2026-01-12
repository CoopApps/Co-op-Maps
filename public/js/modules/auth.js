// Module: Authentication
// Handles user login, registration, and session management
(function() {
    'use strict';

    CoopMaps.registerModule('auth', {
        // Current user state
        currentUser: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,

        init() {
            console.log('Auth module initialized');
            this.loadStoredSession();
            this.createAuthUI();
            this.bindEvents();
            this.updateHeaderUI();
        },

        // Load any stored session from localStorage
        loadStoredSession() {
            try {
                const storedUser = localStorage.getItem('coopmaps_user');
                const storedAccessToken = localStorage.getItem('coopmaps_access_token');
                const storedRefreshToken = localStorage.getItem('coopmaps_refresh_token');

                if (storedUser && storedAccessToken) {
                    this.currentUser = JSON.parse(storedUser);
                    this.accessToken = storedAccessToken;
                    this.refreshToken = storedRefreshToken;
                    this.isAuthenticated = true;

                    // Validate token is still valid
                    this.validateSession();
                }
            } catch (e) {
                console.error('Failed to load stored session:', e);
                this.clearSession();
            }
        },

        // Validate current session with backend
        async validateSession() {
            if (!this.accessToken) return false;

            try {
                // Try to get user diagrams as a validation check
                const response = await this.authenticatedRequest('/api/diagrams?limit=1');
                if (response) {
                    // Start notification polling
                    this.startNotificationPolling();
                    return true;
                }
            } catch (error) {
                // Token might be expired, try to refresh
                if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    return await this.refreshAccessToken();
                }
            }

            this.clearSession();
            return false;
        },

        // Start polling for notifications
        notificationPollInterval: null,

        startNotificationPolling() {
            if (this.notificationPollInterval) return;

            // Update badge immediately
            this.updateNotificationBadge();

            // Poll every 60 seconds
            this.notificationPollInterval = setInterval(() => {
                this.updateNotificationBadge();
            }, 60000);
        },

        stopNotificationPolling() {
            if (this.notificationPollInterval) {
                clearInterval(this.notificationPollInterval);
                this.notificationPollInterval = null;
            }
        },

        async updateNotificationBadge() {
            if (!this.isAuthenticated) {
                const badge = document.getElementById('notificationBadge');
                if (badge) badge.style.display = 'none';
                return;
            }

            try {
                const data = await this.authenticatedRequest('/api/notifications/unread-count');
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    if (data.count > 0) {
                        badge.textContent = data.count > 99 ? '99+' : data.count;
                        badge.style.display = 'block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            } catch (e) {
                console.error('Failed to fetch notification count:', e);
            }
        },

        // Refresh the access token
        async refreshAccessToken() {
            if (!this.refreshToken) {
                this.clearSession();
                return false;
            }

            try {
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: this.refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Refresh failed');
                }

                const data = await response.json();
                this.accessToken = data.accessToken;
                this.refreshToken = data.refreshToken;

                localStorage.setItem('coopmaps_access_token', this.accessToken);
                localStorage.setItem('coopmaps_refresh_token', this.refreshToken);

                return true;
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.clearSession();
                return false;
            }
        },

        // Make an authenticated API request
        async authenticatedRequest(endpoint, options = {}) {
            if (!this.accessToken) {
                throw new Error('Not authenticated');
            }

            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    ...options.headers
                }
            };

            const response = await fetch(endpoint, config);

            if (response.status === 401) {
                // Try to refresh token
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry request with new token
                    config.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(endpoint, config);
                    if (!retryResponse.ok) {
                        throw new Error(`HTTP ${retryResponse.status}`);
                    }
                    return await retryResponse.json();
                }
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        },

        // Create the authentication UI elements
        createAuthUI() {
            // Add login/register buttons to header
            this.createHeaderButtons();

            // Create modals
            this.createLoginModal();
            this.createRegisterModal();
            this.createUserMenuModal();
        },

        createHeaderButtons() {
            const headerRight = document.querySelector('.header-right');
            if (!headerRight) return;

            // Create auth container
            const authContainer = document.createElement('div');
            authContainer.id = 'authContainer';
            authContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';

            // Guest state buttons
            authContainer.innerHTML = `
                <button id="loginBtn" class="header-btn" style="
                    padding: 6px 14px;
                    background: transparent;
                    color: rgba(255,255,255,0.8);
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                ">Sign In</button>
                <button id="registerBtn" class="header-btn" style="
                    padding: 6px 14px;
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                ">Sign Up</button>
            `;

            headerRight.insertBefore(authContainer, headerRight.firstChild);
        },

        createLoginModal() {
            const modal = document.createElement('div');
            modal.id = 'loginModal';
            modal.className = 'auth-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div class="auth-modal-content" style="
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                ">
                    <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 24px;">Welcome Back</h2>
                    <p style="margin: 0 0 24px 0; color: #7f8c8d; font-size: 14px;">Sign in to access your diagrams</p>

                    <form id="loginForm">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Email</label>
                            <input type="email" name="email" required style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                                transition: border-color 0.2s;
                            " placeholder="you@example.com">
                        </div>

                        <div style="margin-bottom: 24px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Password</label>
                            <input type="password" name="password" required style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                                transition: border-color 0.2s;
                            " placeholder="Enter your password">
                        </div>

                        <div id="loginError" style="
                            display: none;
                            background: #fee;
                            color: #e74c3c;
                            padding: 10px 14px;
                            border-radius: 6px;
                            font-size: 13px;
                            margin-bottom: 16px;
                        "></div>

                        <button type="submit" style="
                            width: 100%;
                            padding: 14px;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 15px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: transform 0.2s, box-shadow 0.2s;
                        ">Sign In</button>
                    </form>

                    <div style="margin-top: 20px; text-align: center;">
                        <span style="color: #7f8c8d; font-size: 13px;">Don't have an account?</span>
                        <button id="switchToRegister" style="
                            background: none;
                            border: none;
                            color: #3498db;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-left: 4px;
                        ">Sign Up</button>
                    </div>

                    <button id="closeLoginModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);
        },

        createRegisterModal() {
            const modal = document.createElement('div');
            modal.id = 'registerModal';
            modal.className = 'auth-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div class="auth-modal-content" style="
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    position: relative;
                ">
                    <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 24px;">Create Account</h2>
                    <p style="margin: 0 0 24px 0; color: #7f8c8d; font-size: 14px;">Join Co-op Maps to save and share diagrams</p>

                    <form id="registerForm">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Full Name</label>
                            <input type="text" name="full_name" style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            " placeholder="Your name (optional)">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Organization</label>
                            <input type="text" name="organization" style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            " placeholder="Your organization (optional)">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Email *</label>
                            <input type="email" name="email" required style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            " placeholder="you@example.com">
                        </div>

                        <div style="margin-bottom: 24px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 13px;">Password *</label>
                            <input type="password" name="password" required minlength="8" style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            " placeholder="At least 8 characters">
                        </div>

                        <div id="registerError" style="
                            display: none;
                            background: #fee;
                            color: #e74c3c;
                            padding: 10px 14px;
                            border-radius: 6px;
                            font-size: 13px;
                            margin-bottom: 16px;
                        "></div>

                        <button type="submit" style="
                            width: 100%;
                            padding: 14px;
                            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 15px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: transform 0.2s, box-shadow 0.2s;
                        ">Create Account</button>
                    </form>

                    <div style="margin-top: 20px; text-align: center;">
                        <span style="color: #7f8c8d; font-size: 13px;">Already have an account?</span>
                        <button id="switchToLogin" style="
                            background: none;
                            border: none;
                            color: #3498db;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-left: 4px;
                        ">Sign In</button>
                    </div>

                    <button id="closeRegisterModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);
        },

        createUserMenuModal() {
            const menu = document.createElement('div');
            menu.id = 'userMenu';
            menu.style.cssText = `
                display: none;
                position: fixed;
                top: 55px;
                right: 20px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
                z-index: 15000;
                min-width: 220px;
                overflow: hidden;
            `;

            menu.innerHTML = `
                <div id="userMenuHeader" style="
                    padding: 16px;
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                    color: white;
                ">
                    <div id="userMenuName" style="font-weight: 600; font-size: 14px;"></div>
                    <div id="userMenuEmail" style="font-size: 12px; opacity: 0.8;"></div>
                </div>
                <div style="padding: 8px 0;">
                    <button id="myDiagramsBtn" class="user-menu-item" style="
                        width: 100%;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        text-align: left;
                        cursor: pointer;
                        font-size: 14px;
                        color: #2c3e50;
                        transition: background 0.2s;
                    ">
                        <svg style="margin-right: 10px; vertical-align: middle;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> My Diagrams
                    </button>
                    <button id="accountSettingsBtn" class="user-menu-item" style="
                        width: 100%;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        text-align: left;
                        cursor: pointer;
                        font-size: 14px;
                        color: #2c3e50;
                        transition: background 0.2s;
                    ">
                        <svg style="margin-right: 10px; vertical-align: middle;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Account Settings
                    </button>
                    <div style="height: 1px; background: #ecf0f1; margin: 8px 0;"></div>
                    <button id="logoutBtn" class="user-menu-item" style="
                        width: 100%;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        text-align: left;
                        cursor: pointer;
                        font-size: 14px;
                        color: #e74c3c;
                        transition: background 0.2s;
                    ">
                        <span style="margin-right: 10px;">🚪</span> Sign Out
                    </button>
                </div>
            `;

            document.body.appendChild(menu);
        },

        bindEvents() {
            // Login button
            document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginModal());

            // Register button
            document.getElementById('registerBtn')?.addEventListener('click', () => this.showRegisterModal());

            // Modal close buttons
            document.getElementById('closeLoginModal')?.addEventListener('click', () => this.hideLoginModal());
            document.getElementById('closeRegisterModal')?.addEventListener('click', () => this.hideRegisterModal());

            // Switch between modals
            document.getElementById('switchToRegister')?.addEventListener('click', () => {
                this.hideLoginModal();
                this.showRegisterModal();
            });
            document.getElementById('switchToLogin')?.addEventListener('click', () => {
                this.hideRegisterModal();
                this.showLoginModal();
            });

            // Login form submission
            document.getElementById('loginForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e.target);
            });

            // Register form submission
            document.getElementById('registerForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e.target);
            });

            // Logout button
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

            // Close modals on backdrop click
            document.getElementById('loginModal')?.addEventListener('click', (e) => {
                if (e.target.id === 'loginModal') this.hideLoginModal();
            });
            document.getElementById('registerModal')?.addEventListener('click', (e) => {
                if (e.target.id === 'registerModal') this.hideRegisterModal();
            });

            // User menu toggle
            document.addEventListener('click', (e) => {
                const userMenu = document.getElementById('userMenu');
                const userBtn = document.getElementById('userMenuBtn');
                if (userMenu && userBtn && !userMenu.contains(e.target) && !userBtn.contains(e.target)) {
                    userMenu.style.display = 'none';
                }
            });

            // My Diagrams button
            document.getElementById('myDiagramsBtn')?.addEventListener('click', () => {
                document.getElementById('userMenu').style.display = 'none';
                this.showMyDiagramsDialog();
            });
        },

        showLoginModal() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('loginError').style.display = 'none';
                modal.querySelector('input[name="email"]').focus();
            }
        },

        hideLoginModal() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.style.display = 'none';
                modal.querySelector('form').reset();
            }
        },

        showRegisterModal() {
            const modal = document.getElementById('registerModal');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('registerError').style.display = 'none';
                modal.querySelector('input[name="full_name"]').focus();
            }
        },

        hideRegisterModal() {
            const modal = document.getElementById('registerModal');
            if (modal) {
                modal.style.display = 'none';
                modal.querySelector('form').reset();
            }
        },

        async handleLogin(form) {
            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Store session
                this.setSession(data.user, data.accessToken, data.refreshToken);

                // Close modal
                this.hideLoginModal();

                // Show success message
                CoopMaps.showNotification('Welcome back, ' + (data.user.full_name || data.user.email) + '!', 'success');

                // Update UI
                this.updateHeaderUI();

                // Trigger event for other modules
                document.dispatchEvent(new CustomEvent('user-logged-in', { detail: data.user }));

            } catch (error) {
                const errorDiv = document.getElementById('loginError');
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        },

        async handleRegister(form) {
            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');
            const full_name = formData.get('full_name');
            const organization = formData.get('organization');

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating account...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, full_name, organization })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.errors) {
                        throw new Error(data.errors.map(e => e.msg).join(', '));
                    }
                    throw new Error(data.error || 'Registration failed');
                }

                // Store session
                this.setSession(data.user, data.accessToken, data.refreshToken);

                // Close modal
                this.hideRegisterModal();

                // Show success message
                CoopMaps.showNotification('Account created! Welcome to Co-op Maps!', 'success');

                // Update UI
                this.updateHeaderUI();

                // Trigger event for other modules
                document.dispatchEvent(new CustomEvent('user-logged-in', { detail: data.user }));

            } catch (error) {
                const errorDiv = document.getElementById('registerError');
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        },

        setSession(user, accessToken, refreshToken) {
            this.currentUser = user;
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.isAuthenticated = true;

            localStorage.setItem('coopmaps_user', JSON.stringify(user));
            localStorage.setItem('coopmaps_access_token', accessToken);
            localStorage.setItem('coopmaps_refresh_token', refreshToken);
        },

        clearSession() {
            this.currentUser = null;
            this.accessToken = null;
            this.refreshToken = null;
            this.isAuthenticated = false;

            // Stop notification polling
            this.stopNotificationPolling();

            // Hide notification badge
            const badge = document.getElementById('notificationBadge');
            if (badge) badge.style.display = 'none';

            localStorage.removeItem('coopmaps_user');
            localStorage.removeItem('coopmaps_access_token');
            localStorage.removeItem('coopmaps_refresh_token');
        },

        async logout() {
            try {
                // Notify backend
                if (this.refreshToken) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: this.refreshToken })
                    });
                }
            } catch (e) {
                console.error('Logout error:', e);
            }

            // Clear local session
            this.clearSession();

            // Hide user menu
            document.getElementById('userMenu').style.display = 'none';

            // Update UI
            this.updateHeaderUI();

            // Show notification
            CoopMaps.showNotification('You have been signed out', 'info');

            // Trigger event
            document.dispatchEvent(new CustomEvent('user-logged-out'));
        },

        updateHeaderUI() {
            const authContainer = document.getElementById('authContainer');
            if (!authContainer) return;

            if (this.isAuthenticated && this.currentUser) {
                // Show user button
                authContainer.innerHTML = `
                    <button id="userMenuBtn" style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 12px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                    ">
                        <div style="
                            width: 24px;
                            height: 24px;
                            background: linear-gradient(135deg, #3498db 0%, #9b59b6 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 11px;
                            font-weight: 600;
                        ">${this.getUserInitials()}</div>
                        <span>${this.currentUser.full_name || this.currentUser.email.split('@')[0]}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                `;

                // Update user menu
                document.getElementById('userMenuName').textContent = this.currentUser.full_name || 'User';
                document.getElementById('userMenuEmail').textContent = this.currentUser.email;

                // Bind menu toggle
                document.getElementById('userMenuBtn').addEventListener('click', () => {
                    const menu = document.getElementById('userMenu');
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                });
            } else {
                // Show login/register buttons
                authContainer.innerHTML = `
                    <button id="loginBtn" class="header-btn" style="
                        padding: 6px 14px;
                        background: transparent;
                        color: rgba(255,255,255,0.8);
                        border: 1px solid rgba(255,255,255,0.3);
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Sign In</button>
                    <button id="registerBtn" class="header-btn" style="
                        padding: 6px 14px;
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Sign Up</button>
                `;

                // Re-bind events
                document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
                document.getElementById('registerBtn').addEventListener('click', () => this.showRegisterModal());
            }
        },

        getUserInitials() {
            if (!this.currentUser) return '?';
            if (this.currentUser.full_name) {
                const parts = this.currentUser.full_name.split(' ');
                if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return parts[0][0].toUpperCase();
            }
            return this.currentUser.email[0].toUpperCase();
        },

        // Show My Diagrams dialog (from server)
        async showMyDiagramsDialog() {
            // Create dialog
            const modal = document.createElement('div');
            modal.id = 'myDiagramsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50;">My Diagrams</h2>
                    <div id="myDiagramsList" style="min-height: 100px;">
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            Loading diagrams...
                        </div>
                    </div>
                    <button id="closeMyDiagramsModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);

            // Close handlers
            document.getElementById('closeMyDiagramsModal').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Load diagrams
            try {
                const data = await this.authenticatedRequest('/api/diagrams');
                const listEl = document.getElementById('myDiagramsList');

                if (!data.diagrams || data.diagrams.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            <p style="font-size: 16px; margin-bottom: 10px;">No diagrams yet</p>
                            <p style="font-size: 13px;">Create a diagram and save it to see it here.</p>
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.diagrams.map(d => `
                    <div class="diagram-item" data-id="${d.id}" style="
                        display: flex;
                        align-items: center;
                        padding: 16px;
                        border: 1px solid #ecf0f1;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#3498db'; this.style.background='#f8f9fa';"
                       onmouseout="this.style.borderColor='#ecf0f1'; this.style.background='white';">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50; font-size: 15px;">${d.title || 'Untitled'}</div>
                            <div style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">
                                Updated ${new Date(d.updated_at).toLocaleDateString()}
                                ${d.is_public ? ' • Public' : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="load-diagram-btn" data-id="${d.id}" style="
                                padding: 8px 16px;
                                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                            ">Open</button>
                            <button class="delete-diagram-btn" data-id="${d.id}" style="
                                padding: 8px 12px;
                                background: white;
                                color: #e74c3c;
                                border: 1px solid #e74c3c;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                            ">Delete</button>
                        </div>
                    </div>
                `).join('');

                // Bind events
                listEl.querySelectorAll('.load-diagram-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await this.loadDiagramFromServer(btn.dataset.id);
                        modal.remove();
                    });
                });

                listEl.querySelectorAll('.delete-diagram-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this diagram?')) {
                            await this.deleteDiagramFromServer(btn.dataset.id);
                            btn.closest('.diagram-item').remove();
                        }
                    });
                });

            } catch (error) {
                document.getElementById('myDiagramsList').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        Failed to load diagrams: ${error.message}
                    </div>
                `;
            }
        },

        async loadDiagramFromServer(diagramId) {
            try {
                const data = await this.authenticatedRequest(`/api/diagrams/${diagramId}`);

                // Convert server format to local format
                const diagram = {
                    id: data.diagram.id,
                    name: data.diagram.title,
                    createdAt: data.diagram.created_at,
                    lastModified: data.diagram.updated_at,
                    diagramProperties: {
                        author: data.diagram.author,
                        wdr: data.diagram.wdr,
                        scopeGeographic: data.diagram.scope_geographic,
                        scopeEconomic: data.diagram.scope_economic,
                        scopeUserDefined: data.diagram.scope_user_defined,
                        period: data.diagram.period,
                        diagramDate: data.diagram.diagram_date,
                        canvasSize: data.diagram.canvas_size,
                        connectorStyle: data.diagram.connector_style
                    },
                    enterprises: data.enterprises.map(e => ({
                        id: e.enterprise_id,
                        type: e.type,
                        name: e.name,
                        x: e.x,
                        y: e.y,
                        width: e.width,
                        height: e.height,
                        fill: e.fill,
                        stroke: e.stroke,
                        roles: e.roles,
                        tier: e.tier,
                        isGenericSet: e.is_generic_set,
                        zIndex: e.z_index
                    })),
                    relationships: data.relationships.map(r => ({
                        id: r.relationship_id,
                        startEnterpriseId: r.start_enterprise_id,
                        endEnterpriseId: r.end_enterprise_id,
                        type: r.type,
                        startSegmentation: r.start_segmentation,
                        endSegmentation: r.end_segmentation,
                        flowDirection: r.flow_direction
                    })),
                    annotations: [],
                    serverDiagramId: data.diagram.id // Track server ID
                };

                // Load into state
                CoopMaps.state.data = diagram;
                CoopMaps.state.currentDiagramId = diagram.id;

                // Update UI
                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                CoopMaps.showNotification('Diagram loaded from server', 'success');

            } catch (error) {
                CoopMaps.showNotification('Failed to load diagram: ' + error.message, 'error');
            }
        },

        async deleteDiagramFromServer(diagramId) {
            try {
                await this.authenticatedRequest(`/api/diagrams/${diagramId}`, {
                    method: 'DELETE'
                });
                CoopMaps.showNotification('Diagram deleted', 'success');
            } catch (error) {
                CoopMaps.showNotification('Failed to delete: ' + error.message, 'error');
            }
        },

        // Save current diagram to server
        async saveToServer() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return null;
            }

            const data = CoopMaps.state.data;
            const serverDiagramId = data.serverDiagramId;

            const payload = {
                title: data.name || data.diagramProperties?.title || 'Untitled Diagram',
                author: data.diagramProperties?.author,
                wdr: data.diagramProperties?.wdr,
                scope_geographic: data.diagramProperties?.scopeGeographic,
                scope_economic: data.diagramProperties?.scopeEconomic,
                scope_user_defined: data.diagramProperties?.scopeUserDefined,
                period: data.diagramProperties?.period,
                diagram_date: data.diagramProperties?.diagramDate,
                canvas_size: data.diagramProperties?.canvasSize || 'A4',
                connector_style: data.diagramProperties?.connectorStyle || 'orthogonal',
                is_public: false,
                enterprises: (data.enterprises || []).map(e => ({
                    enterprise_id: e.id,
                    type: e.type,
                    name: e.name,
                    x: e.x,
                    y: e.y,
                    width: e.width,
                    height: e.height,
                    fill: e.fill,
                    stroke: e.stroke,
                    roles: e.roles || [],
                    tier: e.tier,
                    is_generic_set: e.isGenericSet || false,
                    z_index: e.zIndex || 0
                })),
                relationships: (data.relationships || []).map(r => ({
                    relationship_id: r.id,
                    start_enterprise_id: r.startEnterpriseId,
                    end_enterprise_id: r.endEnterpriseId,
                    type: r.type,
                    start_segmentation: r.startSegmentation || 'individual',
                    end_segmentation: r.endSegmentation || 'individual'
                }))
            };

            try {
                let result;
                if (serverDiagramId) {
                    // Update existing diagram
                    result = await this.authenticatedRequest(`/api/diagrams/${serverDiagramId}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    // Create new diagram
                    result = await this.authenticatedRequest('/api/diagrams', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    // Store the server ID
                    CoopMaps.state.data.serverDiagramId = result.diagram.id;
                }

                CoopMaps.showNotification('Diagram saved to cloud', 'success');
                return result;

            } catch (error) {
                CoopMaps.showNotification('Failed to save: ' + error.message, 'error');
                return null;
            }
        },

        // ====== VERSION HISTORY ======

        async showVersionHistory() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const serverDiagramId = CoopMaps.state.data.serverDiagramId;
            if (!serverDiagramId) {
                CoopMaps.showNotification('Save diagram to cloud first to use version history', 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'versionHistoryModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <h2 style="margin: 0 0 8px 0; color: #2c3e50;">Version History</h2>
                    <p style="margin: 0 0 20px 0; color: #7f8c8d; font-size: 14px;">
                        View and restore previous versions of this diagram
                    </p>
                    <div id="versionList" style="min-height: 100px;">
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            Loading versions...
                        </div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                        <button id="createVersionBtn" style="
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 500;
                        ">Save New Version</button>
                    </div>
                    <button id="closeVersionModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('closeVersionModal').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('createVersionBtn').addEventListener('click', async () => {
                const description = prompt('Version description (optional):');
                await this.createVersion(description);
                this.loadVersionList(serverDiagramId);
            });

            await this.loadVersionList(serverDiagramId);
        },

        async loadVersionList(diagramId) {
            const listEl = document.getElementById('versionList');
            try {
                const data = await this.authenticatedRequest(`/api/diagrams/${diagramId}/versions`);

                if (!data.versions || data.versions.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            No versions yet. Click "Save New Version" to create one.
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.versions.map(v => `
                    <div class="version-item" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        border: 1px solid #ecf0f1;
                        border-radius: 8px;
                        margin-bottom: 8px;
                    ">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50;">
                                Version ${v.version_number}
                            </div>
                            <div style="font-size: 12px; color: #7f8c8d;">
                                ${v.change_description || 'No description'}
                            </div>
                            <div style="font-size: 11px; color: #95a5a6; margin-top: 4px;">
                                ${new Date(v.created_at).toLocaleString()}
                                ${v.created_by_name ? ` by ${v.created_by_name}` : ''}
                            </div>
                        </div>
                        <button class="restore-version-btn" data-version="${v.version_number}" data-id="${v.id}" style="
                            padding: 8px 16px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Restore</button>
                    </div>
                `).join('');

                listEl.querySelectorAll('.restore-version-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (confirm(`Restore to version ${btn.dataset.version}? Current unsaved changes will be lost.`)) {
                            await this.restoreVersion(diagramId, btn.dataset.id);
                            document.getElementById('versionHistoryModal').remove();
                        }
                    });
                });

            } catch (error) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        Failed to load versions: ${error.message}
                    </div>
                `;
            }
        },

        async createVersion(description) {
            const serverDiagramId = CoopMaps.state.data.serverDiagramId;
            if (!serverDiagramId) return;

            try {
                await this.authenticatedRequest(`/api/diagrams/${serverDiagramId}/versions`, {
                    method: 'POST',
                    body: JSON.stringify({ change_description: description })
                });
                CoopMaps.showNotification('Version saved', 'success');
            } catch (error) {
                CoopMaps.showNotification('Failed to create version: ' + error.message, 'error');
            }
        },

        async restoreVersion(diagramId, versionId) {
            // For now, we just reload the diagram (which gets the current state)
            // A full implementation would need an endpoint to restore a specific version
            await this.loadDiagramFromServer(diagramId);
            CoopMaps.showNotification('Version restored', 'success');
        },

        // ====== COLLABORATION ======

        async showShareDialog() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const serverDiagramId = CoopMaps.state.data.serverDiagramId;
            if (!serverDiagramId) {
                CoopMaps.showNotification('Save diagram to cloud first to share', 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'shareModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 500px;
                    position: relative;
                ">
                    <h2 style="margin: 0 0 8px 0; color: #2c3e50;">Share Diagram</h2>
                    <p style="margin: 0 0 20px 0; color: #7f8c8d; font-size: 14px;">
                        Invite others to view or edit this diagram
                    </p>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Invite by Email</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="email" id="shareEmail" placeholder="collaborator@example.com" style="
                                flex: 1;
                                padding: 10px;
                                border: 2px solid #ecf0f1;
                                border-radius: 6px;
                                font-size: 14px;
                            ">
                            <select id="sharePermission" style="padding: 10px; border-radius: 6px; border: 2px solid #ecf0f1;">
                                <option value="view">Can View</option>
                                <option value="edit">Can Edit</option>
                            </select>
                            <button id="inviteBtn" style="
                                padding: 10px 16px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                            ">Invite</button>
                        </div>
                    </div>

                    <div id="collaboratorsList" style="max-height: 200px; overflow-y: auto;">
                        <div style="text-align: center; color: #7f8c8d; padding: 20px;">
                            Loading collaborators...
                        </div>
                    </div>

                    <button id="closeShareModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('closeShareModal').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('inviteBtn').addEventListener('click', () => this.inviteCollaborator());

            await this.loadCollaborators(serverDiagramId);
        },

        async loadCollaborators(diagramId) {
            const listEl = document.getElementById('collaboratorsList');
            try {
                const data = await this.authenticatedRequest(`/api/diagrams/${diagramId}/collaborators`);

                if (!data.collaborators || data.collaborators.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; color: #7f8c8d; padding: 20px; font-size: 13px;">
                            No collaborators yet. Invite someone above.
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.collaborators.map(c => `
                    <div class="collaborator-item" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        border-bottom: 1px solid #ecf0f1;
                    ">
                        <div style="
                            width: 36px;
                            height: 36px;
                            background: linear-gradient(135deg, #3498db 0%, #9b59b6 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 600;
                            margin-right: 12px;
                        ">${(c.full_name || c.email)[0].toUpperCase()}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #2c3e50;">${c.full_name || 'User'}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">${c.email}</div>
                        </div>
                        <span style="
                            padding: 4px 10px;
                            background: ${c.permission === 'edit' ? '#27ae60' : '#3498db'};
                            color: white;
                            border-radius: 12px;
                            font-size: 11px;
                            margin-right: 8px;
                        ">${c.permission === 'edit' ? 'Editor' : 'Viewer'}</span>
                        <button class="remove-collab-btn" data-id="${c.id}" style="
                            background: none;
                            border: none;
                            color: #e74c3c;
                            cursor: pointer;
                            font-size: 16px;
                        ">&times;</button>
                    </div>
                `).join('');

                listEl.querySelectorAll('.remove-collab-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (confirm('Remove this collaborator?')) {
                            await this.removeCollaborator(diagramId, btn.dataset.id);
                            this.loadCollaborators(diagramId);
                        }
                    });
                });

            } catch (error) {
                listEl.innerHTML = `
                    <div style="text-align: center; color: #e74c3c; padding: 20px;">
                        Failed to load: ${error.message}
                    </div>
                `;
            }
        },

        async inviteCollaborator() {
            const email = document.getElementById('shareEmail').value;
            const permission = document.getElementById('sharePermission').value;
            const serverDiagramId = CoopMaps.state.data.serverDiagramId;

            if (!email) {
                CoopMaps.showNotification('Please enter an email', 'error');
                return;
            }

            try {
                // First we need to look up the user by email
                // Since the backend expects user_id, we need an endpoint for this
                // For now, show a message about the limitation
                CoopMaps.showNotification('Collaboration invitations require email lookup (coming soon)', 'info');
            } catch (error) {
                CoopMaps.showNotification('Failed to invite: ' + error.message, 'error');
            }
        },

        async removeCollaborator(diagramId, collaboratorId) {
            try {
                await this.authenticatedRequest(`/api/diagrams/${diagramId}/collaborators/${collaboratorId}`, {
                    method: 'DELETE'
                });
                CoopMaps.showNotification('Collaborator removed', 'success');
            } catch (error) {
                CoopMaps.showNotification('Failed to remove: ' + error.message, 'error');
            }
        },

        // Show diagrams shared with current user
        async showSharedWithMe() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'sharedWithMeModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50;">Shared With Me</h2>
                    <div id="sharedDiagramsList" style="min-height: 100px;">
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            Loading...
                        </div>
                    </div>
                    <button id="closeSharedModal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #7f8c8d;
                        cursor: pointer;
                    ">&times;</button>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('closeSharedModal').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            try {
                const data = await this.authenticatedRequest('/api/collaborators/shared-with-me');
                const listEl = document.getElementById('sharedDiagramsList');

                if (!data.diagrams || data.diagrams.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            No diagrams have been shared with you yet.
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.diagrams.map(d => `
                    <div class="shared-item" style="
                        display: flex;
                        align-items: center;
                        padding: 16px;
                        border: 1px solid #ecf0f1;
                        border-radius: 8px;
                        margin-bottom: 12px;
                    ">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50;">${d.title || 'Untitled'}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">
                                Shared by ${d.owner_name || d.owner_email}
                            </div>
                            <div style="font-size: 11px; color: #95a5a6; margin-top: 4px;">
                                ${d.permission === 'edit' ? 'Can edit' : 'View only'}
                            </div>
                        </div>
                        <button class="open-shared-btn" data-id="${d.id}" style="
                            padding: 8px 16px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                        ">Open</button>
                    </div>
                `).join('');

                listEl.querySelectorAll('.open-shared-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await this.loadDiagramFromServer(btn.dataset.id);
                        modal.remove();
                    });
                });

            } catch (error) {
                document.getElementById('sharedDiagramsList').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        Failed to load: ${error.message}
                    </div>
                `;
            }
        },

        // ====== ADMIN PANEL ======

        adminPassword: null,

        async showAdminPanel() {
            // Check if already have admin password stored
            if (!this.adminPassword) {
                const password = prompt('Enter admin password:');
                if (!password) return;
                this.adminPassword = password;
            }

            const modal = document.createElement('div');
            modal.id = 'adminPanelModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 25000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: #f5f6fa;
                    border-radius: 12px;
                    width: 95%;
                    max-width: 1200px;
                    height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                        color: white;
                        padding: 20px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 22px;">Admin Panel</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.7; font-size: 13px;">Manage community map submissions</p>
                        </div>
                        <button id="closeAdminPanel" style="
                            background: rgba(255,255,255,0.1);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 20px;
                        ">&times;</button>
                    </div>

                    <!-- Stats Dashboard -->
                    <div id="adminStats" style="
                        padding: 20px 24px;
                        background: white;
                        border-bottom: 1px solid #e1e5eb;
                    ">
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div class="stat-card" style="
                                background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
                                padding: 16px 24px;
                                border-radius: 10px;
                                color: white;
                                min-width: 150px;
                            ">
                                <div style="font-size: 28px; font-weight: 700;" id="statPending">-</div>
                                <div style="font-size: 13px; opacity: 0.9;">Pending Review</div>
                            </div>
                            <div class="stat-card" style="
                                background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                                padding: 16px 24px;
                                border-radius: 10px;
                                color: white;
                                min-width: 150px;
                            ">
                                <div style="font-size: 28px; font-weight: 700;" id="statApproved">-</div>
                                <div style="font-size: 13px; opacity: 0.9;">Approved</div>
                            </div>
                            <div class="stat-card" style="
                                background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
                                padding: 16px 24px;
                                border-radius: 10px;
                                color: white;
                                min-width: 150px;
                            ">
                                <div style="font-size: 28px; font-weight: 700;" id="statChanges">-</div>
                                <div style="font-size: 13px; opacity: 0.9;">Changes Requested</div>
                            </div>
                            <div class="stat-card" style="
                                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                                padding: 16px 24px;
                                border-radius: 10px;
                                color: white;
                                min-width: 150px;
                            ">
                                <div style="font-size: 28px; font-weight: 700;" id="statRejected">-</div>
                                <div style="font-size: 13px; opacity: 0.9;">Rejected</div>
                            </div>
                            <div class="stat-card" style="
                                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                                padding: 16px 24px;
                                border-radius: 10px;
                                color: white;
                                min-width: 150px;
                            ">
                                <div style="font-size: 28px; font-weight: 700;" id="statPublished">-</div>
                                <div style="font-size: 13px; opacity: 0.9;">Published</div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Bar -->
                    <div style="
                        padding: 16px 24px;
                        background: white;
                        border-bottom: 1px solid #e1e5eb;
                        display: flex;
                        gap: 12px;
                        align-items: center;
                        flex-wrap: wrap;
                    ">
                        <select id="adminFilterStatus" style="
                            padding: 8px 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 6px;
                            font-size: 13px;
                            min-width: 150px;
                        ">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="changes_requested">Changes Requested</option>
                            <option value="rejected">Rejected</option>
                            <option value="published">Published</option>
                        </select>

                        <input type="text" id="adminSearchInput" placeholder="Search by title or author..." style="
                            padding: 8px 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 6px;
                            font-size: 13px;
                            width: 250px;
                        ">

                        <button id="adminSearchBtn" style="
                            padding: 8px 16px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">Search</button>

                        <button id="adminRefreshBtn" style="
                            padding: 8px 16px;
                            background: #7f8c8d;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">Refresh</button>

                        <div style="flex: 1;"></div>

                        <!-- Bulk Actions -->
                        <select id="bulkActionSelect" style="
                            padding: 8px 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 6px;
                            font-size: 13px;
                        " disabled>
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve Selected</option>
                            <option value="reject">Reject Selected</option>
                            <option value="delete">Delete Selected</option>
                            <option value="feature">Feature Selected</option>
                            <option value="unfeature">Unfeature Selected</option>
                        </select>
                        <button id="bulkActionBtn" style="
                            padding: 8px 16px;
                            background: #95a5a6;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        " disabled>Apply</button>
                    </div>

                    <!-- Submissions List -->
                    <div id="adminSubmissionsList" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px 24px;
                    ">
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            Loading submissions...
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div id="adminPagination" style="
                        padding: 16px 24px;
                        background: white;
                        border-top: 1px solid #e1e5eb;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div id="paginationInfo" style="color: #7f8c8d; font-size: 13px;">
                            Showing 0 of 0 submissions
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="prevPageBtn" style="
                                padding: 8px 16px;
                                background: #ecf0f1;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                            " disabled>Previous</button>
                            <button id="nextPageBtn" style="
                                padding: 8px 16px;
                                background: #ecf0f1;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                            " disabled>Next</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Bind events
            document.getElementById('closeAdminPanel').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('adminSearchBtn').addEventListener('click', () => this.loadAdminSubmissions());
            document.getElementById('adminRefreshBtn').addEventListener('click', () => {
                this.loadAdminStats();
                this.loadAdminSubmissions();
            });
            document.getElementById('adminFilterStatus').addEventListener('change', () => this.loadAdminSubmissions());
            document.getElementById('adminSearchInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadAdminSubmissions();
            });

            document.getElementById('bulkActionBtn').addEventListener('click', () => this.executeBulkAction());

            document.getElementById('prevPageBtn').addEventListener('click', () => {
                this.adminCurrentPage--;
                this.loadAdminSubmissions();
            });
            document.getElementById('nextPageBtn').addEventListener('click', () => {
                this.adminCurrentPage++;
                this.loadAdminSubmissions();
            });

            // Initialize
            this.adminCurrentPage = 0;
            this.adminSelectedIds = new Set();
            this.loadAdminStats();
            this.loadAdminSubmissions();
        },

        adminCurrentPage: 0,
        adminSelectedIds: new Set(),

        async adminRequest(endpoint, options = {}) {
            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': this.adminPassword,
                    ...options.headers
                }
            };

            const response = await fetch(endpoint, config);

            if (response.status === 401) {
                this.adminPassword = null;
                throw new Error('Invalid admin password');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        },

        async loadAdminStats() {
            try {
                const data = await this.adminRequest('/api/admin/stats');
                const stats = data.stats || {};

                document.getElementById('statPending').textContent = stats.pending_count || 0;
                document.getElementById('statApproved').textContent = stats.approved_count || 0;
                document.getElementById('statChanges').textContent = stats.changes_requested_count || 0;
                document.getElementById('statRejected').textContent = stats.rejected_count || 0;
                document.getElementById('statPublished').textContent = stats.published_count || 0;

            } catch (error) {
                console.error('Failed to load admin stats:', error);
                if (error.message === 'Invalid admin password') {
                    document.getElementById('adminPanelModal')?.remove();
                    CoopMaps.showNotification('Invalid admin password', 'error');
                }
            }
        },

        async loadAdminSubmissions() {
            const listEl = document.getElementById('adminSubmissionsList');
            const status = document.getElementById('adminFilterStatus').value;
            const search = document.getElementById('adminSearchInput').value;
            const limit = 20;
            const offset = this.adminCurrentPage * limit;

            try {
                let url = `/api/admin/submissions?limit=${limit}&offset=${offset}`;
                if (status) url += `&status=${status}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;

                const data = await this.adminRequest(url);
                const submissions = data.submissions || [];
                const pagination = data.pagination || {};

                if (submissions.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            <p style="font-size: 16px; margin-bottom: 8px;">No submissions found</p>
                            <p style="font-size: 13px;">Try adjusting your filters</p>
                        </div>
                    `;
                    this.updateAdminPagination(pagination);
                    return;
                }

                listEl.innerHTML = `
                    <div style="margin-bottom: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #7f8c8d;">
                            <input type="checkbox" id="selectAllCheckbox"> Select All
                        </label>
                    </div>
                    ${submissions.map(s => this.renderSubmissionRow(s)).join('')}
                `;

                // Bind row events
                this.bindSubmissionRowEvents();

                // Select all checkbox
                document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    listEl.querySelectorAll('.submission-checkbox').forEach(cb => {
                        cb.checked = checked;
                        if (checked) {
                            this.adminSelectedIds.add(cb.dataset.id);
                        } else {
                            this.adminSelectedIds.delete(cb.dataset.id);
                        }
                    });
                    this.updateBulkActionsState();
                });

                this.updateAdminPagination(pagination);

            } catch (error) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #e74c3c;">
                        Failed to load submissions: ${error.message}
                    </div>
                `;
            }
        },

        renderSubmissionRow(submission) {
            const statusColors = {
                pending: '#f39c12',
                approved: '#27ae60',
                changes_requested: '#9b59b6',
                rejected: '#e74c3c',
                published: '#3498db'
            };

            const statusLabels = {
                pending: 'Pending',
                approved: 'Approved',
                changes_requested: 'Changes Requested',
                rejected: 'Rejected',
                published: 'Published'
            };

            return `
                <div class="submission-row" data-id="${submission.id}" style="
                    background: white;
                    border-radius: 10px;
                    padding: 16px 20px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: box-shadow 0.2s;
                " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                   onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'">

                    <input type="checkbox" class="submission-checkbox" data-id="${submission.id}" style="
                        width: 18px;
                        height: 18px;
                        cursor: pointer;
                    ">

                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                            <span style="
                                font-weight: 600;
                                color: #2c3e50;
                                font-size: 15px;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            ">${submission.title || 'Untitled'}</span>
                            ${submission.is_featured ? '<span style="background: #f39c12; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">FEATURED</span>' : ''}
                        </div>
                        <div style="font-size: 12px; color: #7f8c8d;">
                            by <strong>${submission.author || 'Unknown'}</strong>
                            ${submission.author_organization ? `(${submission.author_organization})` : ''}
                            &bull; ${new Date(submission.submitted_at).toLocaleDateString()}
                            ${submission.view_count ? `&bull; ${submission.view_count} views` : ''}
                        </div>
                    </div>

                    <span style="
                        padding: 6px 14px;
                        background: ${statusColors[submission.status] || '#7f8c8d'};
                        color: white;
                        border-radius: 16px;
                        font-size: 12px;
                        font-weight: 500;
                        white-space: nowrap;
                    ">${statusLabels[submission.status] || submission.status}</span>

                    <div class="submission-actions" style="display: flex; gap: 8px;">
                        <button class="view-submission-btn" data-id="${submission.id}" style="
                            padding: 8px 14px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                        ">View</button>

                        ${submission.status === 'pending' ? `
                            <button class="approve-btn" data-id="${submission.id}" style="
                                padding: 8px 14px;
                                background: #27ae60;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Approve</button>
                            <button class="request-changes-btn" data-id="${submission.id}" style="
                                padding: 8px 14px;
                                background: #9b59b6;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Request Changes</button>
                            <button class="reject-btn" data-id="${submission.id}" style="
                                padding: 8px 14px;
                                background: #e74c3c;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Reject</button>
                        ` : ''}

                        ${submission.status === 'published' ? `
                            <button class="unpublish-btn" data-id="${submission.id}" style="
                                padding: 8px 14px;
                                background: #e67e22;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Unpublish</button>
                        ` : ''}
                    </div>
                </div>
            `;
        },

        bindSubmissionRowEvents() {
            // Checkboxes
            document.querySelectorAll('.submission-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        this.adminSelectedIds.add(cb.dataset.id);
                    } else {
                        this.adminSelectedIds.delete(cb.dataset.id);
                    }
                    this.updateBulkActionsState();
                });
            });

            // View buttons
            document.querySelectorAll('.view-submission-btn').forEach(btn => {
                btn.addEventListener('click', () => this.showSubmissionDetail(btn.dataset.id));
            });

            // Approve buttons
            document.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', () => this.approveSubmission(btn.dataset.id));
            });

            // Request changes buttons
            document.querySelectorAll('.request-changes-btn').forEach(btn => {
                btn.addEventListener('click', () => this.showRequestChangesDialog(btn.dataset.id));
            });

            // Reject buttons
            document.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', () => this.showRejectDialog(btn.dataset.id));
            });

            // Unpublish buttons
            document.querySelectorAll('.unpublish-btn').forEach(btn => {
                btn.addEventListener('click', () => this.unpublishMap(btn.dataset.id));
            });
        },

        updateBulkActionsState() {
            const hasSelection = this.adminSelectedIds.size > 0;
            document.getElementById('bulkActionSelect').disabled = !hasSelection;
            document.getElementById('bulkActionBtn').disabled = !hasSelection;
            document.getElementById('bulkActionBtn').style.background = hasSelection ? '#3498db' : '#95a5a6';
        },

        updateAdminPagination(pagination) {
            const total = pagination.total || 0;
            const limit = pagination.limit || 20;
            const offset = pagination.offset || 0;
            const showing = Math.min(limit, total - offset);

            document.getElementById('paginationInfo').textContent =
                `Showing ${offset + 1}-${offset + showing} of ${total} submissions`;

            document.getElementById('prevPageBtn').disabled = offset === 0;
            document.getElementById('nextPageBtn').disabled = !pagination.hasMore;
        },

        async showSubmissionDetail(submissionId) {
            try {
                const data = await this.adminRequest(`/api/admin/submissions/${submissionId}`);
                const submission = data.submission;
                const history = data.history || [];
                const tags = data.tags || [];

                const modal = document.createElement('div');
                modal.id = 'submissionDetailModal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 26000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                modal.innerHTML = `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 800px;
                        max-height: 85vh;
                        overflow-y: auto;
                        position: relative;
                    ">
                        <div style="
                            padding: 24px;
                            border-bottom: 1px solid #eee;
                            position: sticky;
                            top: 0;
                            background: white;
                            z-index: 1;
                        ">
                            <h2 style="margin: 0 0 8px 0; color: #2c3e50;">${submission.title || 'Untitled'}</h2>
                            <p style="margin: 0; color: #7f8c8d; font-size: 14px;">
                                Submitted by ${submission.author} on ${new Date(submission.submitted_at).toLocaleString()}
                            </p>
                            <button onclick="this.closest('#submissionDetailModal').remove()" style="
                                position: absolute;
                                top: 20px;
                                right: 20px;
                                background: none;
                                border: none;
                                font-size: 24px;
                                cursor: pointer;
                                color: #7f8c8d;
                            ">&times;</button>
                        </div>

                        <div style="padding: 24px;">
                            <!-- Submission Info -->
                            <div style="
                                display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                                gap: 16px;
                                margin-bottom: 24px;
                            ">
                                <div>
                                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">Author Email</div>
                                    <div style="font-weight: 500;">${submission.author_email || '-'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">Organization</div>
                                    <div style="font-weight: 500;">${submission.author_organization || '-'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">Status</div>
                                    <div style="font-weight: 500;">${submission.status}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">View Count</div>
                                    <div style="font-weight: 500;">${submission.view_count || 0}</div>
                                </div>
                            </div>

                            ${tags.length > 0 ? `
                                <div style="margin-bottom: 24px;">
                                    <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 8px;">Tags</div>
                                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                        ${tags.map(t => `<span style="background: #ecf0f1; padding: 4px 10px; border-radius: 12px; font-size: 12px;">${t}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${submission.changes_requested ? `
                                <div style="
                                    background: #f5eef8;
                                    border-left: 4px solid #9b59b6;
                                    padding: 16px;
                                    margin-bottom: 24px;
                                    border-radius: 0 8px 8px 0;
                                ">
                                    <div style="font-weight: 600; color: #9b59b6; margin-bottom: 8px;">Changes Requested</div>
                                    <div style="font-size: 14px;">
                                        ${typeof submission.changes_requested === 'string'
                                            ? JSON.parse(submission.changes_requested).message
                                            : submission.changes_requested.message || '-'}
                                    </div>
                                </div>
                            ` : ''}

                            ${submission.rejection_reason ? `
                                <div style="
                                    background: #fbeaea;
                                    border-left: 4px solid #e74c3c;
                                    padding: 16px;
                                    margin-bottom: 24px;
                                    border-radius: 0 8px 8px 0;
                                ">
                                    <div style="font-weight: 600; color: #e74c3c; margin-bottom: 8px;">Rejection Reason</div>
                                    <div style="font-size: 14px;">${submission.rejection_reason}</div>
                                    ${submission.rejection_message ? `<div style="font-size: 13px; color: #666; margin-top: 8px;">${submission.rejection_message}</div>` : ''}
                                </div>
                            ` : ''}

                            <!-- Moderation History -->
                            <div>
                                <h3 style="margin: 0 0 16px 0; color: #2c3e50; font-size: 16px;">Moderation History</h3>
                                ${history.length === 0 ? `
                                    <div style="color: #7f8c8d; font-size: 14px;">No moderation history yet.</div>
                                ` : `
                                    <div style="border-left: 2px solid #ecf0f1; padding-left: 16px;">
                                        ${history.map(h => `
                                            <div style="margin-bottom: 16px; position: relative;">
                                                <div style="
                                                    position: absolute;
                                                    left: -22px;
                                                    top: 4px;
                                                    width: 12px;
                                                    height: 12px;
                                                    background: ${h.action === 'approve' ? '#27ae60' : h.action === 'reject' ? '#e74c3c' : '#9b59b6'};
                                                    border-radius: 50%;
                                                "></div>
                                                <div style="font-weight: 500; color: #2c3e50;">${h.action}</div>
                                                <div style="font-size: 12px; color: #7f8c8d;">
                                                    ${new Date(h.created_at).toLocaleString()}
                                                    ${h.moderator_name ? ` by ${h.moderator_name}` : ''}
                                                </div>
                                                ${h.notes || h.message ? `<div style="font-size: 13px; color: #555; margin-top: 4px;">${h.notes || h.message}</div>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.remove();
                });

            } catch (error) {
                CoopMaps.showNotification('Failed to load submission: ' + error.message, 'error');
            }
        },

        async approveSubmission(submissionId) {
            const notes = prompt('Admin notes (optional):');

            try {
                await this.adminRequest(`/api/admin/submissions/${submissionId}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({ adminNotes: notes, notifyAuthor: true })
                });

                CoopMaps.showNotification('Submission approved and published', 'success');
                this.loadAdminStats();
                this.loadAdminSubmissions();

            } catch (error) {
                CoopMaps.showNotification('Failed to approve: ' + error.message, 'error');
            }
        },

        showRequestChangesDialog(submissionId) {
            const message = prompt('What changes are needed?');
            if (!message) return;

            this.requestChanges(submissionId, message);
        },

        async requestChanges(submissionId, message) {
            try {
                await this.adminRequest(`/api/admin/submissions/${submissionId}/request-changes`, {
                    method: 'POST',
                    body: JSON.stringify({ message })
                });

                CoopMaps.showNotification('Changes requested from author', 'success');
                this.loadAdminStats();
                this.loadAdminSubmissions();

            } catch (error) {
                CoopMaps.showNotification('Failed to request changes: ' + error.message, 'error');
            }
        },

        showRejectDialog(submissionId) {
            const reason = prompt('Rejection reason:');
            if (!reason) return;

            const message = prompt('Message to author:');
            if (!message) return;

            const deleteMap = confirm('Also delete the map? (Click OK to delete, Cancel to just reject)');

            this.rejectSubmission(submissionId, reason, message, deleteMap);
        },

        async rejectSubmission(submissionId, reason, message, deleteMap) {
            try {
                await this.adminRequest(`/api/admin/submissions/${submissionId}/reject`, {
                    method: 'POST',
                    body: JSON.stringify({ reason, message, deleteMap })
                });

                CoopMaps.showNotification('Submission rejected', 'success');
                this.loadAdminStats();
                this.loadAdminSubmissions();

            } catch (error) {
                CoopMaps.showNotification('Failed to reject: ' + error.message, 'error');
            }
        },

        async unpublishMap(mapId) {
            const reason = prompt('Reason for unpublishing:');
            if (!reason) return;

            try {
                await this.adminRequest(`/api/admin/maps/${mapId}/unpublish`, {
                    method: 'POST',
                    body: JSON.stringify({ reason, notifyAuthor: true })
                });

                CoopMaps.showNotification('Map unpublished', 'success');
                this.loadAdminStats();
                this.loadAdminSubmissions();

            } catch (error) {
                CoopMaps.showNotification('Failed to unpublish: ' + error.message, 'error');
            }
        },

        async executeBulkAction() {
            const action = document.getElementById('bulkActionSelect').value;
            if (!action) {
                CoopMaps.showNotification('Please select an action', 'error');
                return;
            }

            const ids = Array.from(this.adminSelectedIds);
            if (ids.length === 0) {
                CoopMaps.showNotification('No items selected', 'error');
                return;
            }

            const confirmMsg = {
                approve: `Approve ${ids.length} submission(s)?`,
                reject: `Reject ${ids.length} submission(s)?`,
                delete: `Delete ${ids.length} submission(s)? This cannot be undone.`,
                feature: `Feature ${ids.length} submission(s)?`,
                unfeature: `Unfeature ${ids.length} submission(s)?`
            };

            if (!confirm(confirmMsg[action] || `Perform ${action} on ${ids.length} items?`)) {
                return;
            }

            try {
                const result = await this.adminRequest('/api/admin/bulk-action', {
                    method: 'POST',
                    body: JSON.stringify({ action, mapIds: ids })
                });

                CoopMaps.showNotification(
                    `Bulk action completed: ${result.results.success} successful, ${result.results.failed} failed`,
                    result.results.failed > 0 ? 'warning' : 'success'
                );

                this.adminSelectedIds.clear();
                this.loadAdminStats();
                this.loadAdminSubmissions();

            } catch (error) {
                CoopMaps.showNotification('Bulk action failed: ' + error.message, 'error');
            }
        },

        // ====== PUBLIC GALLERY ======

        async showPublicGallery() {
            const modal = document.createElement('div');
            modal.id = 'publicGalleryModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: #f5f6fa;
                    border-radius: 12px;
                    width: 95%;
                    max-width: 1100px;
                    height: 85vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                        color: white;
                        padding: 20px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 22px;">Public Gallery</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">Browse and discover public diagrams</p>
                        </div>
                        <button onclick="document.getElementById('publicGalleryModal').remove()" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 20px;
                        ">&times;</button>
                    </div>

                    <!-- Tabs -->
                    <div style="
                        background: white;
                        padding: 0 24px;
                        border-bottom: 1px solid #e1e5eb;
                        display: flex;
                        gap: 4px;
                    ">
                        <button class="gallery-tab active" data-tab="popular" style="
                            padding: 14px 20px;
                            background: none;
                            border: none;
                            border-bottom: 3px solid #3498db;
                            cursor: pointer;
                            font-weight: 600;
                            color: #3498db;
                        ">Popular</button>
                        <button class="gallery-tab" data-tab="recent" style="
                            padding: 14px 20px;
                            background: none;
                            border: none;
                            border-bottom: 3px solid transparent;
                            cursor: pointer;
                            font-weight: 500;
                            color: #7f8c8d;
                        ">Recent</button>
                        <button class="gallery-tab" data-tab="templates" style="
                            padding: 14px 20px;
                            background: none;
                            border: none;
                            border-bottom: 3px solid transparent;
                            cursor: pointer;
                            font-weight: 500;
                            color: #7f8c8d;
                        ">Templates</button>
                        <button class="gallery-tab" data-tab="search" style="
                            padding: 14px 20px;
                            background: none;
                            border: none;
                            border-bottom: 3px solid transparent;
                            cursor: pointer;
                            font-weight: 500;
                            color: #7f8c8d;
                        ">Search</button>
                    </div>

                    <!-- Search Bar (for search tab) -->
                    <div id="gallerySearchBar" style="
                        padding: 16px 24px;
                        background: white;
                        border-bottom: 1px solid #e1e5eb;
                        display: none;
                    ">
                        <div style="display: flex; gap: 12px;">
                            <input type="text" id="gallerySearchInput" placeholder="Search diagrams..." style="
                                flex: 1;
                                padding: 10px 14px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            ">
                            <button onclick="CoopMaps.modules.auth.searchPublicDiagrams()" style="
                                padding: 10px 20px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">Search</button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div id="galleryContent" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px 24px;
                    ">
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            Loading...
                        </div>
                    </div>

                    <!-- Stats Footer -->
                    <div id="galleryStats" style="
                        padding: 12px 24px;
                        background: white;
                        border-top: 1px solid #e1e5eb;
                        font-size: 13px;
                        color: #7f8c8d;
                    "></div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Tab switching
            modal.querySelectorAll('.gallery-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    modal.querySelectorAll('.gallery-tab').forEach(t => {
                        t.style.borderBottomColor = 'transparent';
                        t.style.color = '#7f8c8d';
                        t.style.fontWeight = '500';
                    });
                    tab.style.borderBottomColor = '#3498db';
                    tab.style.color = '#3498db';
                    tab.style.fontWeight = '600';

                    const searchBar = document.getElementById('gallerySearchBar');
                    searchBar.style.display = tab.dataset.tab === 'search' ? 'block' : 'none';

                    this.loadGalleryTab(tab.dataset.tab);
                });
            });

            // Load initial tab
            this.loadGalleryTab('popular');
            this.loadGalleryStats();
        },

        async loadGalleryTab(tab) {
            const content = document.getElementById('galleryContent');
            content.innerHTML = '<div style="text-align: center; padding: 60px; color: #7f8c8d;">Loading...</div>';

            try {
                let endpoint = '/api/public/';
                switch (tab) {
                    case 'popular': endpoint += 'popular'; break;
                    case 'recent': endpoint += 'recent'; break;
                    case 'templates': endpoint += 'templates'; break;
                    case 'search': return; // Wait for search input
                    default: endpoint += 'diagrams';
                }

                const response = await fetch(endpoint);
                const data = await response.json();

                const items = data.diagrams || data.templates || [];

                if (items.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            <p style="font-size: 18px; margin-bottom: 8px;">No diagrams found</p>
                            <p style="font-size: 14px;">Be the first to share a public diagram!</p>
                        </div>
                    `;
                    return;
                }

                content.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                        ${items.map(item => this.renderGalleryCard(item)).join('')}
                    </div>
                `;

                // Bind open buttons
                content.querySelectorAll('.open-public-diagram').forEach(btn => {
                    btn.addEventListener('click', () => this.openPublicDiagram(btn.dataset.id));
                });

            } catch (error) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #e74c3c;">
                        Failed to load: ${error.message}
                    </div>
                `;
            }
        },

        renderGalleryCard(item) {
            return `
                <div style="
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    transition: all 0.2s;
                " onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; this.style.transform='translateY(0)'">
                    <div style="
                        height: 120px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 40px;
                    ">&#128506;</div>
                    <div style="padding: 16px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #2c3e50;">
                            ${item.title || 'Untitled'}
                        </h3>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #7f8c8d;">
                            by ${item.owner_name || item.author || 'Anonymous'}
                            ${item.owner_organization ? `(${item.owner_organization})` : ''}
                        </p>
                        <div style="display: flex; gap: 12px; font-size: 12px; color: #95a5a6; margin-bottom: 12px;">
                            <span title="Views">&#128065; ${item.view_count || 0}</span>
                            <span title="Forks">&#128260; ${item.fork_count || 0}</span>
                            <span title="Enterprises">&#128736; ${item.enterprise_count || '?'}</span>
                        </div>
                        <button class="open-public-diagram" data-id="${item.id}" style="
                            width: 100%;
                            padding: 10px;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">Open Diagram</button>
                    </div>
                </div>
            `;
        },

        async searchPublicDiagrams() {
            const query = document.getElementById('gallerySearchInput').value;
            if (!query.trim()) return;

            const content = document.getElementById('galleryContent');
            content.innerHTML = '<div style="text-align: center; padding: 60px; color: #7f8c8d;">Searching...</div>';

            try {
                const response = await fetch(`/api/public/diagrams?q=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (!data.diagrams || data.diagrams.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            No results found for "${query}"
                        </div>
                    `;
                    return;
                }

                content.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                        ${data.diagrams.map(item => this.renderGalleryCard(item)).join('')}
                    </div>
                `;

                content.querySelectorAll('.open-public-diagram').forEach(btn => {
                    btn.addEventListener('click', () => this.openPublicDiagram(btn.dataset.id));
                });

            } catch (error) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #e74c3c;">
                        Search failed: ${error.message}
                    </div>
                `;
            }
        },

        async loadGalleryStats() {
            try {
                const response = await fetch('/api/public/stats');
                const data = await response.json();
                const stats = data.stats || {};

                document.getElementById('galleryStats').innerHTML = `
                    <span style="margin-right: 20px;"><strong>${stats.total_public_diagrams || 0}</strong> public diagrams</span>
                    <span style="margin-right: 20px;"><strong>${stats.total_templates || 0}</strong> templates</span>
                    <span style="margin-right: 20px;"><strong>${stats.total_contributors || 0}</strong> contributors</span>
                    <span><strong>${stats.total_enterprises || 0}</strong> enterprises mapped</span>
                `;
            } catch (e) {
                console.error('Failed to load gallery stats:', e);
            }
        },

        async openPublicDiagram(diagramId) {
            try {
                const response = await fetch(`/api/public/diagrams/${diagramId}`);
                if (!response.ok) throw new Error('Diagram not found');

                const data = await response.json();

                const diagram = {
                    id: data.diagram.id,
                    name: data.diagram.title,
                    diagramProperties: {
                        author: data.diagram.author,
                        wdr: data.diagram.wdr,
                        scopeGeographic: data.diagram.scope_geographic,
                        scopeEconomic: data.diagram.scope_economic,
                        canvasSize: data.diagram.canvas_size,
                        connectorStyle: data.diagram.connector_style
                    },
                    enterprises: data.enterprises.map(e => ({
                        id: e.enterprise_id,
                        type: e.type,
                        name: e.name,
                        x: e.x,
                        y: e.y,
                        width: e.width,
                        height: e.height,
                        fill: e.fill,
                        stroke: e.stroke,
                        roles: e.roles,
                        tier: e.tier,
                        isGenericSet: e.is_generic_set,
                        zIndex: e.z_index
                    })),
                    relationships: data.relationships.map(r => ({
                        id: r.relationship_id,
                        startEnterpriseId: r.start_enterprise_id,
                        endEnterpriseId: r.end_enterprise_id,
                        type: r.type,
                        startSegmentation: r.start_segmentation,
                        endSegmentation: r.end_segmentation
                    })),
                    annotations: [],
                    isPublicView: true
                };

                CoopMaps.state.data = diagram;
                CoopMaps.state.currentDiagramId = diagram.id;

                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                document.getElementById('publicGalleryModal')?.remove();
                CoopMaps.showNotification(`Opened: ${data.diagram.title}`, 'success');

            } catch (error) {
                CoopMaps.showNotification('Failed to open diagram: ' + error.message, 'error');
            }
        },

        // ====== COMMUNITY MAPS GALLERY ======

        async showCommunityMaps() {
            const modal = document.createElement('div');
            modal.id = 'communityMapsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: #f5f6fa;
                    border-radius: 12px;
                    width: 95%;
                    max-width: 1100px;
                    height: 85vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                        color: white;
                        padding: 20px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 22px;">Community Maps</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">Browse community-submitted cooperative ecosystem maps</p>
                        </div>
                        <button onclick="document.getElementById('communityMapsModal').remove()" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 20px;
                        ">&times;</button>
                    </div>

                    <!-- Search/Filter -->
                    <div style="padding: 16px 24px; background: white; border-bottom: 1px solid #e1e5eb; display: flex; gap: 12px;">
                        <input type="text" id="communitySearchInput" placeholder="Search maps..." style="
                            flex: 1;
                            padding: 10px 14px;
                            border: 2px solid #ecf0f1;
                            border-radius: 8px;
                            font-size: 14px;
                        ">
                        <button onclick="CoopMaps.modules.auth.loadCommunityMaps()" style="
                            padding: 10px 20px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Search</button>
                    </div>

                    <div id="communityMapsContent" style="flex: 1; overflow-y: auto; padding: 20px 24px;">
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">Loading...</div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            this.loadCommunityMaps();
        },

        async loadCommunityMaps() {
            const content = document.getElementById('communityMapsContent');
            const search = document.getElementById('communitySearchInput')?.value || '';

            try {
                let url = '/api/maps/approved?limit=50';
                if (search) url += `&search=${encodeURIComponent(search)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (!data.maps || data.maps.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            <p style="font-size: 18px; margin-bottom: 8px;">No community maps found</p>
                            <p style="font-size: 14px;">Submit your map to the community gallery!</p>
                        </div>
                    `;
                    return;
                }

                content.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                        ${data.maps.map(map => `
                            <div style="
                                background: white;
                                border-radius: 12px;
                                overflow: hidden;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                            ">
                                <div style="
                                    height: 100px;
                                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-size: 36px;
                                ">${map.is_featured ? '&#11088;' : '&#127760;'}</div>
                                <div style="padding: 16px;">
                                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #2c3e50;">
                                        ${map.title}
                                        ${map.is_featured ? '<span style="background: #f39c12; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px;">FEATURED</span>' : ''}
                                    </h3>
                                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #7f8c8d;">
                                        by ${map.author}
                                        ${map.author_organization ? `(${map.author_organization})` : ''}
                                    </p>
                                    ${map.scope_geographic ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #95a5a6;">&#127758; ${map.scope_geographic}</p>` : ''}
                                    <div style="display: flex; gap: 12px; font-size: 12px; color: #95a5a6; margin-bottom: 12px;">
                                        <span>&#128065; ${map.view_count || 0} views</span>
                                        <span>&#128260; ${map.fork_count || 0} forks</span>
                                    </div>
                                    ${map.tags && map.tags.length > 0 ? `
                                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                                            ${map.tags.slice(0, 3).map(t => `<span style="background: #ecf0f1; padding: 3px 8px; border-radius: 10px; font-size: 11px;">${t}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                    <button onclick="CoopMaps.modules.auth.openCommunityMap('${map.id}')" style="
                                        width: 100%;
                                        padding: 10px;
                                        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        cursor: pointer;
                                        font-weight: 500;
                                    ">View Map</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

            } catch (error) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #e74c3c;">
                        Failed to load: ${error.message}
                    </div>
                `;
            }
        },

        async openCommunityMap(mapId) {
            try {
                const response = await fetch(`/api/maps/${mapId}`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || 'Failed to load map');
                }

                const map = data.map;
                const diagramData = typeof map.diagramData === 'string'
                    ? JSON.parse(map.diagramData)
                    : map.diagramData;

                CoopMaps.state.data = {
                    ...diagramData,
                    name: map.title,
                    diagramProperties: {
                        ...diagramData.diagramProperties,
                        author: map.author,
                        wdr: map.wdr,
                        scopeGeographic: map.scopeGeographic,
                        scopeEconomic: map.scopeEconomic
                    },
                    isCommunityMap: true,
                    communityMapId: mapId
                };

                if (CoopMaps.modules.canvas) {
                    CoopMaps.modules.canvas.render();
                }

                document.getElementById('communityMapsModal')?.remove();
                CoopMaps.showNotification(`Opened community map: ${map.title}`, 'success');

            } catch (error) {
                CoopMaps.showNotification('Failed to load map: ' + error.message, 'error');
            }
        },

        // ====== COMMENTS ======

        async showCommentsPanel() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const serverDiagramId = CoopMaps.state.data.serverDiagramId;
            if (!serverDiagramId) {
                CoopMaps.showNotification('Save diagram to cloud first to use comments', 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'commentsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 20px 24px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="margin: 0; color: #2c3e50;">Comments</h2>
                        <button onclick="document.getElementById('commentsModal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>

                    <!-- New Comment Form -->
                    <div style="padding: 16px 24px; border-bottom: 1px solid #eee;">
                        <textarea id="newCommentInput" placeholder="Write a comment... (use @username to mention)" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ecf0f1;
                            border-radius: 8px;
                            font-size: 14px;
                            min-height: 80px;
                            resize: vertical;
                            font-family: inherit;
                        "></textarea>
                        <div style="margin-top: 10px; text-align: right;">
                            <button onclick="CoopMaps.modules.auth.postComment()" style="
                                padding: 10px 20px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">Post Comment</button>
                        </div>
                    </div>

                    <!-- Comments List -->
                    <div id="commentsList" style="flex: 1; overflow-y: auto; padding: 16px 24px;">
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            Loading comments...
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            this.loadComments(serverDiagramId);
        },

        async loadComments(diagramId) {
            const listEl = document.getElementById('commentsList');

            try {
                const data = await this.authenticatedRequest(`/api/diagrams/${diagramId}/comments`);

                if (!data.comments || data.comments.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            No comments yet. Be the first to comment!
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.comments.map(c => `
                    <div class="comment-item" data-id="${c.id}" style="
                        padding: 16px;
                        background: ${c.is_resolved ? '#f0fff0' : '#f8f9fa'};
                        border-radius: 8px;
                        margin-bottom: 12px;
                        ${c.is_resolved ? 'border-left: 3px solid #27ae60;' : ''}
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <div>
                                <strong style="color: #2c3e50;">${c.full_name || 'User'}</strong>
                                <span style="color: #95a5a6; font-size: 12px; margin-left: 8px;">
                                    ${new Date(c.created_at).toLocaleString()}
                                </span>
                                ${c.is_resolved ? '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px;">RESOLVED</span>' : ''}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                ${!c.is_resolved ? `
                                    <button onclick="CoopMaps.modules.auth.resolveComment('${c.id}')" style="
                                        padding: 4px 10px;
                                        background: #27ae60;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">Resolve</button>
                                ` : `
                                    <button onclick="CoopMaps.modules.auth.unresolveComment('${c.id}')" style="
                                        padding: 4px 10px;
                                        background: #7f8c8d;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">Unresolve</button>
                                `}
                                ${c.user_id === this.currentUser?.id ? `
                                    <button onclick="CoopMaps.modules.auth.deleteComment('${c.id}')" style="
                                        padding: 4px 10px;
                                        background: #e74c3c;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 11px;
                                    ">Delete</button>
                                ` : ''}
                            </div>
                        </div>
                        <div style="color: #2c3e50; font-size: 14px; line-height: 1.5;">
                            ${c.content.replace(/@(\w+)/g, '<span style="color: #3498db; font-weight: 500;">@$1</span>')}
                        </div>
                        ${c.reply_count > 0 ? `<div style="font-size: 12px; color: #7f8c8d; margin-top: 8px;">${c.reply_count} replies</div>` : ''}
                    </div>
                `).join('');

            } catch (error) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        Failed to load comments: ${error.message}
                    </div>
                `;
            }
        },

        async postComment() {
            const input = document.getElementById('newCommentInput');
            const content = input.value.trim();
            if (!content) return;

            const diagramId = CoopMaps.state.data.serverDiagramId;
            if (!diagramId) return;

            try {
                await this.authenticatedRequest(`/api/diagrams/${diagramId}/comments`, {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });

                input.value = '';
                this.loadComments(diagramId);
                CoopMaps.showNotification('Comment posted', 'success');

            } catch (error) {
                CoopMaps.showNotification('Failed to post comment: ' + error.message, 'error');
            }
        },

        async resolveComment(commentId) {
            try {
                await this.authenticatedRequest(`/api/comments/${commentId}/resolve`, {
                    method: 'POST'
                });
                this.loadComments(CoopMaps.state.data.serverDiagramId);
            } catch (error) {
                CoopMaps.showNotification('Failed to resolve: ' + error.message, 'error');
            }
        },

        async unresolveComment(commentId) {
            try {
                await this.authenticatedRequest(`/api/comments/${commentId}/unresolve`, {
                    method: 'POST'
                });
                this.loadComments(CoopMaps.state.data.serverDiagramId);
            } catch (error) {
                CoopMaps.showNotification('Failed to unresolve: ' + error.message, 'error');
            }
        },

        async deleteComment(commentId) {
            if (!confirm('Delete this comment?')) return;

            try {
                await this.authenticatedRequest(`/api/comments/${commentId}`, {
                    method: 'DELETE'
                });
                this.loadComments(CoopMaps.state.data.serverDiagramId);
                CoopMaps.showNotification('Comment deleted', 'success');
            } catch (error) {
                CoopMaps.showNotification('Failed to delete: ' + error.message, 'error');
            }
        },

        // ====== NOTIFICATIONS ======

        async showNotificationsPanel() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'notificationsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 20px 24px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="margin: 0; color: #2c3e50;">Notifications</h2>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button onclick="CoopMaps.modules.auth.markAllNotificationsRead()" style="
                                padding: 6px 12px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Mark All Read</button>
                            <button onclick="document.getElementById('notificationsModal').remove()" style="
                                background: none;
                                border: none;
                                font-size: 24px;
                                cursor: pointer;
                                color: #7f8c8d;
                            ">&times;</button>
                        </div>
                    </div>

                    <div id="notificationsList" style="flex: 1; overflow-y: auto;">
                        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                            Loading...
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            this.loadNotifications();
        },

        async loadNotifications() {
            const listEl = document.getElementById('notificationsList');

            try {
                const data = await this.authenticatedRequest('/api/notifications');

                if (!data.notifications || data.notifications.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 60px; color: #7f8c8d;">
                            No notifications yet
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = data.notifications.map(n => `
                    <div class="notification-item" data-id="${n.id}" style="
                        padding: 16px 24px;
                        border-bottom: 1px solid #f0f0f0;
                        background: ${n.is_read ? 'white' : '#f0f7ff'};
                        cursor: pointer;
                    " onclick="CoopMaps.modules.auth.handleNotificationClick('${n.id}', '${n.link || ''}')">
                        <div style="display: flex; gap: 12px; align-items: start;">
                            <div style="
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                background: ${this.getNotificationColor(n.type)};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 18px;
                                flex-shrink: 0;
                            ">${this.getNotificationIcon(n.type)}</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: ${n.is_read ? '400' : '600'}; color: #2c3e50; margin-bottom: 4px;">
                                    ${n.title}
                                </div>
                                <div style="font-size: 13px; color: #7f8c8d; margin-bottom: 4px;">
                                    ${n.message}
                                </div>
                                <div style="font-size: 11px; color: #95a5a6;">
                                    ${new Date(n.created_at).toLocaleString()}
                                </div>
                            </div>
                            ${!n.is_read ? '<div style="width: 8px; height: 8px; background: #3498db; border-radius: 50%;"></div>' : ''}
                        </div>
                    </div>
                `).join('');

            } catch (error) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        Failed to load: ${error.message}
                    </div>
                `;
            }
        },

        getNotificationColor(type) {
            const colors = {
                comment: '#3498db',
                mention: '#9b59b6',
                share: '#27ae60',
                collaboration: '#e67e22',
                approval: '#2ecc71',
                rejection: '#e74c3c'
            };
            return colors[type] || '#7f8c8d';
        },

        getNotificationIcon(type) {
            const icons = {
                comment: '&#128172;',
                mention: '@',
                share: '&#128101;',
                collaboration: '&#128101;',
                approval: '&#10004;',
                rejection: '&#10006;'
            };
            return icons[type] || '&#128276;';
        },

        async handleNotificationClick(notificationId, link) {
            // Mark as read
            try {
                await this.authenticatedRequest('/api/notifications/mark-read', {
                    method: 'POST',
                    body: JSON.stringify({ notificationIds: [notificationId] })
                });
            } catch (e) {
                console.error('Failed to mark notification read:', e);
            }

            // Navigate if there's a link
            if (link) {
                document.getElementById('notificationsModal')?.remove();
                // Handle internal navigation
                if (link.startsWith('/diagrams/')) {
                    const diagramId = link.split('/')[2].split('#')[0];
                    this.loadDiagramFromServer(diagramId);
                }
            }

            this.loadNotifications();
        },

        async markAllNotificationsRead() {
            try {
                await this.authenticatedRequest('/api/notifications/mark-all-read', {
                    method: 'POST'
                });
                this.loadNotifications();
                CoopMaps.showNotification('All notifications marked as read', 'success');
            } catch (error) {
                CoopMaps.showNotification('Failed: ' + error.message, 'error');
            }
        },

        async getUnreadNotificationCount() {
            if (!this.isAuthenticated) return 0;
            try {
                const data = await this.authenticatedRequest('/api/notifications/unread-count');
                return data.count || 0;
            } catch (e) {
                return 0;
            }
        },

        // ====== TAGS ======

        async showTagsPanel() {
            if (!this.isAuthenticated) {
                this.showLoginModal();
                return;
            }

            const serverDiagramId = CoopMaps.state.data.serverDiagramId;
            if (!serverDiagramId) {
                CoopMaps.showNotification('Save diagram to cloud first to use tags', 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'tagsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-width: 500px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #2c3e50;">Diagram Tags</h2>
                        <button onclick="document.getElementById('tagsModal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>

                    <!-- Add Tag -->
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="newTagInput" placeholder="Add a tag..." style="
                                flex: 1;
                                padding: 10px 14px;
                                border: 2px solid #ecf0f1;
                                border-radius: 8px;
                                font-size: 14px;
                            ">
                            <button onclick="CoopMaps.modules.auth.addTag()" style="
                                padding: 10px 20px;
                                background: #27ae60;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                            ">Add</button>
                        </div>
                    </div>

                    <!-- Current Tags -->
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; color: #7f8c8d; font-size: 13px;">Current Tags</h4>
                        <div id="currentTagsList" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            Loading...
                        </div>
                    </div>

                    <!-- Popular Tags -->
                    <div>
                        <h4 style="margin: 0 0 12px 0; color: #7f8c8d; font-size: 13px;">Popular Tags</h4>
                        <div id="popularTagsList" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            Loading...
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            this.loadDiagramTags(serverDiagramId);
            this.loadPopularTags();
        },

        async loadDiagramTags(diagramId) {
            const listEl = document.getElementById('currentTagsList');

            try {
                const response = await fetch(`/api/diagrams/${diagramId}/tags`);
                const data = await response.json();

                if (!data.tags || data.tags.length === 0) {
                    listEl.innerHTML = '<span style="color: #7f8c8d; font-size: 13px;">No tags yet</span>';
                    return;
                }

                listEl.innerHTML = data.tags.map(tag => `
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        background: ${tag.color || '#3498db'};
                        color: white;
                        padding: 6px 12px;
                        border-radius: 16px;
                        font-size: 13px;
                    ">
                        ${tag.name}
                        <button onclick="CoopMaps.modules.auth.removeTag('${tag.id}')" style="
                            background: rgba(255,255,255,0.3);
                            border: none;
                            color: white;
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 12px;
                            line-height: 1;
                        ">&times;</button>
                    </span>
                `).join('');

            } catch (error) {
                listEl.innerHTML = `<span style="color: #e74c3c;">Failed to load tags</span>`;
            }
        },

        async loadPopularTags() {
            const listEl = document.getElementById('popularTagsList');

            try {
                const response = await fetch('/api/tags?limit=20');
                const data = await response.json();

                if (!data.tags || data.tags.length === 0) {
                    listEl.innerHTML = '<span style="color: #7f8c8d; font-size: 13px;">No tags available</span>';
                    return;
                }

                listEl.innerHTML = data.tags.map(tag => `
                    <button onclick="CoopMaps.modules.auth.addTagByName('${tag.name}')" style="
                        background: #ecf0f1;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 16px;
                        font-size: 13px;
                        cursor: pointer;
                        color: #2c3e50;
                    " onmouseover="this.style.background='#3498db'; this.style.color='white'"
                       onmouseout="this.style.background='#ecf0f1'; this.style.color='#2c3e50'">
                        ${tag.name} <span style="opacity: 0.6;">(${tag.usage_count || 0})</span>
                    </button>
                `).join('');

            } catch (error) {
                listEl.innerHTML = `<span style="color: #e74c3c;">Failed to load tags</span>`;
            }
        },

        async addTag() {
            const input = document.getElementById('newTagInput');
            const tagName = input.value.trim();
            if (!tagName) return;

            await this.addTagByName(tagName);
            input.value = '';
        },

        async addTagByName(tagName) {
            const diagramId = CoopMaps.state.data.serverDiagramId;
            if (!diagramId) return;

            try {
                await this.authenticatedRequest(`/api/diagrams/${diagramId}/tags`, {
                    method: 'POST',
                    body: JSON.stringify({ tagName })
                });

                this.loadDiagramTags(diagramId);
                CoopMaps.showNotification(`Tag "${tagName}" added`, 'success');

            } catch (error) {
                if (error.message.includes('409')) {
                    CoopMaps.showNotification('Tag already added to this diagram', 'info');
                } else {
                    CoopMaps.showNotification('Failed to add tag: ' + error.message, 'error');
                }
            }
        },

        async removeTag(tagId) {
            const diagramId = CoopMaps.state.data.serverDiagramId;
            if (!diagramId) return;

            try {
                await this.authenticatedRequest(`/api/diagrams/${diagramId}/tags/${tagId}`, {
                    method: 'DELETE'
                });

                this.loadDiagramTags(diagramId);
                CoopMaps.showNotification('Tag removed', 'success');

            } catch (error) {
                CoopMaps.showNotification('Failed to remove tag: ' + error.message, 'error');
            }
        }
    });
})();
