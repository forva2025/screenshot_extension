// Content script: currently not injecting any external scripts to avoid CSP issues.
(function() {
    'use strict';
    // Intentionally left minimal. All capture logic happens from the popup using
    // chrome.tabs.captureVisibleTab and scripting APIs to avoid page CSP.
})();