/**
 * API Client for Co-opMaps Community Maps
 * Handles all backend API calls
 */

const CoopMapsAPI = {
    baseURL: '/api',

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
         * Approve submission
         */
        async approveSubmission(adminPassword, submissionId, adminNotes = null, notifyAuthor = true) {
            return CoopMapsAPI.request(`/admin/submissions/${submissionId}/approve`, {
                method: 'POST',
                headers: {
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({
                    adminNotes,
                    notifyAuthor
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
        }
    }
};

// Make available globally
window.CoopMapsAPI = CoopMapsAPI;
