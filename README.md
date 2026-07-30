# ADCC Mirror Site & Accessibility Enhancement

A local mirror and accessibility enhancement toolkit for the Hong Kong Police Force **Anti-Deception Coordination Centre (ADCC)** website ([www.adcc.gov.hk](https://www.adcc.gov.hk)). This project scrapes fraud alert pages from the official ADCC site, serves them as a local mirror, and adds an interactive **Hong Kong Sign Language (HKSL) video player** to make scam alert content accessible to the Deaf and hard-of-hearing community.

## Features

- **Web scraping** — Extract structured data (metadata, body content, images) from ADCC fraud alert pages.
- **Local mirror server** — Serve mirrored ADCC pages locally for offline access, development, or demonstration.
- **Sign language video player** — Annotate alert text with HKSL video clips, displayed in a draggable floating player with typewriter-style subtitles.
- **Password-based access control** — Simple client-side authentication (SHA-256 hashed) to restrict access to the mirror.
- **Batch scraping** — Pull all alerts listed in the ADCC API (`alert.json`) in one command.
- **One-click setup** — Initialize the entire local site (download public assets, migrate scraped pages, inject the player) with a single script.

## Project Structure

```
ADCC/
├── scrape_adcc.py                  # Simple single-page scraper → adcc_scraped/
├── adcc_scraped/                   # Output from the root-level scraper
│   ├── data.json                   #   Structured JSON of the scraped page
│   ├── content.txt                 #   Plain-text body content
│   ├── page_raw.html               #   Raw HTML copy
│   └── images/                     #   Downloaded images
│
└── adcc-site/                      # Local mirror website
    ├── page_raw.html               # Main mirrored alert detail page
    ├── login.html                  # Password authentication page
    ├── css/
    │   ├── website.css             # Main site stylesheet
    │   └── _vendor/                # Third-party CSS (Bootstrap, Font Awesome, Swiper, etc.)
    ├── js/
    │   ├── auth-check.js           # Client-side SHA-256 password auth
    │   ├── ax-function.js          # Core ADCC frontend utility functions
    │   ├── video-resolver.js       # Text-to-sign-language-video mapping engine
    │   └── _vendor/                # Third-party JS (jQuery, Vue 2, Swiper, FullCalendar, Moment.js)
    ├── player/
    │   ├── player.css              # Floating video player styles
    │   └── player.js               # Timestamp-driven floating video player
    ├── data/
    │   ├── manifest.json           # Page-to-mapping-file configuration
    │   ├── adcc_one.json           # Text-to-video mappings (26 paragraphs)
    │   ├── adcc_two.json           # Text-to-video mappings (29 paragraphs + subtitles)
    │   └── alert.json              # Raw ADCC API alert data (for batch scraping)
    ├── video/                      # HKSL video clips (.mp4)
    │   └── 2076535555384504322/    # Per-alert timestamp configurations
    │       └── timestamps.json
    ├── scripts/
    │   ├── server.py               # Local HTTP server (default port 8888)
    │   ├── setup.py                # One-click site initializer
    │   ├── scrape.py               # Advanced scraper (single/batch/by-ID)
    │   └── add_player.py           # Inject player CSS/JS into mirrored HTML pages
    ├── zh-hk/alerts-detail/        # Mirrored alert pages served by the server
    ├── image/                      # Site images (logos, favicons, WCAG badges)
    └── font/                       # Font Awesome WOFF2 files
```

## Prerequisites

- **Python 3.7+** with the following packages:
  ```bash
  pip3 install requests beautifulsoup4 lxml
  ```
- A modern web browser (Chrome, Firefox, Safari, or Edge).
- No Node.js, Docker, or database required.

## Quick Start

### 1. Scrape a fraud alert page

```bash
cd ADCC/adcc-site

# Scrape a single alert by URL
python3 scripts/scrape.py https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2076535555384504322.html

# Or by alert ID
python3 scripts/scrape.py --id 2076535555384504322

# Scrape all alerts in batch (reads data/alert.json)
python3 scripts/scrape.py --all --limit 5
```

### 2. Initialize the local site

```bash
cd ADCC/adcc-site
python3 scripts/setup.py
```

This downloads all public assets (CSS, JS, images, fonts) from `www.adcc.gov.hk`, migrates scraped pages into the `zh-hk/alerts-detail/` directory, and injects the video player into each page.

### 3. Inject the sign language video player

```bash
python3 scripts/add_player.py 2076535555384504322
```

This adds the `<link>` and `<script>` tags for the floating player into the mirrored HTML page.

### 4. Start the local server

```bash
python3 scripts/server.py
```

Default port is **8888**. Open your browser and visit:

```
http://localhost:8888/zh-hk/alerts-detail/alerts-2076535555384504322.html
```

To use a custom port:

```bash
python3 scripts/server.py 3000
```

### Alternative: quick single-page scrape (root-level)

```bash
cd ADCC
python3 scrape_adcc.py
```

Output goes to `adcc_scraped/` — not integrated with the mirror site. Use this for quick one-off data extraction.

## How the Sign Language Player Works

The player annotates fraud alert text with Hong Kong Sign Language video translations so that Deaf and hard-of-hearing users can understand scam alerts in their native language.

### Architecture

1. **Mapping files** (`data/adcc_one.json`, `data/adcc_two.json`) contain key-value pairs mapping exact Chinese text strings from the alert page to video filenames.
2. **`data/manifest.json`** maps URL path patterns to the correct mapping file. For example, `page_raw.html` uses `adcc_two.json`.
3. At page load, `video-resolver.js` reads the manifest, loads the appropriate mapping file, scans the page for matching text paragraphs, and inserts play buttons next to each one.
4. Clicking a play button opens a **draggable floating video player** (`player/player.js` + `player/player.css`) that plays the corresponding `.mp4` clip from the `video/` directory.

### Video file organization

- **`video/*.mp4`** — Individual clips for each text paragraph (approximately 42 files for the main alert).
- **`video/{alertId}/timestamps.json`** — Alternative mode: one long video per alert, with timestamp ranges mapping each text segment to a start/end time. Used by `player/player.js`.

### Subtitles

`adcc_two.json` includes a `subtitles` field for each mapping entry. The player displays these as typewriter-style animated subtitles synced to the video playback.

## Authentication

The login page (`login.html`) uses client-side SHA-256 hashing via the Web Crypto API:

- **Default password:** `password`
- **How to change:** Open the browser console and run:
  ```js
  ADCC_setPassword('your_new_password')
  ```
- **Storage:** Login state is stored in `sessionStorage` — closing the browser tab clears it.

> **Note:** This is a simple access gate, not a robust security mechanism. It is suitable for demonstrations and controlled environments.

## Mirror Site Features

The mirrored pages replicate the ADCC website's look and feel:

- Collapsible navigation menu
- Font size adjustment (small / medium / large)
- Social media icon links
- Search bar
- Language switcher (Traditional Chinese / Simplified Chinese / English) — UI only, content is in Traditional Chinese
- WCAG 2.1 AA accessibility badge

## Limitations & Notes

- **Not a full site mirror.** Only specific alert detail pages and their supporting assets (CSS, JS, images, fonts) are mirrored. Navigation menu items use `javascript:_menuAction(...)` stubs and do not navigate to other pages.
- **No live data sync.** Scraped content is a static snapshot. To update, re-run the scraper.
- **Scraper duplication.** `scrape_adcc.py` (root) and `adcc-site/scripts/scrape.py` serve similar purposes. The root-level script is a simpler one-off tool outputting to `adcc_scraped/`; the site-level script integrates directly with the mirror site structure and supports batch mode.
- **No `requirements.txt`.** Dependencies are documented above — install them manually via `pip3`.
- **Content language.** All scraped content and video mappings are in Traditional Chinese (Hong Kong).

## Key Files Reference

| File | Purpose |
|---|---|
| [scrape_adcc.py](scrape_adcc.py) | Root-level single-page scraper |
| [adcc-site/scripts/scrape.py](adcc-site/scripts/scrape.py) | Advanced scraper with batch & ID modes |
| [adcc-site/scripts/setup.py](adcc-site/scripts/setup.py) | One-click site initializer |
| [adcc-site/scripts/server.py](adcc-site/scripts/server.py) | Local HTTP mirror server |
| [adcc-site/scripts/add_player.py](adcc-site/scripts/add_player.py) | Player CSS/JS injector |
| [adcc-site/js/video-resolver.js](adcc-site/js/video-resolver.js) | Text-to-video mapping engine |
| [adcc-site/js/auth-check.js](adcc-site/js/auth-check.js) | Password authentication |
| [adcc-site/player/player.js](adcc-site/player/player.js) | Floating video player logic |
| [adcc-site/player/player.css](adcc-site/player/player.css) | Floating video player styles |
| [adcc-site/data/manifest.json](adcc-site/data/manifest.json) | Page-to-data mapping configuration |
| [adcc-site/data/adcc_two.json](adcc-site/data/adcc_two.json) | Text-to-video mappings with subtitles |

## License

This project is an academic/research tool for accessibility enhancement. All scraped content and assets belong to the Hong Kong Police Force Anti-Deception Coordination Centre.
