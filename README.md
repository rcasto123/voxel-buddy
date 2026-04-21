# Voxel Buddy

> Animated 3D voxel desktop companion with Slack and Gmail integrations

![Status](https://img.shields.io/badge/status-active%20development-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

Voxel Buddy is a desktop communication companion inspired by classic animated desktop characters. A customizable 3D voxel character lives in your workflow, surfacing Slack messages and Gmail notifications with animated reactions — built on Electron, React, and Three.js.

## Features

- **Animated 3D voxel character** — smooth walk, run, wave, alert, and sleep animations rendered in the browser layer via Three.js
- **Multiple mascots** — choose from distinct character designs (including Airie)
- **Slack integration** — real-time message delivery via the Slack Socket Mode API
- **Gmail integration** — email notifications via the Google APIs client
- **Speech bubbles** — messages surface as in-app speech bubble overlays on the character
- **Onboarding flow** — guided setup card for connecting integrations on first launch
- **Cross-platform** — distributable as a native app on macOS (DMG), Windows (NSIS installer), and Linux (AppImage) via electron-builder
- **Auto-update** — built-in update delivery via electron-updater

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 33 |
| Renderer | React + Vite + Tailwind CSS |
| 3D rendering | Three.js (via custom mascot renderer) |
| State | Zustand |
| Integrations | Slack Socket Mode API, Google APIs (Gmail) |
| Packaging | electron-builder |

## Getting Started

```bash
# Install dependencies
npm install

# Run the web renderer only (hot-reload)
npm run dev

# Run the full Electron app in development mode
npm run dev:all

# Start the packaged Electron app
npm start

# Build a distributable for your platform
npm run dist:mac    # macOS DMG
npm run dist:win    # Windows NSIS installer
npm run dist:linux  # Linux AppImage
```

`npm run dev:all` starts the Vite dev server and launches Electron once the server is ready.

## Integrations

Slack and Gmail connections are configured at first launch via the onboarding card. OAuth credentials are managed locally — no cloud account or subscription required.