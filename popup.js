document.addEventListener('DOMContentLoaded', function() {
    const visibleBtn = document.getElementById('visibleScreenshot');
    const fullBtn = document.getElementById('fullScreenshot');
    const status = document.getElementById('status');
    const preview = document.getElementById('preview');
    const previewImg = document.getElementById('previewImg');
    const downloadBtn = document.getElementById('downloadBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    let pendingDataUrl = null;
  
    // Function to update status
    function updateStatus(message, type = 'info') {
      status.textContent = message;
      status.className = `status ${type}`;
    }
  
    // Function to take visible screenshot (use built-in capture)
    async function takeVisibleScreenshot() {
      try {
        updateStatus('Taking visible screenshot...', 'loading');
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
        showPreview(dataUrl);
      } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
      }
    }
  
    // Function to capture the entire page (scroll + stitch the current tab)
    async function takeFullScreenshot() {
      try {
        updateStatus('Preparing full page capture...', 'loading');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [{ result: metrics }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            totalHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
            originalY: window.scrollY
          })
        });

        const slices = [];
        const step = metrics.viewportHeight;
        for (let y = 0; y < metrics.totalHeight; y += step) {
          const sliceHeight = Math.min(step, metrics.totalHeight - y);
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (posY) => new Promise((resolve) => {
              window.scrollTo(0, posY);
              requestAnimationFrame(() => setTimeout(resolve, 120));
            }),
            args: [y]
          });
          const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
          slices.push({ dataUrl, y, sliceHeight });
          updateStatus(`Capturing... ${Math.min(y + step, metrics.totalHeight)} / ${metrics.totalHeight}`, 'loading');
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (y) => window.scrollTo(0, y),
          args: [metrics.originalY]
        });

        updateStatus('Stitching images...', 'loading');
        const stitchedDataUrl = await stitchSlices(slices, metrics);
        showPreview(stitchedDataUrl);
      } catch (error) {
        updateStatus('Error: ' + (error && error.message ? error.message : String(error)), 'error');
      }
    }
  
    // Event listeners
    visibleBtn.addEventListener('click', takeVisibleScreenshot);
    fullBtn.addEventListener('click', takeFullScreenshot);
  
    // Helper stitcher in popup context
    async function stitchSlices(slices, metrics) {
      const dpr = metrics.dpr;
      const images = await Promise.all(slices.map(loadImage));
      const imgWidth = images[0].naturalWidth;
      const totalHeightPx = Math.round(metrics.totalHeight * dpr);
      const viewportHeightPx = Math.round(metrics.viewportHeight * dpr);

      const canvas = document.createElement('canvas');
      canvas.width = imgWidth;
      canvas.height = totalHeightPx;
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < images.length; i++) {
        const { y, sliceHeight } = slices[i];
        const img = images[i];
        const drawY = Math.round(y * dpr);
        const slicePx = Math.round(sliceHeight * dpr);
        const sy = viewportHeightPx - slicePx;
        ctx.drawImage(img, 0, sy, imgWidth, slicePx, 0, drawY, imgWidth, slicePx);
      }
      return canvas.toDataURL('image/png');
    }

    function loadImage(slice) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = slice.dataUrl;
      });
    }

    // Preview helpers
    function showPreview(dataUrl) {
      pendingDataUrl = dataUrl;
      previewImg.src = dataUrl;
      preview.style.display = 'block';
      updateStatus('Review your screenshot below. Choose Download or Retake.', 'info');
    }

    // Clicking the preview image should do nothing per request

    downloadBtn?.addEventListener('click', async () => {
      if (!pendingDataUrl) return;
      const filename = `screenshot_${Date.now()}.png`;
      // Fire and forget; background will send downloadStarted optionally
      chrome.runtime.sendMessage({
        action: 'downloadScreenshot',
        data: { url: pendingDataUrl, filename, type: 'preview' }
      });
      updateStatus('Download started.', 'success');
    });

    retakeBtn?.addEventListener('click', () => {
      pendingDataUrl = null;
      previewImg.src = '';
      preview.style.display = 'none';
      updateStatus('Ready. Choose a capture option.', 'info');
    });
  });