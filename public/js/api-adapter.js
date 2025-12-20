/**
 * API Adapter - Universal HTTP client
 * Works with both modern (fetch) and legacy (XMLHttpRequest) browsers
 */

(function(window) {
    'use strict';

    var API_BASE_URL = window.location.origin + '/api';

    // Check if we have fetch support
    var hasFetch = typeof fetch !== 'undefined';

    /**
     * Make HTTP request (works in all browsers)
     */
    function request(method, url, data, options) {
        options = options || {};

        // Use fetch if available (modern browsers)
        if (hasFetch && !options.forceLegacy) {
            return fetchRequest(method, url, data, options);
        }

        // Fallback to XMLHttpRequest (legacy browsers)
        return xhrRequest(method, url, data, options);
    }

    /**
     * Modern fetch-based request
     */
    function fetchRequest(method, url, data, options) {
        var config = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add auth token if available
        var token = getAuthToken();
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }

        // Add custom headers
        if (options.headers) {
            for (var key in options.headers) {
                config.headers[key] = options.headers[key];
            }
        }

        // Add body for POST/PUT/PATCH
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        return fetch(API_BASE_URL + url, config)
            .then(function(response) {
                if (!response.ok) {
                    return response.json().then(function(err) {
                        throw new Error(err.error || 'Request failed');
                    });
                }
                return response.json();
            });
    }

    /**
     * Legacy XMLHttpRequest-based request
     */
    function xhrRequest(method, url, data, options) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, API_BASE_URL + url, true);

            // Set headers
            xhr.setRequestHeader('Content-Type', 'application/json');

            var token = getAuthToken();
            if (token) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            }

            if (options.headers) {
                for (var key in options.headers) {
                    xhr.setRequestHeader(key, options.headers[key]);
                }
            }

            // Handle response
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    try {
                        var error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || 'Request failed'));
                    } catch (e) {
                        reject(new Error('Request failed with status ' + xhr.status));
                    }
                }
            };

            xhr.onerror = function() {
                reject(new Error('Network error'));
            };

            xhr.ontimeout = function() {
                reject(new Error('Request timeout'));
            };

            // Set timeout (30 seconds)
            xhr.timeout = 30000;

            // Send request
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                xhr.send(JSON.stringify(data));
            } else {
                xhr.send();
            }
        });
    }

    /**
     * Get auth token from localStorage
     */
    function getAuthToken() {
        try {
            return localStorage.getItem('auth_token');
        } catch (e) {
            return null;
        }
    }

    /**
     * Set auth token in localStorage
     */
    function setAuthToken(token) {
        try {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Promise polyfill for IE11
     */
    if (typeof Promise === 'undefined') {
        // Very basic Promise polyfill
        window.Promise = function(executor) {
            var callbacks = { success: [], error: [] };
            var state = 'pending';
            var value;

            function resolve(result) {
                if (state !== 'pending') return;
                state = 'fulfilled';
                value = result;
                callbacks.success.forEach(function(cb) { cb(result); });
            }

            function reject(error) {
                if (state !== 'pending') return;
                state = 'rejected';
                value = error;
                callbacks.error.forEach(function(cb) { cb(error); });
            }

            this.then = function(onSuccess, onError) {
                if (state === 'fulfilled' && onSuccess) {
                    onSuccess(value);
                } else if (state === 'rejected' && onError) {
                    onError(value);
                } else {
                    if (onSuccess) callbacks.success.push(onSuccess);
                    if (onError) callbacks.error.push(onError);
                }
                return this;
            };

            this.catch = function(onError) {
                return this.then(null, onError);
            };

            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        };
    }

    /**
     * Public API
     */
    var API = {
        // Configuration
        baseURL: API_BASE_URL,
        setBaseURL: function(url) {
            API_BASE_URL = url;
            this.baseURL = url;
        },

        // Auth
        getToken: getAuthToken,
        setToken: setAuthToken,
        clearToken: function() {
            setAuthToken(null);
        },

        // HTTP methods
        get: function(url, options) {
            return request('GET', url, null, options);
        },

        post: function(url, data, options) {
            return request('POST', url, data, options);
        },

        put: function(url, data, options) {
            return request('PUT', url, data, options);
        },

        patch: function(url, data, options) {
            return request('PATCH', url, data, options);
        },

        delete: function(url, options) {
            return request('DELETE', url, null, options);
        },

        // Auth endpoints
        auth: {
            register: function(email, password, fullName, organization) {
                return API.post('/auth/register', {
                    email: email,
                    password: password,
                    full_name: fullName,
                    organization: organization
                }).then(function(response) {
                    if (response.accessToken) {
                        setAuthToken(response.accessToken);
                    }
                    return response;
                });
            },

            login: function(email, password) {
                return API.post('/auth/login', {
                    email: email,
                    password: password
                }).then(function(response) {
                    if (response.accessToken) {
                        setAuthToken(response.accessToken);
                    }
                    return response;
                });
            },

            logout: function() {
                return API.post('/auth/logout').then(function(response) {
                    setAuthToken(null);
                    return response;
                });
            },

            refresh: function() {
                return API.post('/auth/refresh').then(function(response) {
                    if (response.accessToken) {
                        setAuthToken(response.accessToken);
                    }
                    return response;
                });
            }
        },

        // Diagram endpoints
        diagrams: {
            list: function(page, limit) {
                var url = '/diagrams?page=' + (page || 1) + '&limit=' + (limit || 20);
                return API.get(url);
            },

            get: function(id) {
                return API.get('/diagrams/' + id);
            },

            create: function(diagramData) {
                return API.post('/diagrams', diagramData);
            },

            update: function(id, updates) {
                return API.put('/diagrams/' + id, updates);
            },

            delete: function(id) {
                return API.delete('/diagrams/' + id);
            },

            duplicate: function(id) {
                return API.post('/diagrams/' + id + '/duplicate');
            }
        },

        // User endpoints
        user: {
            getProfile: function() {
                return API.get('/users/me');
            },

            updateProfile: function(updates) {
                return API.put('/users/me', updates);
            },

            getStats: function() {
                return API.get('/users/me/stats');
            }
        },

        // Public endpoints (no auth required)
        public: {
            listDiagrams: function(page, limit, query) {
                var url = '/public/diagrams?page=' + (page || 1) + '&limit=' + (limit || 20);
                if (query) url += '&q=' + encodeURIComponent(query);
                return API.get(url);
            },

            getDiagram: function(id) {
                return API.get('/public/diagrams/' + id);
            },

            getTemplates: function() {
                return API.get('/public/templates');
            },

            getStats: function() {
                return API.get('/public/stats');
            }
        }
    };

    // Export to global scope
    window.CoopMapsAPI = API;

    // Also support CommonJS/AMD if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = API;
    }

})(window);
