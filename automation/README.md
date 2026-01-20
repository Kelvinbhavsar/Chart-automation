# Kite Chart Automation

Automated screenshot capture of Zerodha Kite option charts using Playwright and Kite Connect API.

## Features

- ✅ Fetches instrument tokens via Kite Connect API
- ✅ Automatically calculates ITM strikes
- ✅ Loads charts in automated browser
- ✅ Captures high-quality screenshots
- ✅ Minimal code structure (~150 lines)

## Setup

### 1. Install Dependencies

```bash
cd automation
npm install
```

This will install Playwright and download browser binaries.

### 2. Configure Credentials

Create a `.env` file (optional) or set environment variables:

```bash
# Required
API_KEY=your_api_key
API_SECRET=your_api_secret
ACCESS_TOKEN=your_access_token  # OR use REQUEST_TOKEN to generate

# Optional
NIFTY_PRICE=25000
OUTPUT_DIR=./screenshots
HEADLESS=true
```

Or edit `config.js` directly.

### 3. Get Access Token

**Option A: Use existing access token**
- Set `ACCESS_TOKEN` in environment or config

**Option B: Generate from request token**
1. Visit: `https://kite.zerodha.com/connect/login?v=3&api_key=YOUR_API_KEY`
2. Login and authorize
3. Copy `request_token` from redirect URL
4. Set `REQUEST_TOKEN` environment variable and run script

## Usage

### Basic Usage

```bash
node index.js
```

### With Environment Variables

```bash
API_KEY=xxx API_SECRET=xxx ACCESS_TOKEN=xxx node index.js
```

### With Request Token (to generate access token)

```bash
API_KEY=xxx API_SECRET=xxx REQUEST_TOKEN=xxx node index.js
```

### Using Existing Chrome Browser (Recommended)

To reuse your existing Chrome browser session (where you're already logged in):

**Step 1: Start Chrome with Remote Debugging**

**Option A: Use the helper script (Easiest)**
```bash
./start-chrome-debug.sh
```

**Option B: Manual command**

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/Library/Application Support/Google/Chrome"
```

**Windows:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data"
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.config/google-chrome"
```

**Note:** Close all existing Chrome windows before starting with remote debugging. The helper script will check for this automatically.

**Step 2: Log in to Kite in the Chrome window**
- Navigate to https://kite.zerodha.com
- Log in manually
- Keep Chrome running

**Step 3: Run the automation script**
```bash
USE_EXISTING_CHROME=true node index.js
```

**Benefits:**
- No need to log in for each chart
- Reuses existing Chrome session and cookies
- Can see the browser window (not headless)
- Faster execution (no login delays)

**Note:** 
- Chrome must be started with `--remote-debugging-port=9222` before running the script
- Only one Chrome instance can use the debugging port at a time
- If Chrome is not running with remote debugging, the script will automatically fall back to launching a new browser instance
- The helper script (`start-chrome-debug.sh`) uses your existing Chrome profile, so all your bookmarks, extensions, and login sessions are preserved

## Configuration

Edit `config.js` to customize:

- `niftyPrice`: Current Nifty price (or set via NIFTY_PRICE env var)
- `strikeInterval`: Strike interval (default: 50)
- `itmStrikesCount`: Number of ITM strikes per type (default: 5)
- `outputDir`: Screenshot output directory
- `headless`: Run browser in headless mode
- `chartTheme`: 'dark' or 'light'
- `useExistingChrome`: Connect to existing Chrome via CDP (set `USE_EXISTING_CHROME=true`)
- `chromeCDPEndpoint`: Chrome DevTools Protocol endpoint (default: `http://localhost:9222`)

## Output

Screenshots are saved to `./screenshots/` (or configured `outputDir`) with naming:
```
NIFTY_{strike}_{type}_{timestamp}.png
```

Example: `NIFTY_25700_CE_2024-01-15T10-30-45.png`

## Project Structure

```
automation/
├── index.js          # Main script (~40 lines)
├── kite-api.js       # Kite API functions (~60 lines)
├── chart-capture.js  # Playwright automation (~50 lines)
├── config.js         # Configuration
├── package.json      # Dependencies
└── README.md         # This file
```

## Troubleshooting

### Access Token Expired
- Access tokens expire daily. Regenerate using `REQUEST_TOKEN`

### Browser Not Found
- Run `npx playwright install` to download browsers

### Login Required
- **Recommended:** Use existing Chrome browser with `USE_EXISTING_CHROME=true` (see Usage section above)
- Or set `KITE_USERNAME`, `KITE_PASSWORD`, and `KITE_PIN` in config for automated login
- Or manually login in browser before running (if headless=false)

### Chrome Connection Failed
- Make sure Chrome is running with `--remote-debugging-port=9222`
- Check that no other Chrome instance is using port 9222
- Verify the CDP endpoint URL matches your Chrome setup

### Token Not Found
- Ensure instrument exists for the strike/expiry
- Check if market is open and instrument is active

## Notes

- Access tokens expire daily - may need to regenerate
- First run downloads Playwright browsers (~300MB)
- Screenshots are captured after chart fully loads
- 2-second delay between captures to avoid rate limiting
