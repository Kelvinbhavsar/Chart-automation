# Nifty Options Screenshot Chrome Extension

A Chrome extension to automatically capture screenshots of ITM (In The Money) Call and Put options based on current Nifty price from Zerodha Kite.

## Features

- Scrapes current Nifty price from Zerodha Kite page
- Automatically finds 5 ITM CE (Call Options) and 5 ITM PE (Put Options)
- Captures screenshots of option charts
- Saves screenshots to Downloads folder with timestamp

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Extension icon will appear in Chrome toolbar

## Usage

1. Open Zerodha Kite website and navigate to a page showing Nifty price
2. Click the extension icon in Chrome toolbar
3. Click "Capture Options Screenshots" button
4. Extension will:
   - Detect current Nifty price
   - Calculate 5 ITM CE strikes (below current price)
   - Calculate 5 ITM PE strikes (above current price)
   - Open each option chart and capture screenshot
  5. Screenshots will be saved to Downloads folder

## Screenshot Naming

Screenshots are named as: `NIFTY_{STRIKE}_{TYPE}_{TIMESTAMP}.png`

Example: `NIFTY_19500_CE_2026-01-17T10-30-45.png`

## Notes

- Make sure Nifty price is visible on the Kite page
- Extension needs permission to access Kite website
- Each screenshot capture opens a new tab temporarily
- Strike interval is set to 50 points (typical for Nifty options)

## Development

To modify the extension:
1. Edit files in the `extension` folder
2. Go to `chrome://extensions/`
3. Click reload icon on the extension card
4. Test the changes

