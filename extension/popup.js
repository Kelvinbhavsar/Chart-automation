// Popup script for extension UI

document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const niftyInfo = document.getElementById('niftyInfo');
  const niftyPriceSpan = document.getElementById('niftyPrice');
  const apiConfigDiv = document.getElementById('apiConfig');
  const showAPIConfigBtn = document.getElementById('showAPIConfig');
  const saveAPICredsBtn = document.getElementById('saveAPICreds');
  const apiStatusDiv = document.getElementById('apiStatus');
  
  // Load saved API credentials
  loadAPICredentials();
  
  // Button to open Kite login page and auto-extract token
  const loginBtn = document.getElementById('loginBtn');
  loginBtn?.addEventListener('click', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = (apiKeyInput?.value || '').trim() || '3ngsjp3dclif0m3o';
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
    
    // Open login page in new tab
    chrome.tabs.create({ url: loginUrl });
    
    showAPIStatus('Login page opened. After login, the request token will be extracted automatically.', 'info');
    
    // Check for pending request token periodically
    const checkForToken = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get(['pending_request_token']);
        if (result.pending_request_token && result.pending_request_token.length >= 10) {
          const requestTokenInput = document.getElementById('requestToken');
          if (requestTokenInput) {
            requestTokenInput.value = result.pending_request_token;
            showAPIStatus('✓ Request token extracted! Click "Save & Generate Access Token"', 'success');
            chrome.storage.local.remove(['pending_request_token']);
            clearInterval(checkForToken);
          }
        }
      } catch (error) {
        console.error('Error checking for token:', error);
      }
    }, 1000);
    
    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(checkForToken);
    }, 300000);
  });
  
  // Listen for request token from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'requestTokenReceived' && message.requestToken) {
      const requestTokenInput = document.getElementById('requestToken');
      if (requestTokenInput) {
        requestTokenInput.value = message.requestToken;
        showAPIStatus('✓ Request token extracted! Click "Save & Generate Access Token"', 'success');
      }
      sendResponse({ success: true });
    }
  });
  
  // API Configuration handlers
  showAPIConfigBtn?.addEventListener('click', () => {
    const isVisible = apiConfigDiv.style.display !== 'none';
    apiConfigDiv.style.display = isVisible ? 'none' : 'block';
    showAPIConfigBtn.textContent = isVisible ? 'Configure API' : 'Hide API Config';
  });
  
  saveAPICredsBtn?.addEventListener('click', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const apiSecretInput = document.getElementById('apiSecret');
    const requestTokenInput = document.getElementById('requestToken');
    
    let apiKey = (apiKeyInput?.value || '').trim();
    let apiSecret = (apiSecretInput?.value || '').trim();
    const requestToken = (requestTokenInput?.value || '').trim();
    
    // If API key is empty, use default
    if (!apiKey) {
      apiKey = '3ngsjp3dclif0m3o';
      if (apiKeyInput) apiKeyInput.value = apiKey;
    }
    
    // If API secret is empty, use default
    if (!apiSecret) {
      apiSecret = 'p60rabo57qehlcvezoxmalev9i0k4tvb';
      if (apiSecretInput) apiSecretInput.value = apiSecret;
    }
    
    // Validate inputs
    if (!apiKey || apiKey.length < 6) {
      showAPIStatus('API Key is invalid or too short (minimum 6 characters)', 'error');
      apiKeyInput?.focus();
      return;
    }
    
    if (!apiSecret) {
      showAPIStatus('API Secret is required', 'error');
      apiSecretInput?.focus();
      return;
    }
    
    if (!apiSecret) {
      showAPIStatus('Please enter API Secret', 'error');
      apiSecretInput?.focus();
      return;
    }
    
    if (!requestToken || requestToken.length < 10) {
      showAPIStatus('Request Token must be at least 10 characters. Use "Login to Kite" button to get it.', 'error');
      requestTokenInput?.focus();
      return;
    }
    
    try {
      saveAPICredsBtn.disabled = true;
      saveAPICredsBtn.textContent = 'Generating...';
      showAPIStatus('Generating access token...', 'info');
      
      console.log('API Key length:', apiKey.length);
      console.log('API Key (first 4 chars):', apiKey.substring(0, 4));
      console.log('Request Token length:', requestToken.length);
      console.log('API Secret length:', apiSecret.length);
      
      // Check if generateAccessToken is available
      if (typeof generateAccessToken !== 'function') {
        throw new Error('generateAccessToken function not found. Please reload the extension.');
      }
      
      // Generate access token
      const accessToken = await generateAccessToken(apiKey, apiSecret, requestToken);
      
      // Save credentials
      await saveAPICredentials(apiKey, apiSecret, accessToken);
      
      showAPIStatus('✓ Access token generated and saved successfully!', 'success');
      document.getElementById('requestToken').value = ''; // Clear request token
      
      // Hide config after 2 seconds
      setTimeout(() => {
        apiConfigDiv.style.display = 'none';
        showAPIConfigBtn.textContent = 'Configure API';
      }, 2000);
    } catch (error) {
      showAPIStatus('Error: ' + error.message, 'error');
      console.error('Error saving credentials:', error);
    } finally {
      saveAPICredsBtn.disabled = false;
      saveAPICredsBtn.textContent = 'Save & Generate Access Token';
    }
  });
  
  // Load API credentials function
  async function loadAPICredentials() {
    try {
      const result = await chrome.storage.local.get(['api_key', 'api_secret', 'access_token']);
      const apiKeyInput = document.getElementById('apiKey');
      const apiSecretInput = document.getElementById('apiSecret');
      
      // Only overwrite if stored value exists and is not empty
      if (result.api_key && result.api_key.trim().length > 0) {
        apiKeyInput.value = result.api_key.trim();
      } else if (!apiKeyInput.value || apiKeyInput.value.trim().length === 0) {
        // Keep default value if no stored value and input is empty
        apiKeyInput.value = '3ngsjp3dclif0m3o';
      }
      
      if (result.api_secret && result.api_secret.trim().length > 0) {
        apiSecretInput.value = result.api_secret.trim();
      } else if (!apiSecretInput.value || apiSecretInput.value.trim().length === 0) {
        // Keep default value if no stored value and input is empty
        apiSecretInput.value = 'p60rabo57qehlcvezoxmalev9i0k4tvb';
      }
      
      // Check for pending request_token
      if (result.pending_request_token && result.pending_request_token.length >= 10) {
        const requestTokenInput = document.getElementById('requestToken');
        if (requestTokenInput) {
          requestTokenInput.value = result.pending_request_token;
          showAPIStatus('✓ Request token found! Click "Save & Generate Access Token"', 'success');
          // Clear pending token
          chrome.storage.local.remove(['pending_request_token']);
        }
      }
      
      if (result.access_token && result.access_token.trim().length > 0) {
        showAPIStatus('✓ Access token is configured', 'success');
      } else {
        showAPIStatus('⚠ Access token not set. Please configure API.', 'error');
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }
  
  // Show API status
  function showAPIStatus(message, type) {
    apiStatusDiv.textContent = message;
    apiStatusDiv.style.display = 'block';
    apiStatusDiv.className = '';
    if (type === 'success') {
      apiStatusDiv.style.backgroundColor = '#e8f5e9';
      apiStatusDiv.style.color = '#388e3c';
    } else if (type === 'error') {
      apiStatusDiv.style.backgroundColor = '#ffebee';
      apiStatusDiv.style.color = '#c62828';
    } else {
      apiStatusDiv.style.backgroundColor = '#e3f2fd';
      apiStatusDiv.style.color = '#1976d2';
    }
  }

  // Check if we're on Kite page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      statusDiv.className = 'status error';
      statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
      return;
    }

    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url || !currentTab.url.includes('kite.zerodha.com')) {
      statusDiv.className = 'status error';
      statusDiv.textContent = 'Please open Zerodha Kite page first';
      captureBtn.disabled = true;
      return;
    }

    // Get Nifty price from content script
    chrome.tabs.sendMessage(currentTab.id, { action: 'getNiftyPrice' }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.className = 'status error';
        statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message + '. Make sure you refresh the Kite page.';
        return;
      }

      if (response && response.price) {
        niftyPriceSpan.textContent = response.price;
        niftyInfo.style.display = 'block';
        statusDiv.className = 'status success';
        statusDiv.textContent = `Nifty price detected: ${response.price}`;
      } else {
        statusDiv.className = 'status info';
        statusDiv.textContent = 'Nifty price not detected. Make sure Nifty chart is visible and refresh the page.';
      }
    });
  });

  // Capture button click
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    stopBtn.style.display = 'block';
    statusDiv.className = 'status info';
    statusDiv.textContent = 'Starting capture... Please wait...';

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      const tab = tabs[0];
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send message to content script to start capture
      chrome.tabs.sendMessage(tab.id, { action: 'captureOptions' }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.className = 'status error';
          statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message + '. Try refreshing the Kite page.';
          captureBtn.disabled = false;
          stopBtn.style.display = 'none';
          return;
        }

        if (response && response.success) {
          statusDiv.className = 'status success';
          statusDiv.textContent = `Success! Captured ${response.count || 10} screenshots`;
        } else if (response && response.stopped) {
          statusDiv.className = 'status info';
          statusDiv.textContent = `Stopped. Captured ${response.count || 0} screenshots before stopping.`;
        } else {
          statusDiv.className = 'status error';
          statusDiv.textContent = response?.error || 'Failed to capture screenshots';
        }
        captureBtn.disabled = false;
        stopBtn.style.display = 'none';
      });
    } catch (error) {
      statusDiv.className = 'status error';
      statusDiv.textContent = 'Error: ' + error.message;
      captureBtn.disabled = false;
      stopBtn.style.display = 'none';
    }
  });

  // Stop button click
  stopBtn.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (chrome.runtime.lastError) {
        return;
      }

      const tab = tabs[0];
      if (!tab) {
        return;
      }

      // Send stop message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'stopCapture' }, (response) => {
        stopBtn.style.display = 'none';
        statusDiv.className = 'status info';
        statusDiv.textContent = 'Stopping capture...';
      });
    } catch (error) {
      console.error('Error stopping capture:', error);
    }
  });
});

