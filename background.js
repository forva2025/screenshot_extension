// Background service worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'downloadScreenshot') {
      downloadScreenshot(request.data);
      try { sendResponse({ ok: true }); } catch (e) {}
      return;
    } else if (request.action === 'screenshotError') {
      console.error('Screenshot error:', request.error);
      try { sendResponse({ ok: true }); } catch (e) {}
      return;
    }
  });
  
  // Function to download the screenshot
  function downloadScreenshot(data) {
    // data.url is a data URL (base64). This is accessible to downloads API.
    chrome.downloads.download({
      url: data.url,
      filename: data.filename,
      saveAs: true
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        // Notify listeners if present; ignore if none
        try {
          chrome.runtime.sendMessage({ action: 'screenshotError', error: chrome.runtime.lastError.message || 'Download failed' }, () => {
            void chrome.runtime.lastError; // swallow if no receiver
          });
        } catch (e) {}
      } else {
        console.log('Screenshot downloaded with ID:', downloadId);
        try {
          chrome.runtime.sendMessage({ action: 'downloadStarted', filename: data.filename, type: data.type, downloadId: downloadId }, () => {
            void chrome.runtime.lastError; // swallow if no receiver
          });
        } catch (e) {}
      }
    });
  }
  
  // Handle extension installation
  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
      console.log('Screenshot extension installed');
    }
  });