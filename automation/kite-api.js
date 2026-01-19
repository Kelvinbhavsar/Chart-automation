// Kite Connect API functions

import { createHash } from 'crypto';
import { gunzipSync } from 'zlib';

const KITE_API_BASE = 'https://api.kite.trade';

// Generate access token from request token
export async function generateAccessToken(apiKey, apiSecret, requestToken) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:9',message:'generateAccessToken entry',data:{apiKeyLength:apiKey?.length||0,apiSecretLength:apiSecret?.length||0,requestTokenLength:requestToken?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // FIX: Use function parameters instead of hardcoded values
  const trimmedApiKey = (apiKey || '').trim();
  const trimmedApiSecret = (apiSecret || '').trim();
  const trimmedRequestToken = (requestToken || '').trim();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:13',message:'After trimming credentials',data:{trimmedApiKeyLength:trimmedApiKey.length,trimmedApiSecretLength:trimmedApiSecret.length,trimmedRequestTokenLength:trimmedRequestToken.length,apiKeyPrefix:trimmedApiKey.substring(0,6)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!trimmedApiKey || trimmedApiKey.length < 6) {
    throw new Error('API Key must be at least 6 characters');
  }
  if (!trimmedApiSecret) {
    throw new Error('API Secret is required');
  }
  if (!trimmedRequestToken || trimmedRequestToken.length < 10) {
    throw new Error('Request Token must be at least 10 characters');
  }
  
  // Generate checksum: SHA256(api_key + request_token + api_secret)
  // Per Kite Connect API documentation
  const message = trimmedApiKey + trimmedRequestToken + trimmedApiSecret;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:26',message:'Before checksum calculation',data:{messageLength:message.length,messagePrefix:message.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Use Node.js crypto module (crypto.subtle is browser-only)
  const checksum = createHash('sha256').update(message).digest('hex');
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:30',message:'After checksum calculation',data:{checksumLength:checksum?.length||0,checksumPrefix:checksum?.substring(0,16)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  if (!checksum || checksum.length !== 64) {
    throw new Error(`Checksum generation failed. Expected 64 characters, got ${checksum ? checksum.length : 0}`);
  }
  
  // Kite API expects application/x-www-form-urlencoded, not multipart/form-data
  // Use URLSearchParams instead of FormData
  const formParams = new URLSearchParams();
  formParams.append('api_key', trimmedApiKey);
  formParams.append('request_token', trimmedRequestToken);
  formParams.append('checksum', checksum);
  
  const formBody = formParams.toString();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:60',message:'Form params created',data:{url:`${KITE_API_BASE}/session/token`,apiKeyLength:trimmedApiKey.length,requestTokenLength:trimmedRequestToken.length,checksumLength:checksum.length,formBodyLength:formBody.length,formBodyPreview:formBody.substring(0,80)+'...',contentType:'application/x-www-form-urlencoded'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Also log to console for visibility
  console.log('[DEBUG] Request URL:', `${KITE_API_BASE}/session/token`);
  console.log('[DEBUG] Request Body (first 100 chars):', formBody.substring(0, 100));
  console.log('[DEBUG] Content-Type:', 'application/x-www-form-urlencoded');
  
  const response = await fetch(`${KITE_API_BASE}/session/token`, {
    method: 'POST',
    body: formBody, // URLSearchParams.toString() creates urlencoded string
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Kite-Version': '3' 
    }
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:45',message:'After token API request',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!response.ok) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:77',message:'Entering error handling',data:{status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    let errorMessage = `Token generation failed: ${response.status}`;
    let errorType = null;
    
    try {
      const errorText = await response.text();
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:88',message:'Error response body',data:{errorText,errorTextLength:errorText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Also log to console for visibility
      console.error('[DEBUG] Error Response Body:', errorText);
      
      const errorJson = JSON.parse(errorText);
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:95',message:'Parsed error JSON',data:{errorJson},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Also log to console
      console.error('[DEBUG] Parsed Error JSON:', JSON.stringify(errorJson, null, 2));
      
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
      if (errorJson.error_type) {
        errorType = errorJson.error_type;
        errorMessage = `${errorType}: ${errorMessage}`;
      }
      
      // Provide helpful suggestions based on error type
      if (errorType === 'InputException') {
        if (errorMessage.includes('api_key')) {
          errorMessage += '. Check that API key is correct and at least 6 characters.';
        } else if (errorMessage.includes('request_token')) {
          errorMessage += '. Request token may be expired or invalid. Get a fresh one from login.';
        } else if (errorMessage.includes('checksum')) {
          errorMessage += '. Checksum calculation may be incorrect. Verify API secret.';
        }
      } else if (errorType === 'PermissionException') {
        errorMessage += '. Your app may not have required permissions. Check your Kite Connect subscription.';
      }
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:117',message:'Error parsing response',data:{errorMessage:e.message,errorName:e.name,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Response not JSON, use status code
      errorMessage = `Token generation failed: ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:85',message:'Token API response data',data:{status:data.status,hasData:!!data.data,errorType:data.error_type||null,message:data.message||null,hasAccessToken:!!data.data?.access_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (data.status === 'success' && data.data) {
    const accessToken = data.data.access_token;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:88',message:'generateAccessToken success',data:{accessTokenLength:accessToken?.length||0,accessTokenPrefix:accessToken?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return accessToken;
  }
  
  // Handle API error response
  if (data.error_type) {
    throw new Error(`${data.error_type}: ${data.message || 'Token generation failed'}`);
  }
  
  throw new Error(data.message || 'Token generation failed');
}

// Fetch NFO instruments list
export async function fetchNFOInstruments(accessToken, apiKey) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:96',message:'fetchNFOInstruments entry',data:{accessTokenLength:accessToken?.length||0,apiKeyLength:apiKey?.length||0,url:`${KITE_API_BASE}/instruments/NFO`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const authHeader = `token ${apiKey}:${accessToken}`;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:100',message:'Authorization header constructed',data:{authHeaderPrefix:authHeader.substring(0,30)+'...',authHeaderFormat:'token apiKey:accessToken'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const response = await fetch(`${KITE_API_BASE}/instruments/NFO`, {
    headers: {
      'Authorization': authHeader,
      'X-Kite-Version': '3',
      'Accept-Encoding': 'gzip' // Request gzip compression
    }
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:109',message:'Instruments API response status',data:{status:response.status,statusText:response.statusText,ok:response.ok,contentType:response.headers.get('content-type'),contentEncoding:response.headers.get('content-encoding')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to fetch instruments: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
      if (errorJson.error_type) {
        errorMessage = `${errorJson.error_type}: ${errorMessage}`;
      }
    } catch (e) {
      // Not JSON, use text as is
    }
    
    throw new Error(errorMessage);
  }
  
  // Check if response is gzipped
  const contentType = response.headers.get('content-type') || '';
  const contentEncoding = response.headers.get('content-encoding') || '';
  const isGzipped = contentEncoding.includes('gzip') || contentType.includes('gzip');
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:128',message:'Before decompression check',data:{contentType,contentEncoding,isGzipped},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  let text;
  if (isGzipped) {
    // Response is gzipped, decompress it
    const buffer = await response.arrayBuffer();
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:133',message:'Before gzip decompression',data:{bufferSize:buffer.byteLength},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const decompressed = gunzipSync(Buffer.from(buffer));
    text = decompressed.toString('utf-8');
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:136',message:'After gzip decompression',data:{decompressedLength:text.length,textPrefix:text.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  } else {
    // Plain text response
    text = await response.text();
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:140',message:'Plain text response',data:{textLength:text.length,textPrefix:text.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }
  
  const instruments = parseInstrumentsCSV(text);
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:145',message:'fetchNFOInstruments success',data:{instrumentsCount:instruments.length,firstInstrument:instruments[0]||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  return instruments;
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

// Find instrument token for strike and type
export function findInstrumentToken(instruments, underlying, strike, type, expiry = null) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:166',message:'findInstrumentToken entry',data:{instrumentsCount:instruments.length,underlying,strike,type,expiry},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const upperType = type.toUpperCase();
  const upperUnderlying = underlying.toUpperCase();
  
  const matches = instruments.filter(inst => {
    const symbol = (inst.tradingsymbol || inst.name || '').toUpperCase();
    const instStrike = parseFloat(inst.strike) || 0;
    const instType = (inst.instrument_type || '').toUpperCase();
    
    if (instType !== 'OPT') return false;
    if (!symbol.includes(upperUnderlying)) return false;
    if (Math.abs(instStrike - strike) >= 1) return false;
    
    const hasCE = symbol.includes('CE') || symbol.includes('CALL');
    const hasPE = symbol.includes('PE') || symbol.includes('PUT');
    
    if (upperType === 'CE' && !hasCE) return false;
    if (upperType === 'PE' && !hasPE) return false;
    
    if (expiry && symbol.includes(expiry.toString())) return true;
    return true;
  });
  
  if (expiry && matches.length > 1) {
    const expiryMatch = matches.find(inst => {
      const symbol = (inst.tradingsymbol || '').toUpperCase();
      return symbol.includes(expiry.toString());
    });
    if (expiryMatch) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:195',message:'findInstrumentToken found with expiry',data:{instrumentToken:expiryMatch.instrument_token,tradingsymbol:expiryMatch.tradingsymbol},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return expiryMatch;
    }
  }
  
  const result = matches.length > 0 ? matches[0] : null;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:202',message:'findInstrumentToken result',data:{found:!!result,matchesCount:matches.length,instrumentToken:result?.instrument_token||null,tradingsymbol:result?.tradingsymbol||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return result;
}

// Get nearest expiry date for NIFTY options
export function getNearestExpiry() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  let daysUntilExpiry = (4 - dayOfWeek + 7) % 7;
  if (daysUntilExpiry === 0 && today.getHours() >= 15) {
    daysUntilExpiry = 7;
  }
  
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + daysUntilExpiry);
  
  const year = expiryDate.getFullYear().toString().slice(-2);
  const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
  const day = expiryDate.getDate().toString().padStart(2, '0');
  
  return parseInt(year + month + day);
}
