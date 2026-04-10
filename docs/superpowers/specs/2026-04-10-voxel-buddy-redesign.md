# Voxel Buddy Redesign — Design Spec
**Date:** 2026-04-10
**Status:** Approved

---

## Overview

A complete rebuild of voxel-buddy as a Skales-inspired desktop communication companion. The app surfaces Slack and Gmail notifications through an animated SVG mascot with an AI personality, supports multiple layout modes (including a Desktop Pet mode), and is built to expand to additional integrations over time.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Shell | Electron | Cross-platform desktop, existing foundation |
| Renderer build | Vite + React | Fast dev, component architecture, no SSR overhead |
| Styling | Tailwind CSS | Skales-inspired dark theme, utility-first |
| State | Zustand | Lightweight global store, no boilerplate |
| AI calls | Electron main process (IPC) | API keys never exposed to renderer |
| Settings storage | `~/.voxelbuddy/settings.json` | Local-first, user-owned |

---

## Project Structure

```
voxel-buddy/
├── main.js                        # Electron main process (extended)
├── preload.js                     # IPC bridge (small update)
├── slack.js                       # Slack Socket Mode client (unchanged)
├── index.html                     # Vite entry point
├── vite.config.js
├── src/
│   ├── main.jsx                   # React entry
│   ├── store.js                   # Zustand store (notifications, layout, settings)
│   ├── integrations/
│   │   ├── index.js               # Integration registry
│   │   ├── slack.js               # Slack adapter
│   │   └── gmail.js               # Gmail adapter
│   ├── layouts/
│   │   ├── CompactWidget.jsx      # Default: small corner widget
│   │   ├── FloatingSidebar.jsx    # Slide-in panel from screen edge
│   │   ├── TrayPanel.jsx          # System tray popup
│   │   ├── FullWindow.jsx         # Full Skales-style window
│   │   └── DesktopPet.jsx         # Transparent foreground wandering pet
│   ├── components/
│   │   ├── Mascot.jsx             # SVG mascot + animation state machine
│   │   ├── SpeechBubble.jsx       # Chat bubble (notification + AI quip + reply input)
│   │   ├── NotificationFeed.jsx   # Scrollable notification list
│   │   ├── IntegrationBadge.jsx   # Per-source icon + unread count
│   │   └── Settings.jsx           # Layout switcher + AI model + integration config
│   └── styles/
│       └── globals.css
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-10-voxel-buddy-redesign.md
```

---

## Layout Modes

Five modes, switchable at any time from the Settings panel. Active mode persists in `~/.voxelbuddy/settings.json`.

### 1. Compact Widget (default on first launch)
- Small corner-anchored window (~200×250px), transparent background
- Mascot displayed with unread badge count
- Click expands inline mini notification list
- Gear icon in corner opens Settings

### 2. Floating Sidebar
- ~320px wide panel slides in from right screen edge
- Mascot at top, scrollable notification feed below
- Auto-hides on outside click; thin drag-handle stays visible at edge to re-open
- Gear icon in header

### 3. Tray Panel
- App lives in system tray (icon = mascot face)
- Clicking tray icon opens ~380×500px panel above taskbar
- Compact mascot at top, notification feed below
- Closes on outside click

### 4. Full Window (Skales-style)
- ~900×600px app window
- Left sidebar: integration icons (Slack, Gmail, + future placeholders)
- Main content: notification feed with full message detail
- Mascot floats bottom-right of main pane with speech bubble
- Best for reviewing older notifications

### 5. Desktop Pet
- Transparent, always-on-top, frameless window (full screen overlay; all clicks pass through to desktop except the mascot hitbox and any open chat bubble)
- Mascot wanders left/right along bottom of screen
- Sleeps after inactivity; wakes on notification
- On notification: stops wandering, plays alert animation, chat bubble appears above
- Clicking mascot triggers wave + random idle AI quip

---

## Mascot Design

**Character:** A small, chill, slightly amorphous blob-like entity. Rounded silhouette (pebble/cloud shape). No robot clichés. Big expressive eyes carry all emotion. Tiny stubby arms react to state.

**Visual:**
- Pure SVG, ~120×120px artboard
- Deep slate/navy body (#1a1f2e) with soft teal/cyan inner glow (#38bdf8)
- Two large expressive eyes (move, blink, widen)
- Stubby arms (raise, wave, droop)
- Subtle ambient floating particle effect (idle processing feel)

**Animation States (CSS + SVG, no JS animation library):**

| State | Behavior |
|---|---|
| `idle` | Gentle breathing scale pulse, eyes blink every ~4s |
| `thinking` | Eyes look up-left, particles spin faster |
| `alert` | Eyes widen, body bounces up, arms raise |
| `wave` | One arm waves, slight lean |
| `sleep` | Eyes closed (zzz arc), breathing slows |
| `happy` | Eyes curve into arcs, small bounce |

---

## Chat Bubble (Desktop Pet + all modes)

When a notification arrives, a chat bubble appears above the mascot (or inline in feed modes). It has three layers:

1. **Notification** — sender name + message/subject preview
2. **Mascot's take** — AI-generated reaction (witty, in-character, 1-2 sentences)
3. **Reply input** — small text field, optionally pre-filled with AI suggestion (user can edit before sending)

- Rounded rectangle with tail pointing to mascot
- Dark background (#1a1f2e), soft teal border glow
- Slides in from above, fades out after ~6s or on click/send
- Send button fires reply via Slack Web API or Gmail API
- Mascot plays `wave` animation after send

---

## AI Personality Layer

**Personality:** Chill, slightly sardonic, genuinely helpful. Short responses (1-2 sentences). Consistent voice across all providers.

**System prompt includes:**
- Mascot name and personality description
- User's name and workspace/account context
- Notification type (DM, mention, email) and sender
- Instruction to keep responses concise

**Three AI call types:**

| Trigger | Output |
|---|---|
| Notification arrives | Mascot reaction to the message |
| User clicks mascot (idle) | Random idle quip |
| User types reply | Optional AI-polished suggestion |

**Supported providers at launch:**

| Provider | Models |
|---|---|
| Anthropic (Claude) | `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6` |
| OpenAI | `gpt-4o`, `gpt-4o-mini` |
| Google (Gemma 4) | `gemma-4` via Google AI Studio |
| Ollama (local) | Any locally running model (llama3, mistral, etc.) |

**Architecture:**
- All AI calls happen in the Electron main process via IPC — API keys never reach the renderer
- Common `ai.respond(prompt, context)` interface — adding a new provider = one new adapter file
- Graceful degradation: if no key configured or call fails, mascot still animates and shows raw notification

**Settings stored in `~/.voxelbuddy/settings.json`:**
```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5",
    "apiKey": "sk-ant-...",
    "openaiApiKey": "sk-...",
    "googleApiKey": "...",
    "ollamaEndpoint": "http://localhost:11434"
  }
}
```

---

## Integration Architecture

### Unified Notification Format
All integrations map to this shape:
```js
{
  id: "uuid",
  source: "slack" | "gmail",
  type: "dm" | "mention" | "email",
  sender: { name: "Alice", avatar: "url" },
  text: "Hey, got a minute?",
  timestamp: 1234567890,
  raw: { /* original event payload */ },
  replyFn: async (text) => { /* sends reply back to source */ }
}
```

### Slack Integration
- **Real-time:** Socket Mode client (existing `slack.js`, adapted to unified format)
- **Notification types:** DMs, @mentions
- **Reply:** Slack Web API (`chat.postMessage`)
- **Auth:** `SLACK_APP_TOKEN` + `SLACK_BOT_TOKEN` via settings UI (no env vars required)

### Gmail Integration
- **Auth:** Google OAuth 2.0 — "Connect Gmail" button in settings opens browser consent flow; tokens stored in settings file
- **Real-time:** Gmail Push Notifications via Google Pub/Sub (falls back to 60s polling)
- **Notification types:** New inbox emails, replies to watched threads
- **Notification display:** Sender name + email subject as preview
- **Reply:** Gmail API thread reply

### Extensibility
- Each integration = one file in `src/integrations/`
- Registers itself in `src/integrations/index.js`
- No changes needed to mascot, AI layer, or layouts when adding new integrations
- UI: Full Window sidebar shows integration icons with per-source unread counts; unused slots shown as greyed-out `+` placeholders

---

## Settings Panel

Accessible from all layout modes via gear icon. Sections:

1. **Layout** — select active mode (5 options)
2. **AI Model** — provider dropdown, model dropdown, API key input, active model badge
3. **Integrations** — connect/disconnect Slack and Gmail, status indicators
4. **Mascot** — name (editable), personality tone slider (subtle adjustments)

---

## What's Reused from Current voxel-buddy

| File | Status |
|---|---|
| `slack.js` | Kept, minor adaptation to unified format |
| `preload.js` | Kept, small IPC additions |
| `main.js` | Extended for tray, multi-window layout support |
| `renderer/` | Replaced entirely by `src/` |
| `package.json` | Updated with new dependencies |

---

## Out of Scope (for now)
- GitHub, Linear, or other integrations (architecture supports them, UI has placeholders)
- Message threading / history view
- Mobile companion app
- Multi-account Slack / Gmail support
