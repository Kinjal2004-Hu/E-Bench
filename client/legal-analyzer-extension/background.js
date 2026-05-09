// Background service worker for E-Bench Legal Analyzer
console.log('[E-Bench Background] Loading...');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[E-Bench Background] Installed');
});

// Capture screenshot - captures the active tab of the focused window
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[E-Bench Background] Message received:', message);
  
  if (message.action === 'captureScreenshot') {
    try {
      // captureVisibleTab with no windowId captures the active tab in focused window
      chrome.tabs.captureVisibleTab({ format: 'png', quality: 90 })
        .then(dataUrl => {
          console.log('[E-Bench Background] Captured, length:', dataUrl ? dataUrl.length : 0);
          if (dataUrl) {
            sendResponse({ success: true, image: dataUrl });
          } else {
            sendResponse({ success: false, error: 'No image captured' });
          }
        })
        .catch(err => {
          console.error('[E-Bench Background] Capture error:', err);
          sendResponse({ success: false, error: err.message });
        });
      
      return true; // Indicates async response
    } catch (e) {
      console.error('[E-Bench Background] Exception:', e);
      sendResponse({ success: false, error: e.message });
      return false;
    }
  }
  return false;
});

console.log('[E-Bench Background] Ready');