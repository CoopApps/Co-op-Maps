/**
 * API Client for Co-op Maps Community Maps
 * Handles all backend API calls
 */

const CoopMapsAPI = {
    baseURL: (typeof window.CoopMapsConfig !== 'undefined') ? window.CoopMapsConfig.API_BASE_URL : '/api',

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Get approved maps for public gallery
     */
    async getApprovedMaps(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        if (params.search) queryParams.append('search', params.search);
        if (params.tags) queryParams.append('tags', params.tags.join(','));

        const query = queryParams.toString();
        return this.request(`/maps/approved${query ? '?' + query : ''}`);
    },

    /**
     * Get specific map by ID
     */
    async getMap(mapId) {
        return this.request(`/maps/${mapId}`);
    },

    /**
     * Submit new map
     */
    async submitMap(mapData) {
        return this.request('/maps/submit', {
            method: 'POST',
            body: JSON.stringify(mapData)
        });
    },

    // ========================================================================
    // DRAFT MANAGEMENT API
    // ========================================================================

    /**
     * Create new draft
     */
    async createDraft(draftData, accessToken) {
        return this.request('/drafts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(draftData)
        });
    },

    /**
     * Get all user's drafts
     */
    async getDrafts(accessToken) {
        return this.request('/drafts', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Get specific draft by ID
     */
    async getDraft(draftId, accessToken) {
        return this.request(`/drafts/${draftId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Update draft (for auto-save)
     */
    async updateDraft(draftId, updateData, accessToken) {
        return this.request(`/drafts/${draftId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(updateData)
        });
    },

    /**
     * Delete draft
     */
    async deleteDraft(draftId, accessToken) {
        return this.request(`/drafts/${draftId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Submit draft for review
     */
    async submitDraft(draftId, submissionData, accessToken) {
        return this.request(`/drafts/${draftId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(submissionData)
        });
    },

    // ========================================================================
    // COLLABORATOR MANAGEMENT API
    // ========================================================================

    /**
     * Get collaborators for a draft
     */
    async getCollaborators(draftId, accessToken) {
        return this.request(`/drafts/${draftId}/collaborators`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Add collaborator to draft
     */
    async addCollaborator(draftId, email, permission, accessToken) {
        return this.request(`/drafts/${draftId}/collaborators`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ email, permission })
        });
    },

    /**
     * Remove collaborator from draft
     */
    async removeCollaborator(draftId, collaboratorId, accessToken) {
        return this.request(`/drafts/${draftId}/collaborators/${collaboratorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Update collaborator permission
     */
    async updateCollaboratorPermission(draftId, collaboratorId, permission, accessToken) {
        return this.request(`/drafts/${draftId}/collaborators/${collaboratorId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ permission })
        });
    },

    // ========================================================================
    // USER SUBMISSIONS API
    // ========================================================================

    /**
     * Get user's submitted maps
     */
    async getMySubmissions(params = {}, accessToken) {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);

        const query = queryParams.toString();
        return this.request(`/submissions/my-submissions${query ? '?' + query : ''}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Get user's submission statistics
     */
    async getSubmissionStats(accessToken) {
        return this.request('/submissions/my-submissions/stats', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    /**
     * Get specific submission details
     */
    async getSubmission(submissionId, accessToken) {
        return this.request(`/submissions/${submissionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    },

    // ========================================================================
    // AUTH & ACCOUNT RECOVERY API
    // ========================================================================

    /**
     * Request password reset
     */
    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    },

    /**
     * Contact admin (for account recovery or general inquiries)
     */
    async contactAdmin(name, email, subject, message) {
        return this.request('/auth/contact-admin', {
            method: 'POST',
            body: JSON.stringify({ name, email, subject, message })
        });
    },

    /**
     * Edit existing map
     */
    async editMap(mapId, diagramData, password, thumbnail = null) {
        return this.request(`/maps/${mapId}/edit`, {
            method: 'PUT',
            headers: {
                'X-Map-Password': password
            },
            body: JSON.stringify({
                diagramData,
                thumbnail
            })
        });
    },

    /**
     * Verify map password
     */
    async verifyMapPassword(mapId, password) {
        return this.request(`/maps/${mapId}/verify-password`, {
            headers: {
                'X-Map-Password': password
            }
        });
    },

    // Admin API
    admin: {
        /**
         * Get dashboard statistics
         */
        async getStats(adminPassword) {
            return CoopMapsAPI.request('/admin/stats', {
                headers: {
                    'X-Admin-Password': adminPassword
                }
            });
        },

        /**
         * Get all submissions
         */
        async getSubmissions(adminPassword, params = {}) {
            const queryParams = new URLSearchParams();
            if (params.status) queryParams.append('status', params.status);
            if (params.author) queryParams.append('author', params.author);
            if (params.search) queryParams.append('search', params.search);
            if (params.sort) queryParams.append('sort', params.sort);
            if (params.order) queryParams.append('order', params.order);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.offset) queryParams.append('offset', params.offset);

            const query = queryParams.toString();
            return CoopMapsAPI.request(`/admin/submissions${query ? '?' + query : ''}`, {
                headers: {
                    'X-Admin-Password': adminPassword
                }
            });
        },

        /**
         * Get submission details
         */
        async getSubmission(adminPassword, submissionId) {
            return CoopMapsAPI.request(`/admin/submissions/${submissionId}`, {
                headers: {
                    'X-Admin-Password': adminPassword
                }
            });
        },

        /**
         * Approve submission and assign official WDR
         */
        async approveSubmission(adminPassword, submissionId, adminNotes = null, notifyAuthor = true, customWdr = null) {
            return CoopMapsAPI.request(`/admin/submissions/${submissionId}/approve`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    adminNotes,
                    notifyAuthor,
                    customWdr
                })
            });
        },

        /**
         * Request changes from creator
         */
        async requestChanges(adminPassword, submissionId, message, checklist = []) {
            return CoopMapsAPI.request(`/admin/submissions/${submissionId}/request-changes`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    message,
                    checklist
                })
            });
        },

        /**
         * Reject submission
         */
        async rejectSubmission(adminPassword, submissionId, reason, message, deleteMap = false) {
            return CoopMapsAPI.request(`/admin/submissions/${submissionId}/reject`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    reason,
                    message,
                    deleteMap
                })
            });
        },

        /**
         * Unpublish map
         */
        async unpublishMap(adminPassword, mapId, reason, notifyAuthor = true) {
            return CoopMapsAPI.request(`/admin/maps/${mapId}/unpublish`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    reason,
                    notifyAuthor
                })
            });
        },

        /**
         * Get moderation history
         */
        async getHistory(adminPassword, mapId) {
            return CoopMapsAPI.request(`/admin/maps/${mapId}/history`, {
                headers: {
                    'X-Admin-Password': adminPassword
                }
            });
        },

        /**
         * Perform bulk action
         */
        async bulkAction(adminPassword, action, mapIds, data = {}) {
            return CoopMapsAPI.request('/admin/bulk-action', {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    action,
                    mapIds,
                    data
                })
            });
        },

        /**
         * Reset map password
         */
        async resetMapPassword(adminPassword, mapId, newPassword) {
            return CoopMapsAPI.request(`/admin/maps/${mapId}/reset-password`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    newPassword
                })
            });
        }
    }
};

// Make available globally
window.CoopMapsAPI = CoopMapsAPI;
