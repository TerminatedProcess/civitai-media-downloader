<div align="center">
  <h1>CivitAI Media Downloader</h1>
  <p>
    <a href="https://github.com/sebastianwd/civitai-dl" target="_blank">
      <img alt="github" src="https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
    </a>
  </p>
</div>

Browser extension for downloading images and videos from CivitAI. Supports individual downloads and mass downloading with auto-scrolling.

## Features

- Individual card downloads via injected buttons
- Mass downloads with auto-scrolling
- Customizable folder and filename patterns
- Download history with skip-on-redownload
- Works on civitai.com and civitai.red

## Usage

### Individual Downloads

1. Navigate to civitai.com or civitai.red
2. Click the download button on any card
3. Media downloads automatically

### Mass Downloads

1. Open the CivitAI Media Downloader sidebar
2. Configure download settings
3. Click **Start Mass Download**

### Settings

- **Download Folder**: Where files are saved (supports `{creator}`, `{timestamp}`, `{id}`)
- **Filename Pattern**: File naming (supports `{creator}`, `{timestamp}`, `{id}`)
- **Hide download buttons on cards**: Use sidebar mass download only

## Development

Built with [WXT](https://wxt.dev/) and React.

### Prerequisites

- Node.js 22+
- pnpm

### Commands

- `pnpm dev` — Development server
- `pnpm dev:firefox` — Firefox development
- `pnpm build` — Production build
- `pnpm zip` — Create distribution zip
- `pnpm zip:firefox` — Create distribution zip for Firefox

### Structure

```
entrypoints/
├── background.ts              # Downloads + path building
├── download-button.content/   # Card UI injection
├── injected.ts                # Creator metadata hook
└── sidepanel/                 # Sidebar UI
components/                    # React components
utils/                         # Utilities
public/                        # Static assets
```

## Permissions

- `downloads` — Save files
- `activeTab` — Interact with CivitAI pages
- `storage` — Save settings and download history
- `tabs` — Query active tab
- `webRequest` — Resolve creator metadata from API responses

## Privacy

No data collection:

- No analytics
- No marketing data
- All downloads and processing are local
