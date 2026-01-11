/**
 * Configuration for Co-op Maps
 * Environment-aware API configuration
 */

(function() {
    // Detect environment based on hostname
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const isProduction = hostname.includes('railway.app') || hostname.includes('co-op-maps');

    // Determine API base URL based on environment
    let apiBaseUrl;
    if (isLocalDev) {
        // Local development - use relative path
        apiBaseUrl = '/api';
    } else if (isProduction) {
        // Production - use same origin
        apiBaseUrl = window.location.origin + '/api';
    } else {
        // Fallback for other environments (staging, etc.)
        apiBaseUrl = window.location.origin + '/api';
    }

    window.CoopMapsConfig = {
        API_BASE_URL: apiBaseUrl,
        IS_PRODUCTION: isProduction,
        IS_LOCAL_DEV: isLocalDev
    };
})();
