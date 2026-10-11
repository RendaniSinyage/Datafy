# LinkedIn Funding Opportunity Capture — Chrome Extension

A Chrome Extension (Manifest V3) that automatically detects and captures funding opportunities from LinkedIn while you browse normally.

## Features

- **Automatic Capture as You Browse**: Uses `MutationObserver` to watch visible LinkedIn feed posts as you scroll and automatically extracts qualifying funding opportunities.
- **Intelligent Keyword & Heuristic Scoring**: Scores each post using a modular relevance detector (keywords, monetary amounts, deadlines, application links). Only captures posts reaching a configurable threshold (default: 5).
- **Structured Field Extraction**: Extracts author, organization, title, opportunity type (Grant, Accelerator, Venture Capital, Competition, Prize, Government Funding, etc.), amount, currency, deadline, eligibility, geography, industry, application URL, and raw text.
- **Automatic Post Screenshot Capture**: Captures the individual post image locally via background service worker viewport cropping.
- **Deduplication Engine**: Uses post URL or deterministic author/text fingerprints to prevent duplicate saves across session scrolling or extension reloads.
- **Overlay Status Badges**: Injects a subtle badge (`✓ Funding opportunity captured`) on detected posts.
- **Dashboard Popup UI**:
  - Filter by category (All, Grants, Accelerators, Investment, Competitions, Government, Other).
  - Search by organization, author, title, or post text.
  - Sort by date, deadline, or relevance score.
  - Interactive screenshot lightbox viewer.
  - Direct `[Open LinkedIn]` post links.
  - Adjustable capture threshold and auto-capture toggle.
- **Machine-Readable Export**: Export all captured opportunities anytime as formatted **JSON** or **CSV** files with full metadata.
- **100% Privacy & Local Storage**: All data and screenshots are stored locally via `chrome.storage.local`. No cloud services, external APIs, analytics, or mass background scraping.

---

## Extension Folder Structure

```text
linkedin-funding-capture/
│
├── manifest.json
├── content/
│   ├── content.js
│   ├── detector.js
│   ├── extractor.js
│   └── styles.css
│
├── background/
│   └── service-worker.js
│
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── storage/
│   └── opportunities.js
│
├── utils/
│   ├── dedupe.js
│   └── export.js
│
└── README.md
```

---

## Installation Instructions

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `linkedin-funding-capture` folder in this repository.
5. The extension **LinkedIn Funding Opportunity Capture** will now be installed and ready to use!

---

## Usage Instructions

1. Navigate to [LinkedIn](https://www.linkedin.com).
2. Browse your feed normally.
3. When a post containing a funding opportunity appears in view, the extension will automatically analyze and capture it.
4. A small status badge (`✓ Funding opportunity captured`) will appear on the post.
5. Click the extension icon in your Chrome toolbar to open the popup dashboard.
6. Search, filter, view post screenshots, or export your data as **JSON** or **CSV**.
