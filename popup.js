document.addEventListener('DOMContentLoaded', function() {
    const visibleBtn = document.getElementById('visibleScreenshot');
    const fullBtn = document.getElementById('fullScreenshot');
    const status = document.getElementById('status');
  
    // Function to update status
    function updateStatus(message, type = 'info') {
      status.textContent = message;
      status.className = `status ${type}`;
    }
  
    // Function to take visible screenshot
    async function takeVisibleScreenshot() {
      try {
        updateStatus('Taking visible screenshot...', 'loading');
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Execute the screenshot function in the content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: captureVisibleArea
        });
        
        updateStatus('Visible screenshot captured!', 'success');
      } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
      }
    }
  
    // Function to take full page screenshot
    async function takeFullScreenshot() {
      try {
        updateStatus('Taking full page screenshot...', 'loading');
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Execute the full screenshot function in the content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: captureFullPage
        });
        
        updateStatus('Full page screenshot captured!', 'success');
      } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
      }
    }
  
    // Event listeners
    visibleBtn.addEventListener('click', takeVisibleScreenshot);
    fullBtn.addEventListener('click', takeFullScreenshot);
  
    // Functions that will be injected into the page
    function captureVisibleArea() {
      // This function will be executed in the context of the webpage
      chrome.runtime.sendMessage({
        action: 'captureVisible',
        data: {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString()
        }
      });
    }
  
    function captureFullPage() {
      // This function will be executed in the context of the webpage
      chrome.runtime.sendMessage({
        action: 'captureFull',
        data: {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString()
        }
      });
    }
  });