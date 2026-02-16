/**
 * My Maps Module
 * Interface for managing user's drafts and submissions
 */

(function() {
    'use strict';

    // Check if CoopMaps global exists
    if (typeof window.CoopMaps === 'undefined') {
        console.error('CoopMaps global not found. MyMaps module cannot initialize.');
        return;
    }

    const MyMapsModule = {
        currentTab: 'drafts', // 'drafts', 'submitted', 'published'
        drafts: [],
        submissions: [],
        stats: null,
        isLoading: false,

        /**
         * Initialize the module
         */
        init: function() {
            console.log('My Maps module initialized');
        },

        /**
         * Show My Maps dialog
         */
        show: async function() {
            this.isLoading = true;

            // Load data
            await Promise.all([
                this.loadDrafts(),
                this.loadSubmissions(),
                this.loadStats()
            ]);

            this.isLoading = false;

            // Render in modal or sidebar
            this.renderModal();
        },

        /**
         * Load drafts from server
         */
        loadDrafts: async function() {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/drafts`, {
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load drafts: ${response.status}`);
                }

                const result = await response.json();
                this.drafts = result.drafts || [];
                console.log('Loaded drafts:', this.drafts.length);
            } catch (error) {
                console.error('Error loading drafts:', error);
                this.drafts = [];
                this.showNotification('Failed to load drafts', 'error');
            }
        },

        /**
         * Load submissions from server
         */
        loadSubmissions: async function() {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/submissions/my-submissions`, {
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load submissions: ${response.status}`);
                }

                const result = await response.json();
                this.submissions = result.submissions || [];
                console.log('Loaded submissions:', this.submissions.length);
            } catch (error) {
                console.error('Error loading submissions:', error);
                this.submissions = [];
                this.showNotification('Failed to load submissions', 'error');
            }
        },

        /**
         * Load statistics
         */
        loadStats: async function() {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/submissions/my-submissions/stats`, {
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load stats: ${response.status}`);
                }

                const result = await response.json();
                this.stats = result.stats || {};
                console.log('Loaded stats:', this.stats);
            } catch (error) {
                console.error('Error loading stats:', error);
                this.stats = {};
            }
        },

        /**
         * Render modal
         */
        renderModal: function() {
            // Create modal if it doesn't exist
            let modal = document.getElementById('myMapsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'myMapsModal';
                modal.style.cssText = `
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    overflow: auto;
                `;
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div style="
                    background-color: white;
                    margin: 5% auto;
                    padding: 0;
                    width: 90%;
                    max-width: 1200px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- Header -->
                    <div style="
                        padding: 20px 30px;
                        border-bottom: 1px solid #ecf0f1;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="margin: 0; color: #2c3e50; font-size: 24px;">My Maps</h2>
                        <button onclick="CoopMaps.modules.myMaps.closeModal()" style="
                            background: none;
                            border: none;
                            font-size: 28px;
                            cursor: pointer;
                            color: #95a5a6;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            line-height: 1;
                        ">&times;</button>
                    </div>

                    <!-- Stats Bar -->
                    ${this.renderStatsBar()}

                    <!-- Tabs -->
                    <div style="
                        padding: 0 30px;
                        border-bottom: 2px solid #ecf0f1;
                        display: flex;
                        gap: 10px;
                    ">
                        <button onclick="CoopMaps.modules.myMaps.switchTab('drafts')" style="
                            padding: 15px 25px;
                            background: ${this.currentTab === 'drafts' ? '#3498db' : 'transparent'};
                            color: ${this.currentTab === 'drafts' ? 'white' : '#7f8c8d'};
                            border: none;
                            border-bottom: 3px solid ${this.currentTab === 'drafts' ? '#3498db' : 'transparent'};
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 15px;
                            transition: all 0.3s;
                        ">
                            Drafts (${this.drafts.length})
                        </button>
                        <button onclick="CoopMaps.modules.myMaps.switchTab('submitted')" style="
                            padding: 15px 25px;
                            background: ${this.currentTab === 'submitted' ? '#3498db' : 'transparent'};
                            color: ${this.currentTab === 'submitted' ? 'white' : '#7f8c8d'};
                            border: none;
                            border-bottom: 3px solid ${this.currentTab === 'submitted' ? '#3498db' : 'transparent'};
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 15px;
                            transition: all 0.3s;
                        ">
                            Submitted (${this.submissions.filter(s => s.status === 'pending' || s.status === 'changes_requested').length})
                        </button>
                        <button onclick="CoopMaps.modules.myMaps.switchTab('published')" style="
                            padding: 15px 25px;
                            background: ${this.currentTab === 'published' ? '#3498db' : 'transparent'};
                            color: ${this.currentTab === 'published' ? 'white' : '#7f8c8d'};
                            border: none;
                            border-bottom: 3px solid ${this.currentTab === 'published' ? '#3498db' : 'transparent'};
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 15px;
                            transition: all 0.3s;
                        ">
                            Published (${this.submissions.filter(s => s.status === 'published').length})
                        </button>
                    </div>

                    <!-- Content -->
                    <div style="
                        padding: 30px;
                        overflow-y: auto;
                        flex: 1;
                    ">
                        ${this.renderTabContent()}
                    </div>

                    <!-- Footer -->
                    <div style="
                        padding: 20px 30px;
                        border-top: 1px solid #ecf0f1;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <button onclick="CoopMaps.modules.myMaps.createNewDraft()" style="
                            padding: 12px 24px;
                            background: linear-gradient(135deg, #27ae60, #2ecc71);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 15px;
                            transition: transform 0.2s;
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            + Create New Map
                        </button>
                        <button onclick="CoopMaps.modules.myMaps.closeModal()" style="
                            padding: 12px 24px;
                            background: #ecf0f1;
                            color: #7f8c8d;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 15px;
                        ">
                            Close
                        </button>
                    </div>
                </div>
            `;

            modal.style.display = 'block';
        },

        /**
         * Render stats bar
         */
        renderStatsBar: function() {
            if (!this.stats) return '';

            return `
                <div style="
                    padding: 20px 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: space-around;
                    gap: 20px;
                ">
                    <div style="text-align: center; color: white;">
                        <div style="font-size: 32px; font-weight: bold;">${this.stats.drafts || 0}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Drafts</div>
                    </div>
                    <div style="text-align: center; color: white;">
                        <div style="font-size: 32px; font-weight: bold;">${this.stats.pending || 0}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Pending Review</div>
                    </div>
                    <div style="text-align: center; color: white;">
                        <div style="font-size: 32px; font-weight: bold;">${this.stats.published || 0}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Published</div>
                    </div>
                    <div style="text-align: center; color: white;">
                        <div style="font-size: 32px; font-weight: bold;">${this.stats.totalViews || 0}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Total Views</div>
                    </div>
                </div>
            `;
        },

        /**
         * Render tab content
         */
        renderTabContent: function() {
            switch (this.currentTab) {
                case 'drafts':
                    return this.renderDrafts();
                case 'submitted':
                    return this.renderSubmitted();
                case 'published':
                    return this.renderPublished();
                default:
                    return '';
            }
        },

        /**
         * Render drafts tab
         */
        renderDrafts: function() {
            if (this.drafts.length === 0) {
                return `
                    <div style="
                        text-align: center;
                        padding: 60px 20px;
                        color: #95a5a6;
                    ">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 20px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        <h3 style="color: #7f8c8d; margin: 0 0 10px 0;">No draft maps yet</h3>
                        <p style="font-size: 15px; margin: 0;">Create your first map to get started</p>
                    </div>
                `;
            }

            const draftsHtml = this.drafts.map(draft => `
                <div style="
                    background: white;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    transition: all 0.3s ease;
                    border: 1px solid #ecf0f1;
                " onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    <div style="display: flex; gap: 20px; align-items: start;">
                        <!-- Thumbnail -->
                        <div style="
                            width: 150px;
                            height: 100px;
                            background: #f8f9fa;
                            border-radius: 6px;
                            flex-shrink: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                        ">
                            ${draft.thumbnail ?
                                `<img src="${draft.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail">` :
                                `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#bdc3c7" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>`
                            }
                        </div>

                        <!-- Content -->
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                <div>
                                    <h3 style="
                                        margin: 0 0 8px 0;
                                        color: #2c3e50;
                                        font-size: 18px;
                                        font-weight: 600;
                                    ">${this.escapeHtml(draft.title)}</h3>
                                    <div style="
                                        display: flex;
                                        gap: 15px;
                                        font-size: 13px;
                                        color: #7f8c8d;
                                    ">
                                        <span>
                                            ${draft.is_owner ?
                                                '<strong style="color: #3498db;">Owner</strong>' :
                                                `<strong style="color: #9b59b6;">${draft.permission}</strong>`
                                            }
                                        </span>
                                        ${draft.collaborator_count > 0 ?
                                            `<span>• ${draft.collaborator_count} collaborator${draft.collaborator_count > 1 ? 's' : ''}</span>` :
                                            ''
                                        }
                                        <span>• Last edited: ${this.formatDate(draft.last_edited_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div style="display: flex; gap: 10px; margin-top: 15px;">
                                <button onclick="CoopMaps.modules.myMaps.openDraft('${draft.id}')" style="
                                    padding: 8px 16px;
                                    background: #3498db;
                                    color: white;
                                    border: none;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: 500;
                                ">
                                    Open & Edit
                                </button>
                                ${draft.is_owner ? `
                                    <button onclick="CoopMaps.modules.myMaps.showSubmitDialog('${draft.id}')" style="
                                        padding: 8px 16px;
                                        background: #27ae60;
                                        color: white;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                        font-weight: 500;
                                    ">
                                        Submit for Review
                                    </button>
                                    <button onclick="CoopMaps.modules.myMaps.showCollaboratorsDialog('${draft.id}')" style="
                                        padding: 8px 16px;
                                        background: #9b59b6;
                                        color: white;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                        font-weight: 500;
                                    ">
                                        Manage Collaborators
                                    </button>
                                    <button onclick="CoopMaps.modules.myMaps.deleteDraft('${draft.id}')" style="
                                        padding: 8px 16px;
                                        background: white;
                                        color: #e74c3c;
                                        border: 1px solid #e74c3c;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                        font-weight: 500;
                                    ">
                                        Delete
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            return `<div>${draftsHtml}</div>`;
        },

        /**
         * Render submitted tab
         */
        renderSubmitted: function() {
            const pending = this.submissions.filter(s =>
                s.status === 'pending' || s.status === 'changes_requested'
            );

            if (pending.length === 0) {
                return `
                    <div style="text-align: center; padding: 60px 20px; color: #95a5a6;">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 20px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <polyline points="9 11 12 14 22 4"/>
                        </svg>
                        <h3 style="color: #7f8c8d; margin: 0 0 10px 0;">No submitted maps</h3>
                        <p style="font-size: 15px; margin: 0;">Submit a draft for review to see it here</p>
                    </div>
                `;
            }

            const submissionsHtml = pending.map(sub => `
                <div style="
                    background: white;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    border-left: 4px solid ${sub.status === 'pending' ? '#f39c12' : '#e67e22'};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">
                                ${this.escapeHtml(sub.title)}
                            </h3>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span style="
                                    padding: 4px 12px;
                                    background: ${sub.status === 'pending' ? '#f39c12' : '#e67e22'};
                                    color: white;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    font-weight: 600;
                                ">
                                    ${sub.status === 'pending' ? 'Pending Review' : 'Changes Requested'}
                                </span>
                                <span style="font-size: 13px; color: #7f8c8d;">
                                    Submitted: ${this.formatDate(sub.submitted_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    ${sub.admin_notes ? `
                        <div style="
                            background: #fff3cd;
                            padding: 15px;
                            margin-top: 15px;
                            border-radius: 6px;
                            border-left: 3px solid #f39c12;
                        ">
                            <strong style="color: #856404; display: block; margin-bottom: 8px;">Admin Feedback:</strong>
                            <p style="color: #856404; margin: 0; font-size: 14px;">${this.escapeHtml(sub.admin_notes)}</p>
                        </div>
                    ` : ''}

                    ${sub.changes_requested && sub.changes_requested.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <strong style="color: #e67e22; display: block; margin-bottom: 8px;">Changes Requested:</strong>
                            <ul style="margin: 0; padding-left: 20px; color: #7f8c8d;">
                                ${sub.changes_requested.map(change => `<li>${this.escapeHtml(change)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            return `<div>${submissionsHtml}</div>`;
        },

        /**
         * Render published tab
         */
        renderPublished: function() {
            const published = this.submissions.filter(s => s.status === 'published');

            if (published.length === 0) {
                return `
                    <div style="text-align: center; padding: 60px 20px; color: #95a5a6;">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 20px;">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <h3 style="color: #7f8c8d; margin: 0 0 10px 0;">No published maps yet</h3>
                        <p style="font-size: 15px; margin: 0;">Your approved maps will appear here</p>
                    </div>
                `;
            }

            const publishedHtml = published.map(map => `
                <div style="
                    background: white;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    border-left: 4px solid #27ae60;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">
                                ${this.escapeHtml(map.title)}
                            </h3>
                            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                                ${map.official_wdr ? `
                                    <span style="
                                        padding: 4px 12px;
                                        background: #9b59b6;
                                        color: white;
                                        border-radius: 4px;
                                        font-size: 12px;
                                        font-weight: 600;
                                    ">
                                        ${map.official_wdr}
                                    </span>
                                ` : ''}
                                <span style="
                                    padding: 4px 12px;
                                    background: #27ae60;
                                    color: white;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    font-weight: 600;
                                ">
                                    Published
                                </span>
                                <span style="font-size: 13px; color: #7f8c8d;">
                                    ${map.view_count || 0} views
                                </span>
                                <span style="font-size: 13px; color: #7f8c8d;">
                                    Published: ${this.formatDate(map.published_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <a href="/browse.html?id=${map.id}" target="_blank" style="
                            color: #3498db;
                            text-decoration: none;
                            font-size: 14px;
                            font-weight: 600;
                        ">
                            View in Gallery →
                        </a>
                    </div>
                </div>
            `).join('');

            return `<div>${publishedHtml}</div>`;
        },

        /**
         * Switch tab
         */
        switchTab: async function(tab) {
            this.currentTab = tab;

            // Reload data if needed
            if (tab === 'drafts') {
                await this.loadDrafts();
            } else {
                await this.loadSubmissions();
            }

            // Re-render
            this.renderModal();
        },

        /**
         * Create new draft
         */
        createNewDraft: async function() {
            const title = prompt('Enter a title for your new map:', 'Untitled Map');
            if (!title) return;

            try {
                const response = await fetch(`${this.getApiUrl()}/api/drafts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    },
                    body: JSON.stringify({
                        title: title,
                        diagramData: {
                            enterprises: [],
                            relationships: [],
                            metadata: {
                                title: title,
                                date: new Date().toISOString().split('T')[0]
                            }
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to create draft: ${response.status}`);
                }

                const result = await response.json();

                this.showNotification(`Draft "${title}" created`, 'success');

                // Open the new draft
                await this.openDraft(result.draft.id);

                // Close modal
                this.closeModal();

            } catch (error) {
                console.error('Error creating draft:', error);
                this.showNotification('Failed to create draft', 'error');
            }
        },

        /**
         * Open draft for editing
         */
        openDraft: async function(draftId) {
            try {
                const response = await fetch(`${this.getApiUrl()}/api/drafts/${draftId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load draft: ${response.status}`);
                }

                const result = await response.json();
                const draft = result.draft;
                const diagramData = draft.diagram_data;

                // Load draft data into state
                const state = window.CoopMaps.state;
                state.data.enterprises = diagramData.enterprises || [];
                state.data.relationships = diagramData.relationships || [];
                state.data.diagramProperties = diagramData.metadata || {};
                state.data.timeline = diagramData.timeline || [];
                state.data.annotations = diagramData.annotations || [];
                state.data.groups = diagramData.groups || [];

                // Load UI preferences
                if (diagramData.uiPreferences) {
                    state.ui.connectorStyle = diagramData.uiPreferences.connectorStyle || 'orthogonal';
                    if (diagramData.uiPreferences.canvasSize) {
                        state.ui.canvasSize = diagramData.uiPreferences.canvasSize;
                    }
                }

                // Re-render canvas
                if (window.CoopMaps.modules?.canvas && window.CoopMaps.modules.canvas.render) {
                    window.CoopMaps.modules.canvas.render();
                }

                // Start auto-save
                if (window.CoopMaps.modules?.autoSave) {
                    window.CoopMaps.modules.autoSave.startAutoSave(draftId);
                }

                // Join collaboration room
                if (window.CoopMaps.modules?.draftCollaboration) {
                    window.CoopMaps.modules.draftCollaboration.joinDraft(draftId);
                }

                this.showNotification(`Loaded: ${draft.title}`, 'success');

                // Close modal
                this.closeModal();

            } catch (error) {
                console.error('Error loading draft:', error);
                this.showNotification('Failed to load draft', 'error');
            }
        },

        /**
         * Delete draft
         */
        deleteDraft: async function(draftId) {
            if (!confirm('Are you sure you want to delete this draft? This cannot be undone.')) {
                return;
            }

            try {
                const response = await fetch(`${this.getApiUrl()}/api/drafts/${draftId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete draft: ${response.status}`);
                }

                this.showNotification('Draft deleted', 'success');

                // Refresh drafts list
                await this.loadDrafts();
                this.renderModal();

            } catch (error) {
                console.error('Error deleting draft:', error);
                this.showNotification('Failed to delete draft', 'error');
            }
        },

        /**
         * Show submit dialog
         */
        showSubmitDialog: function(draftId) {
            // TODO: Implement submit dialog
            alert(`Submit dialog for draft ${draftId} - To be implemented`);
        },

        /**
         * Show collaborators dialog
         */
        showCollaboratorsDialog: function(draftId) {
            // TODO: Implement collaborators dialog
            alert(`Collaborators dialog for draft ${draftId} - To be implemented`);
        },

        /**
         * Close modal
         */
        closeModal: function() {
            const modal = document.getElementById('myMapsModal');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        /**
         * Format date
         */
        formatDate: function(dateString) {
            if (!dateString) return 'Never';

            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

            return date.toLocaleDateString();
        },

        /**
         * Escape HTML
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        /**
         * Show notification
         */
        showNotification: function(message, type) {
            if (window.CoopMaps.showNotification) {
                window.CoopMaps.showNotification(message, type);
            } else {
                console.log(`[${type}] ${message}`);
            }
        },

        /**
         * Get API URL
         */
        getApiUrl: function() {
            return window.CoopMapsConfig?.API_BASE_URL?.replace(/\/api$/, '') || '';
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

    // Register module with CoopMaps
    if (window.CoopMaps.registerModule) {
        window.CoopMaps.registerModule('myMaps', MyMapsModule);
    } else {
        window.CoopMaps.modules = window.CoopMaps.modules || {};
        window.CoopMaps.modules.myMaps = MyMapsModule;
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            MyMapsModule.init();
        });
    } else {
        MyMapsModule.init();
    }

})();
