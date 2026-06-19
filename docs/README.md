# 🎯 LinkedIn & Naukri Job Matcher — Documentation

AI-powered Chrome extension that compares job descriptions against your CV using DeepSeek and saves matches to Google Sheets.

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Architecture](#architecture)
4. [Data Flow](#data-flow)
5. [Setup Guide](#setup-guide)
6. [Usage](#usage)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)
9. [Tech Stack](#tech-stack)
10. [Cost Breakdown](#cost-breakdown)

---

## Overview

| Feature | Detail |
|---------|--------|
| **Sites supported** | LinkedIn, Naukri.com |
| **Browser** | Chrome (Manifest V3) |
| **AI Engine** | DeepSeek V3 |
| **Output** | Google Sheets |
| **Cost** | ~$1.50/month |
| **Ban risk** | None (client-side only) |

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     YOUR BROWSER                         │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ LinkedIn /   │    │  Content     │    │ Chrome     │ │
│  │ Naukri Job   │───▶│  Script      │───▶│ Extension  │ │
│  │ Page         │    │  (extracts   │    │ Popup      │ │
│  │              │    │   job data)  │    │ (settings) │ │
│  └──────────────┘    └──────┬───────┘    └────────────┘ │
│                              │                           │
│                    ┌─────────▼─────────┐                 │
│                    │  Background       │                 │
│                    │  Service Worker   │                 │
│                    └────┬──────────┬───┘                 │
│                         │          │                     │
└─────────────────────────┼──────────┼────────────────────┘
                          │          │
              ┌───────────▼──┐  ┌────▼──────────────┐
              │  DeepSeek    │  │  Google Sheets     │
              │  API (AI)    │  │  (via Apps Script) │
              │  $1.50/mo    │  │  Free              │
              └──────────────┘  └───────────────────┘
```

---

## Architecture

### Extension Components

```
extension/
├── manifest.json          # Chrome extension config (V3)
├── background.js          # API calls (DeepSeek + Sheets)
├── content.js             # Injected into job pages
├── content.css            # Floating panel UI
├── cv-data.js             # Your CV data (pre-loaded)
├── popup.html             # Settings popup
├── popup.js               # Settings + Test logic
├── popup.css              # Popup styling
└── icons/                 # Extension icons
```

### Google Sheets Integration

```
google-sheet/
└── apps-script.gs         # Google Apps Script (deploy as Web App)
```

---

## Data Flow

### 1. Page Detection
```
User opens LinkedIn/Naukri job page
       │
       ▼
Content script detects URL pattern
       │
       ▼
Blue floating button injected (bottom-right)
```

### 2. Job Extraction
```
User clicks floating button → Panel opens
       │
       ▼
User clicks "Analyze Match"
       │
       ▼
DOM extraction (site-specific selectors):
  • Title          ← h1, title elements
  • Company        ← company name links
  • Location       ← location spans/anchors
  • Posted date    ← date elements
  • Description    ← job description block
  • URL            ← window.location.href
       │
       ▼
Description cleaned:
  • Strip "About the job" prefix
  • Collapse newlines → single paragraph
```

### 3. AI Analysis
```
Content script sends CV + JD to background worker
       │
       ▼
Background calls DeepSeek API
  POST https://api.deepseek.com/v1/chat/completions
  {
    model: "deepseek-chat",
    messages: [{
      role: "user",
      content: "Compare CV vs JD. Return JSON with match%, skills, gaps..."
    }]
  }
       │
       ▼
AI returns structured JSON:
  {
    matchPercentage: 75,
    matchedSkills: ["Java", "Spring Boot", "AWS", ...],
    missingSkills: ["Kubernetes", ...],
    strengths: ["6+ years Java...", ...],
    gaps: ["No K8s experience", ...],
    summary: "Strong backend match, minor cloud gaps"
  }
       │
       ▼
Results rendered in panel
```

### 4. Save to Sheet
```
User clicks "Save to Sheet"
       │
       ▼
Content script sends job + analysis to background
       │
       ▼
Background POSTs to Google Apps Script Web App
  Content-Type: text/plain (avoids CORS preflight)
       │
       ▼
Apps Script appends row to Google Sheet:
  Title | Company | Location | URL | Posted | Description |
  Match% | Matched Skills | Missing Skills | Summary | Saved At
```

### 5. SPA Navigation (no page reload)
```
User navigates to another job (LinkedIn SPA)
       │
       ▼
URL change detected (polling every 1s)
       │
       ▼
Old overlay removed, fresh overlay injected
State reset (analysisResult, isAnalyzing, isSaving)
```

---

## Setup Guide

### Step 1: Load the Extension

```
1. Open chrome://extensions/
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the extension/ folder from this project
5. Pin the extension to your toolbar
```

### Step 2: Configure DeepSeek API Key

```
1. Go to https://platform.deepseek.com/api_keys
2. Create a new API key (or use existing)
3. Copy the key (starts with "sk-")
4. Click the extension icon → paste key → Save Settings
```

### Step 3: Set Up Google Sheets

```
1. Create a new Google Sheet
2. Go to Extensions → Apps Script
3. Delete all default code
4. Paste the code from google-sheet/apps-script.gs
5. Save (Ctrl+S / Cmd+S) → name it "Job Matcher"
6. Click Deploy → New deployment
   • Type: Web app
   • Description: Job Matcher
   • Execute as: Me
   • Who has access: Anyone
7. Click Deploy → Authorize (Google will prompt)
8. Copy the Web App URL (ends with /exec)
9. Paste URL in extension popup → Save Settings
10. Click "Test Sheet" → verify "TEST JOB" row appears
```

### Step 4: Verify

```
1. Go to any LinkedIn job posting
2. Look for blue floating button (bottom-right)
3. Click → Analyze Match
4. Verify match score appears
5. Click Save to Sheet
6. Check Google Sheet — job should appear
```

---

## Usage

### Daily Workflow

```
1. Browse LinkedIn/Naukri jobs normally
2. When a job interests you, click the blue button
3. Click "Analyze Match"
4. Review results:
   ┌─────────────────────────────────┐
   │          🎯 75%                  │
   │         [Save to Sheet]          │
   │                                 │
   │  ✅ Matched (8)                 │
   │  Java  Spring Boot  AWS ...     │
   │                                 │
   │  ⚠️ Missing (2)                │
   │  Kubernetes  Terraform          │
   │                                 │
   │  💪 Strengths                   │
   │  • 6+ years Java/Spring Boot    │
   │                                 │
   │  📋 Gaps                        │
   │  • No K8s in production         │
   │                                 │
   │  Strong backend match, minor    │
   │  cloud orchestration gaps       │
   └─────────────────────────────────┘
5. Click "Save to Sheet" to keep
6. Move to next job — panel auto-resets
```

### Google Sheet Columns

| Column | Description |
|--------|-------------|
| Title | Job title |
| Company | Company name |
| Location | Job location |
| URL | Direct link to job posting |
| Posted | Posted date (when available) |
| Description | First 5000 chars of cleaned job description |
| Match % | AI-computed match percentage |
| Matched Skills | Skills from your CV found in JD |
| Missing Skills | Skills from JD not in your CV |
| Summary | One-line AI assessment |
| Saved At | Timestamp when saved |

---

## Configuration

### CV Data

Your CV is pre-loaded in `cv-data.js`. To update it:

1. Edit `extension/cv-data.js`
2. Update `skills`, `experience`, `education`, etc.
3. Refresh extension in `chrome://extensions/`

### DeepSeek Settings

| Setting | Value |
|---------|-------|
| Model | `deepseek-chat` |
| Temperature | 0.2 (low = consistent results) |
| Max tokens | 800 |
| API endpoint | `https://api.deepseek.com/v1/chat/completions` |

### Extension Permissions

| Permission | Reason |
|-----------|--------|
| `storage` | Save API key + Sheets URL |
| `linkedin.com` | Inject content script |
| `naukri.com` | Inject content script |
| `api.deepseek.com` | AI analysis API calls |
| `script.google.com` | Sheets web app calls |

---

## Troubleshooting

### Blue button doesn't appear

| Cause | Fix |
|-------|-----|
| Not on job page | Must be on `linkedin.com/jobs/view/*` or Naukri job detail page |
| Extension not loaded | Check `chrome://extensions/` — Job Matcher enabled? |
| Page not fully loaded | Refresh the page |

### "Could not extract job description"

| Cause | Fix |
|-------|-----|
| Description not loaded | Scroll down to trigger lazy-load of description |
| New LinkedIn/Naukri layout | Open an issue — selectors may need updating |

### Save to Sheet fails

| Cause | Fix |
|-------|-----|
| Web App URL not set | Check extension popup |
| Apps Script not deployed | Re-deploy with "Anyone" access |
| Apps Script needs re-auth | Visit the Web App URL directly in a browser |
| Old deployment | Update Apps Script → Deploy → Manage deployments → Edit → New version |

### Extension popup "Test Sheet" fails

| Cause | Fix |
|-------|-----|
| Wrong URL | Verify URL ends with `/exec` (not `/edit` or `/dev`) |
| Access restricted | Re-deploy with "Who has access: Anyone" |
| CORS blocked | Ensure "Execute as: Me" is selected |

### Panel doesn't reset between jobs

| Cause | Fix |
|-------|-----|
| SPA navigation delay | Panel polls URL every 1s — wait a moment |
| Overlay removed by page | Auto-detected and re-injected via MutationObserver |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension framework | Chrome Manifest V3 |
| Content injection | Content scripts + CSS |
| Background processing | Service Worker |
| AI | DeepSeek V3 (chat completions API) |
| Data storage | Google Sheets via Apps Script |
| Deployment | Load unpacked (local) |

---

## Cost Breakdown

| Item | Monthly cost | Notes |
|------|-------------|-------|
| DeepSeek API | ~$1.50 | ~100 analyses/day, ~$0.0005 per job |
| Google Sheets | Free | Unlimited rows |
| Chrome Extension | Free | Runs locally |
| **Total** | **~$1.50/mo** | |

### DeepSeek Pricing Detail

```
Average job description: 1,600 tokens
Average CV text:          600 tokens
Prompt overhead:          200 tokens
Total per analysis:      2,400 tokens

DeepSeek V3 pricing:
  Input:  $0.27 / 1M tokens
  Output: $1.10 / 1M tokens

Per analysis: ~$0.0006 (input) + ~$0.0004 (output) ≈ $0.001
100 analyses/day × 30 days = 3,000 analyses/month
3,000 × $0.001 ≈ $3.00/month (worst case)
Typical usage: ~$1.50/month
```
