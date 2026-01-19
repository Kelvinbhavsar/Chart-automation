// Background service worker for extension

// Track active capture tabs
let activeCaptureTabs = new Map();

// Listen for tabs with request_token in URL (Kite redirect)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const requestToken = url.searchParams.get('request_token');
      
      if (requestToken && requestToken.length >= 10) {
        console.log('Request token detected in URL:', requestToken.substring(0, 4) + '...');
        
        // Store request token for popup to pick up
        chrome.storage.local.set({ pending_request_token: requestToken });
        
        // Try to send to popup if it's open
        chrome.runtime.sendMessage({
          action: 'requestTokenReceived',
          requestToken: requestToken
        }).catch(() => {
          // Popup might not be open, that's okay - it's stored
          console.log('Popup not open, token stored for later');
        });
        
        // Close redirect page after a moment if it's localhost/redirect
        if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1') || url.searchParams.has('request_token')) {
          setTimeout(() => {
            chrome.tabs.remove(tabId).catch(() => {
              // Tab might already be closed
            });
          }, 2000);
        }
      }
    } catch (error) {
      // Not a valid URL or parsing error, ignore
    }
  }
});

// Handle opening tab and capturing screenshot
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'stopCapture') {
    // Close all active capture tabs
    activeCaptureTabs.forEach((tabId, index) => {
      chrome.tabs.remove(tabId, () => {});
    });
    activeCaptureTabs.clear();
    sendResponse({ success: true, message: 'Stopped all capture operations' });
    return true;
  }
  
  if (request.action === 'openTabAndCapture') {
    // Open new tab
    chrome.tabs.create({ url: request.url }, (tab) => {
      // Track this tab
      activeCaptureTabs.set(request.index, tab.id);
      // Wait for tab to load
      const checkTab = (tabId) => {
        chrome.tabs.get(tabId, (tabInfo) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          
          if (tabInfo.status === 'complete') {
            // Wait a bit more for chart to render
            setTimeout(() => {
              // Capture screenshot
              chrome.tabs.captureVisibleTab(null, {
                format: 'png',
                quality: 100
              }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                  chrome.tabs.remove(tabId);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  return;
                }
                
                // Create filename
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `NIFTY_${request.strike}_${request.type}_${timestamp}.png`;
                
                // Download the screenshot
                chrome.downloads.download({
                  url: dataUrl,
                  filename: filename,
                  saveAs: false
                }, (downloadId) => {
                  // Remove from tracking
                  activeCaptureTabs.delete(request.index);
                  
                  // Close the tab
                  chrome.tabs.remove(tabId);
                  
                  if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    sendResponse({ success: true, downloadId, filename: filename });
                  }
                });
              });
            }, 4000); // Wait 4 seconds for chart to load
          } else {
            // Tab still loading, check again
            setTimeout(() => checkTab(tabId), 500);
          }
        });
      };
      
      // Start checking when tab is ready
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          checkTab(tabId);
        }
      });
    });
    
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'captureScreenshot') {
    // Capture visible tab
    chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // Download the screenshot
      chrome.downloads.download({
        url: dataUrl,
        filename: request.filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId, filename: request.filename });
        }
      });
    });
    
    return true; // Will respond asynchronously
  }
});
