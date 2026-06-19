# 🎯 LinkedIn Job Matcher — Chrome Extension

AI-powered CV matching for LinkedIn job postings. Compares job descriptions against your CV using DeepSeek V3 and saves matches to Google Sheets.

## What It Does

1. Browse LinkedIn jobs normally
2. Extension **auto-detects** job pages and shows a floating button
3. Click **"Analyze Match"** → DeepSeek AI compares the JD to your CV
4. See **match %, matched skills, missing skills, strengths, gaps**
5. Click **"Save to Sheet"** → pushes to your Google Sheets

## Setup (5 minutes)

### 1. Load the Extension in Chrome

```
1. Go to chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the extension/ folder from this project
```

### 2. Configure DeepSeek API Key

```
1. Get your key at https://platform.deepseek.com/api_keys
2. Click the extension icon in Chrome toolbar
3. Paste your key → Save
```

### 3. Set Up Google Sheets

```
1. Create a Google Sheet
2. Go to Extensions → Apps Script
3. Paste the code from google-sheet/apps-script.gs
4. Click Deploy → New deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
5. Click Deploy → Authorize → Copy the URL
6. Paste URL in extension popup → Save
```

### 4. Start Using

```
1. Go to any LinkedIn job posting
2. Look for the blue floating button bottom-right
3. Click → Analyze Match
4. Review results → Save to Sheet
```

## Cost

| Item | Cost |
|------|------|
| DeepSeek V3 API | ~$1.50/month (100 jobs/day) |
| Google Sheets | Free |
| Chrome Extension | Free |
| **Total** | **~$1.50/month** |

## No Ban Risk

You're just browsing LinkedIn normally. The extension works client-side on pages you're already viewing — no scraping, no automation, no risk.

## Project Structure

```
extension/
├── manifest.json      # Chrome extension manifest V3
├── background.js      # Handles DeepSeek + Google Sheets API calls
├── content.js         # Injected into LinkedIn job pages
├── content.css        # Overlay styling
├── cv-data.js         # Your CV data (pre-filled)
├── popup.html         # Settings popup
├── popup.js           # Settings logic
├── popup.css          # Popup styling
└── icons/             # Extension icons

google-sheet/
└── apps-script.gs     # Google Apps Script for Sheets
```
