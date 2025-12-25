/**
 * Browser Detection and Feature Detection
 * Automatically redirects to appropriate version based on browser capabilities
 */

(function() {
    'use strict';

    // Feature detection for modern browsers
    var features = {
        promise: typeof Promise !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        websocket: typeof WebSocket !== 'undefined',
        localStorage: (function() {
            try {
                var test = '__test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch(e) {
                return false;
            }
        })(),
        es6: (function() {
            try {
                eval('const x = () => {};');
                return true;
            } catch(e) {
                return false;
            }
        })(),
        canvas: (function() {
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        })(),
        classlist: 'classList' in document.createElement('div'),
        queryselector: !!document.querySelector,
        json: typeof JSON !== 'undefined' && JSON.parse && JSON.stringify
    };

    // Determine if browser is "modern" (needs most features)
    var isModern = features.promise &&
                   features.localStorage &&
                   features.canvas &&
                   features.queryselector &&
                   features.json;

    // Determine if browser is "legacy but supported" (IE11, old Chrome/Firefox)
    var isLegacy = !isModern &&
                   features.localStorage &&
                   features.canvas &&
                   features.queryselector &&
                   features.json;

    // Too old to support
    var isTooOld = !features.canvas || !features.queryselector || !features.json;

    // Browser information
    var ua = navigator.userAgent;
    var browserInfo = {
        isIE: ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident/') !== -1,
        isEdge: ua.indexOf('Edge/') !== -1,
        isChrome: ua.indexOf('Chrome/') !== -1 && ua.indexOf('Edge/') === -1,
        isFirefox: ua.indexOf('Firefox/') !== -1,
        isSafari: ua.indexOf('Safari/') !== -1 && ua.indexOf('Chrome/') === -1,
        isOpera: ua.indexOf('Opera/') !== -1 || ua.indexOf('OPR/') !== -1,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    };

    // Connection speed detection (if available)
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var isSlowConnection = false;

    if (connection) {
        var effectiveType = connection.effectiveType;
        isSlowConnection = effectiveType === 'slow-2g' ||
                          effectiveType === '2g' ||
                          effectiveType === '3g';
    }

    // Store detection results globally
    window.BrowserCapabilities = {
        features: features,
        isModern: isModern,
        isLegacy: isLegacy,
        isTooOld: isTooOld,
        browserInfo: browserInfo,
        isSlowConnection: isSlowConnection,

        // Recommended version
        recommendedVersion: isTooOld ? 'unsupported' : (isModern && !isSlowConnection ? 'modern' : 'legacy')
    };

    // Auto-redirect to appropriate version
    function redirectToAppropriateVersion() {
        var currentPath = window.location.pathname;
        var isOnLegacy = currentPath.indexOf('legacy.html') !== -1;
        var isOnModern = currentPath.indexOf('index.html') !== -1 || currentPath === '/';
        var shouldUseLegacy = window.BrowserCapabilities.recommendedVersion === 'legacy';

        // Don't redirect if URL has ?noredirect parameter (for testing)
        if (window.location.search.indexOf('noredirect') !== -1) {
            return;
        }

        // Redirect to legacy if needed
        if (shouldUseLegacy && isOnModern) {
            console.log('Redirecting to legacy version for better compatibility');
            window.location.href = 'legacy.html';
        }

        // Redirect to modern if on legacy but browser supports it
        if (!shouldUseLegacy && isOnLegacy) {
            console.log('Redirecting to modern version');
            window.location.href = 'index.html';
        }
    }

    // Show browser compatibility warning if needed
    function showCompatibilityWarning() {
        if (window.BrowserCapabilities.isTooOld) {
            var warning = document.createElement('div');
            warning.id = 'browser-warning';
            warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff6b6b;color:white;padding:15px;text-align:center;z-index:99999;font-family:Arial,sans-serif;';
            warning.innerHTML =
                '<strong><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Browser Not Supported</strong><br>' +
                'Your browser is too old to run Co-op Maps. Please upgrade to:<br>' +
                'Chrome 49+, Firefox 52+, Safari 10+, or Edge 14+';
            document.body.insertBefore(warning, document.body.firstChild);
            return;
        }

        if (window.BrowserCapabilities.isLegacy) {
            var info = document.createElement('div');
            info.id = 'legacy-info';
            info.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#4a90e2;color:white;padding:10px 15px;border-radius:5px;font-size:12px;z-index:9999;font-family:Arial,sans-serif;max-width:300px;';
            info.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.77.77M1 12h1M4.22 19.78l.77-.77M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg><strong>Legacy Mode</strong><br>' +
                'Running in compatibility mode for your browser. ' +
                'Some features may be limited.';

            // Auto-hide after 10 seconds
            setTimeout(function() {
                info.style.transition = 'opacity 0.5s';
                info.style.opacity = '0';
                setTimeout(function() { info.remove(); }, 500);
            }, 10000);

            document.body.appendChild(info);
        }
    }

    // Log browser capabilities for debugging
    function logCapabilities() {
        if (window.console && console.log) {
            console.log('Co-op Maps Browser Detection:');
            console.log('- Modern Browser:', window.BrowserCapabilities.isModern);
            console.log('- Legacy Browser:', window.BrowserCapabilities.isLegacy);
            console.log('- Too Old:', window.BrowserCapabilities.isTooOld);
            console.log('- Recommended Version:', window.BrowserCapabilities.recommendedVersion);
            console.log('- Features:', window.BrowserCapabilities.features);
            console.log('- Browser:', window.BrowserCapabilities.browserInfo);
            console.log('- Slow Connection:', window.BrowserCapabilities.isSlowConnection);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            redirectToAppropriateVersion();
            showCompatibilityWarning();
            logCapabilities();
        });
    } else {
        redirectToAppropriateVersion();
        showCompatibilityWarning();
        logCapabilities();
    }

    // Polyfills for common missing features
    if (!window.console) {
        window.console = {
            log: function() {},
            error: function() {},
            warn: function() {},
            info: function() {}
        };
    }

    // Array.isArray polyfill (for IE8 and below, though we don't fully support it)
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    // Array.forEach polyfill
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(callback, thisArg) {
            var T, k;
            if (this == null) {
                throw new TypeError('this is null or not defined');
            }
            var O = Object(this);
            var len = O.length >>> 0;
            if (typeof callback !== 'function') {
                throw new TypeError(callback + ' is not a function');
            }
            if (arguments.length > 1) {
                T = thisArg;
            }
            k = 0;
            while (k < len) {
                var kValue;
                if (k in O) {
                    kValue = O[k];
                    callback.call(T, kValue, k, O);
                }
                k++;
            }
        };
    }

    // Object.keys polyfill
    if (!Object.keys) {
        Object.keys = (function() {
            var hasOwnProperty = Object.prototype.hasOwnProperty,
                hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
                dontEnums = [
                    'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
                    'isPrototypeOf', 'propertyIsEnumerable', 'constructor'
                ],
                dontEnumsLength = dontEnums.length;

            return function(obj) {
                if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
                    throw new TypeError('Object.keys called on non-object');
                }

                var result = [], prop, i;

                for (prop in obj) {
                    if (hasOwnProperty.call(obj, prop)) {
                        result.push(prop);
                    }
                }

                if (hasDontEnumBug) {
                    for (i = 0; i < dontEnumsLength; i++) {
                        if (hasOwnProperty.call(obj, dontEnums[i])) {
                            result.push(dontEnums[i]);
                        }
                    }
                }
                return result;
            };
        }());
    }

    // Date.now polyfill
    if (!Date.now) {
        Date.now = function() {
            return new Date().getTime();
        };
    }

})();
