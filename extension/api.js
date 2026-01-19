// Kite Connect API integration
// Make functions available globally for content script access

const KITE_API_BASE = 'https://api.kite.trade';

// Default API credentials (pre-configured)
const DEFAULT_API_KEY = '3ngsjp3dclif0m3o';
const DEFAULT_API_SECRET = 'p60rabo57qehlcvezoxmalev9i0k4tvb';

// Get stored API credentials
async function getAPICredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api_key', 'api_secret', 'access_token'], (result) => {
      resolve({
        apiKey: result.api_key || DEFAULT_API_KEY,
        apiSecret: result.api_secret || DEFAULT_API_SECRET,
        accessToken: result.access_token || null
      });
    });
  });
}

// Save API credentials
async function saveAPICredentials(apiKey, apiSecret, accessToken = null) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      api_key: apiKey || DEFAULT_API_KEY,
      api_secret: apiSecret || DEFAULT_API_SECRET,
      access_token: accessToken
    }, () => resolve());
  });
}

// Generate access token from request token
async function generateAccessToken(apiKey, apiSecret, requestToken) {
  // Validate inputs
  const trimmedApiKey = (apiKey || '').trim();
  const trimmedApiSecret = (apiSecret || '').trim();
  const trimmedRequestToken = (requestToken || '').trim();
  
  if (!trimmedApiKey || trimmedApiKey.length < 6) {
    throw new Error('API Key is required and must be at least 6 characters long');
  }
  
  if (!trimmedApiSecret) {
    throw new Error('API Secret is required');
  }
  
  if (!trimmedRequestToken || trimmedRequestToken.length < 10) {
    throw new Error('Request Token is required and must be at least 10 characters long');
  }
  
  console.log('Generating access token with API Key:', trimmedApiKey.substring(0, 4) + '...');
  console.log('Request Token length:', trimmedRequestToken.length);
  console.log('API Secret length:', trimmedApiSecret.length);
  
  // Generate checksum: SHA256(api_key + request_token + api_secret)
  const message = trimmedApiKey + trimmedRequestToken + trimmedApiSecret;
  console.log('Message length for checksum:', message.length);
  
  let checksum;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Check if crypto.subtle is available
    if (!crypto || !crypto.subtle) {
      throw new Error('Web Crypto API not available. Please use a modern browser.');
    }
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Validate checksum (SHA-256 should produce 64 hex characters)
    if (!checksum || checksum.length !== 64) {
      console.error('Checksum generation issue:', {
        checksum: checksum,
        length: checksum ? checksum.length : 0,
        hashArrayLength: hashArray.length
      });
      throw new Error(`Checksum generation failed. Expected 64 characters, got ${checksum ? checksum.length : 0}`);
    }
    
    console.log('Checksum generated successfully (first 8 chars):', checksum.substring(0, 8) + '...');
  } catch (error) {
    console.error('Error generating checksum:', error);
    throw new Error(`Failed to generate checksum: ${error.message}`);
  }
  
  // Verify checksum before sending
  if (!checksum || checksum.length !== 64) {
    throw new Error(`Invalid checksum: length is ${checksum ? checksum.length : 0}, expected 64`);
  }
  
  const formData = new FormData();
  formData.append('api_key', trimmedApiKey);
  formData.append('request_token', trimmedRequestToken);
  formData.append('checksum', checksum);
  
  // Verify form data
  console.log('FormData entries:');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value ? (key === 'checksum' ? value.substring(0, 8) + '...' : value.substring(0, 10) + '...') : 'empty'}`);
  }
  
  try {
    const response = await fetch(`${KITE_API_BASE}/session/token`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Kite-Version': '3'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token generation failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.status === 'success' && data.data) {
      return data.data.access_token;
    } else {
      throw new Error(data.message || 'Token generation failed');
    }
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
}

// Fetch instruments list for NFO
async function fetchNFOInstruments(accessToken, apiKey) {
  try {
    const response = await fetch(`${KITE_API_BASE}/instruments/NFO`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${accessToken}`,
        'X-Kite-Version': '3'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch instruments: ${response.status}`);
    }
    
    const text = await response.text();
    return parseInstrumentsCSV(text);
  } catch (error) {
    console.error('Error fetching instruments:', error);
    throw error;
  }
}

// Parse instruments CSV
function parseInstrumentsCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const instruments = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    
    const instrument = {};
    headers.forEach((header, index) => {
      instrument[header.trim()] = values[index]?.trim() || '';
    });
    
    instruments.push(instrument);
  }
  
  return instruments;
}

// Find instrument token for a specific strike and type
function findInstrumentToken(instruments, underlying, strike, optionType, expiry = null) {
  const upperType = optionType.toUpperCase();
  const upperUnderlying = underlying.toUpperCase();
  
  // Filter for matching instruments
  const matches = instruments.filter(inst => {
    const symbol = (inst.tradingsymbol || inst.name || '').toUpperCase();
    const instStrike = parseFloat(inst.strike) || 0;
    const instType = (inst.instrument_type || '').toUpperCase();
    
    // Must be an option
    if (instType !== 'OPT') return false;
    
    // Must match underlying (NIFTY, BANKNIFTY, etc.)
    if (!symbol.includes(upperUnderlying)) return false;
    
    // Must match strike (within 1 point tolerance)
    if (Math.abs(instStrike - strike) >= 1) return false;
    
    // Must match option type (CE/PE)
    const hasCE = symbol.includes('CE') || symbol.includes('CALL');
    const hasPE = symbol.includes('PE') || symbol.includes('PUT');
    
    if (upperType === 'CE' && !hasCE) return false;
    if (upperType === 'PE' && !hasPE) return false;
    
    // If expiry specified, try to match (format: YYMMDD)
    if (expiry) {
      const expiryStr = expiry.toString();
      if (symbol.includes(expiryStr)) return true;
    }
    
    return true;
  });
  
  // If expiry specified, prefer exact match; otherwise return first match
  if (expiry && matches.length > 1) {
    const expiryMatch = matches.find(inst => {
      const symbol = (inst.tradingsymbol || '').toUpperCase();
      return symbol.includes(expiry.toString());
    });
    if (expiryMatch) return expiryMatch;
  }
  
  // Return the first match (usually current expiry)
  return matches.length > 0 ? matches[0] : null;
}

// Fetch historical data for an instrument
async function fetchHistoricalData(accessToken, apiKey, instrumentToken, interval = 'day', fromDate, toDate) {
  try {
    const params = new URLSearchParams({
      interval: interval,
      from: fromDate,
      to: toDate
    });
    
    const response = await fetch(`${KITE_API_BASE}/instruments/historical/${instrumentToken}/${interval}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${accessToken}`,
        'X-Kite-Version': '3'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch historical data: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.status === 'success' && data.data) {
      return data.data.candles || [];
    } else {
      throw new Error(data.message || 'Failed to fetch historical data');
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
}

// Get current/nearest expiry date for NIFTY options
function getNearestExpiry() {
  // NIFTY options typically expire on Thursdays
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
  
  // Calculate days until next Thursday
  let daysUntilExpiry = (4 - dayOfWeek + 7) % 7;
  if (daysUntilExpiry === 0 && today.getHours() >= 15) {
    // If it's Thursday after 3 PM, next expiry is next week
    daysUntilExpiry = 7;
  }
  
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + daysUntilExpiry);
  
  // Format as YYMMDD
  const year = expiryDate.getFullYear().toString().slice(-2);
  const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
  const day = expiryDate.getDate().toString().padStart(2, '0');
  
  return parseInt(year + month + day);
}

// Expose functions globally for content script (after all functions are defined)
if (typeof window !== 'undefined') {
  window.getAPICredentials = getAPICredentials;
  window.saveAPICredentials = saveAPICredentials;
  window.generateAccessToken = generateAccessToken;
  window.fetchNFOInstruments = fetchNFOInstruments;
  window.findInstrumentToken = findInstrumentToken;
  window.fetchHistoricalData = fetchHistoricalData;
  window.getNearestExpiry = getNearestExpiry;
}
