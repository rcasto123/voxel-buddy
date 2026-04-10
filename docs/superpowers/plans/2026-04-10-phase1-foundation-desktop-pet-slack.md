# Phase 1: Foundation + Desktop Pet + Slack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild voxel-buddy as an Electron + Vite + React app with an animated SVG mascot that lives on the desktop, wanders around, and reacts to Slack DMs and @mentions with animated speech bubbles and a reply input.

**Architecture:** Electron main process runs the Slack Socket Mode client and handles all IPC. It forwards notifications to the React renderer via `ipcMain/ipcRenderer`. The renderer is a Vite + React + Tailwind app that manages state with Zustand and renders the Desktop Pet layout (transparent, always-on-top, full-screen overlay). The mascot wanders via a `requestAnimationFrame` game loop in a custom React hook.

**Tech Stack:** Electron 33, Vite 5, React 18, Tailwind CSS 3, Zustand 5, Vitest 2, @slack/socket-mode, @slack/web-api, uuid, concurrently, wait-on

---

## File Map

| File | Responsibility | Status |
|---|---|---|
| `package.json` | Scripts + dependencies | Modify |
| `vite.config.js` | Vite build + Vitest config | Create |
| `tailwind.config.js` | Dark theme with teal accent | Create |
| `postcss.config.js` | PostCSS for Tailwind | Create |
| `index.html` | Vite HTML entry point | Create |
| `main.js` | Electron main: window, IPC, Slack start | Modify |
| `preload.js` | contextBridge: expose buddy API to renderer | Modify |
| `integrations/index.js` | Integration registry + unified Notification type | Create |
| `integrations/slack.js` | Slack Socket Mode adapter → unified format | Modify (from slack.js) |
| `src/main.jsx` | React entry: mount App | Create |
| `src/App.jsx` | Layout router: renders active layout | Create |
| `src/store.js` | Zustand store: notifications, mascotState | Create |
| `src/styles/globals.css` | Tailwind base + mascot CSS animations | Create |
| `src/components/Mascot.jsx` | SVG mascot, 6 animated states | Create |
| `src/components/SpeechBubble.jsx` | Notification + AI placeholder + reply input | Create |
| `src/layouts/DesktopPet.jsx` | Transparent overlay, wandering mascot + bubble | Create |
| `src/__tests__/store.test.js` | Zustand store unit tests | Create |
| `src/__tests__/integrations.test.js` | Slack adapter unit tests | Create |

---

## Task 1: Update package.json and install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace package.json content**

```json
{
  "name": "voxel-buddy",
  "version": "2.0.0",
  "description": "Skales-inspired desktop communication companion",
  "main": "main.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "NODE_ENV=development electron .",
    "dev:all": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run dev:electron\"",
    "build": "vite build",
    "start": "electron .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@slack/socket-mode": "^2.0.0",
    "@slack/web-api": "^7.0.0",
    "electron": "^33.0.0",
    "uuid": "^11.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "concurrently": "^9.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: All packages installed, no peer dep errors for our chosen versions.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: update package.json for Vite + React + Tailwind rebuild"
```

---

## Task 2: Create build configuration files

**Files:**
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`

- [ ] **Step 1: Create vite.config.js**

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
```

- [ ] **Step 2: Create tailwind.config.js**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        buddy: {
          bg: '#1a1f2e',
          surface: '#242938',
          border: '#2e3650',
          glow: '#38bdf8',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#38bdf8',
          danger: '#f87171',
        },
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 0.4s ease-in-out 2',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'wave-arm': 'waveArm 0.4s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.25s ease-out',
        'fade-out': 'fadeOut 0.25s ease-in forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.75' },
        },
        waveArm: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-40deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)', opacity: '0.6' },
          '50%': { transform: 'translateY(-5px)', opacity: '0.2' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Create postcss.config.js**

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Voxel Buddy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; background: transparent; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create test setup file**

```bash
mkdir -p src/__tests__
```

```js
// src/__tests__/setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Commit**

```bash
git add vite.config.js tailwind.config.js postcss.config.js index.html src/__tests__/setup.js
git commit -m "feat: add Vite, Tailwind, and Vitest build configuration"
```

---

## Task 3: Create global CSS with mascot animations

**Files:**
- Create: `src/styles/globals.css`

- [ ] **Step 1: Create globals.css**

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Mascot state animations ─────────────────────────── */

/* idle: breathing body, floating particles, pulsing glow */
.mascot--idle .mascot-body {
  animation: breathe 3s ease-in-out infinite;
  transform-origin: center;
}
.mascot--idle .mascot-glow {
  animation: pulseGlow 3s ease-in-out infinite;
}
.mascot--idle .particle { animation: float 3s ease-in-out infinite; }
.mascot--idle .particle:nth-child(2) { animation-delay: 1s; }
.mascot--idle .particle:nth-child(3) { animation-delay: 2s; }
.mascot--idle .particle:nth-child(4) { animation-delay: 0.5s; }

/* alert: bounce + red glow */
.mascot--alert .mascot-body {
  animation: bounceSoft 0.4s ease-in-out 2;
  transform-origin: center;
}
.mascot--alert .mascot-glow {
  animation: pulseGlow 0.5s ease-in-out infinite;
  stroke: #f87171;
}

/* wave: right arm waves */
.mascot--wave .mascot-body {
  animation: breathe 2s ease-in-out infinite;
  transform-origin: center;
}
.mascot--wave .arm-right {
  animation: waveArm 0.4s ease-in-out infinite alternate;
  transform-origin: 98px 66px;
}

/* sleep: slow breathing, dim glow */
.mascot--sleep .mascot-body {
  animation: breathe 6s ease-in-out infinite;
  transform-origin: center;
}
.mascot--sleep .mascot-glow { opacity: 0.1; }

/* thinking: fast particles */
.mascot--thinking .particle { animation: float 0.8s ease-in-out infinite; }
.mascot--thinking .mascot-glow {
  animation: pulseGlow 1s ease-in-out infinite;
}

/* happy: bounce + bright glow */
.mascot--happy .mascot-body {
  animation: bounceSoft 0.3s ease-in-out 2;
  transform-origin: center;
}
.mascot--happy .mascot-glow { opacity: 0.75; }

/* ── Speech bubble animation ──────────────────────────── */
.bubble-enter { animation: slideUp 0.25s ease-out; }
.bubble-exit  { animation: fadeOut 0.25s ease-in forwards; }

/* ── Desktop Pet click-through helper ─────────────────── */
body { user-select: none; }
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: add mascot state CSS animations"
```

---

## Task 4: Create Zustand store

**Files:**
- Create: `src/store.js`
- Create: `src/__tests__/store.test.js`

- [ ] **Step 1: Write the failing tests first**

```js
// src/__tests__/store.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from '../store.js'

// Helper: get fresh store state
function getStore() {
  return useStore.getState()
}

// Reset store between tests
beforeEach(() => {
  useStore.setState({
    notifications: [],
    mascotState: 'idle',
    layoutMode: 'desktop-pet',
  })
})

describe('addNotification', () => {
  it('adds a notification to the list', () => {
    const n = { id: '1', source: 'slack', type: 'dm', sender: { name: 'Alice', avatar: null }, text: 'Hey!', timestamp: 1000 }
    act(() => getStore().addNotification(n))
    expect(getStore().notifications).toHaveLength(1)
    expect(getStore().notifications[0].text).toBe('Hey!')
  })

  it('prepends new notifications (newest first)', () => {
    const n1 = { id: '1', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'first', timestamp: 1000 }
    const n2 = { id: '2', source: 'slack', type: 'dm', sender: { name: 'B', avatar: null }, text: 'second', timestamp: 2000 }
    act(() => {
      getStore().addNotification(n1)
      getStore().addNotification(n2)
    })
    expect(getStore().notifications[0].text).toBe('second')
  })

  it('caps the list at 50 notifications', () => {
    act(() => {
      for (let i = 0; i < 55; i++) {
        getStore().addNotification({ id: String(i), source: 'slack', type: 'dm', sender: { name: 'X', avatar: null }, text: String(i), timestamp: i })
      }
    })
    expect(getStore().notifications).toHaveLength(50)
  })
})

describe('clearNotification', () => {
  it('removes a notification by id', () => {
    const n = { id: 'abc', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'hi', timestamp: 1 }
    act(() => {
      getStore().addNotification(n)
      getStore().clearNotification('abc')
    })
    expect(getStore().notifications).toHaveLength(0)
  })
})

describe('setMascotState', () => {
  it('updates mascot state', () => {
    act(() => getStore().setMascotState('alert'))
    expect(getStore().mascotState).toBe('alert')
  })

  it('rejects unknown states', () => {
    act(() => getStore().setMascotState('dancing'))
    expect(getStore().mascotState).toBe('idle') // unchanged
  })
})

describe('unreadCount', () => {
  it('counts all notifications as unread', () => {
    act(() => {
      getStore().addNotification({ id: '1', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'a', timestamp: 1 })
      getStore().addNotification({ id: '2', source: 'slack', type: 'dm', sender: { name: 'B', avatar: null }, text: 'b', timestamp: 2 })
    })
    expect(getStore().unreadCount()).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- store
```

Expected: FAIL — `useStore` not found.

- [ ] **Step 3: Create src/store.js**

```js
// src/store.js
import { create } from 'zustand'

const VALID_STATES = new Set(['idle', 'alert', 'wave', 'sleep', 'thinking', 'happy'])
const MAX_NOTIFICATIONS = 50

export const useStore = create((set, get) => ({
  notifications: [],
  mascotState: 'idle',
  layoutMode: 'desktop-pet',
  settings: {
    mascotName: 'Buddy',
    layout: 'desktop-pet',
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
    })),

  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setMascotState: (newState) => {
    if (!VALID_STATES.has(newState)) return
    set({ mascotState: newState })
  },

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  unreadCount: () => get().notifications.length,
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- store
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store.js src/__tests__/store.test.js src/__tests__/setup.js
git commit -m "feat: add Zustand store with notification and mascot state management"
```

---

## Task 5: Update preload.js for new IPC channels

**Files:**
- Modify: `preload.js`

- [ ] **Step 1: Replace preload.js**

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddy', {
  // Receive a new notification from main process
  onNotification: (callback) => {
    ipcRenderer.on('buddy:notification', (_event, notification) => callback(notification))
  },

  // Send a reply back to its source (Slack, etc.)
  sendReply: (notificationId, text) => {
    ipcRenderer.invoke('buddy:send-reply', { notificationId, text })
  },

  // Notify main process that mouse entered/left mascot hitbox (for click-through)
  setMouseOverMascot: (isOver) => {
    ipcRenderer.send('buddy:mouse-over-mascot', isOver)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('buddy:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('buddy:save-settings', settings),
})
```

- [ ] **Step 2: Commit**

```bash
git add preload.js
git commit -m "feat: update preload.js with new IPC channels for Phase 1"
```

---

## Task 6: Create integration registry

**Files:**
- Create: `integrations/index.js`
- Create: `src/__tests__/integrations.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/integrations.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the registry in isolation — import after we create it
let registry

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../../integrations/index.js')
  registry = mod
})

describe('integration registry', () => {
  it('starts with zero registered integrations', () => {
    expect(registry.getAll()).toHaveLength(0)
  })

  it('registers an integration', () => {
    const fake = { name: 'test', start: vi.fn(), stop: vi.fn() }
    registry.register(fake)
    expect(registry.getAll()).toHaveLength(1)
  })

  it('startAll calls start on every registered integration', async () => {
    const onNotification = vi.fn()
    const fake1 = { name: 'a', start: vi.fn(), stop: vi.fn() }
    const fake2 = { name: 'b', start: vi.fn(), stop: vi.fn() }
    registry.register(fake1)
    registry.register(fake2)
    await registry.startAll(onNotification)
    expect(fake1.start).toHaveBeenCalledWith(onNotification)
    expect(fake2.start).toHaveBeenCalledWith(onNotification)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- integrations
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create integrations/index.js**

```js
// integrations/index.js

/**
 * Unified Notification shape (all integrations must produce this):
 * {
 *   id: string,           // uuid
 *   source: string,       // 'slack' | 'gmail'
 *   type: string,         // 'dm' | 'mention' | 'email'
 *   sender: {
 *     name: string,
 *     avatar: string | null,
 *   },
 *   text: string,
 *   timestamp: number,    // Unix ms
 * }
 *
 * replyFn is NOT in the notification — main process stores a Map<id, replyFn>
 */

const _integrations = []

function register(integration) {
  _integrations.push(integration)
}

function getAll() {
  return [..._integrations]
}

async function startAll(onNotification) {
  for (const integration of _integrations) {
    await integration.start(onNotification)
  }
}

async function stopAll() {
  for (const integration of _integrations) {
    if (integration.stop) await integration.stop()
  }
}

module.exports = { register, getAll, startAll, stopAll }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- integrations
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add integrations/index.js src/__tests__/integrations.test.js
git commit -m "feat: add integration registry with unified notification interface"
```

---

## Task 7: Create Slack integration adapter

**Files:**
- Create: `integrations/slack.js` (replaces root `slack.js`)
- Modify: `src/__tests__/integrations.test.js`

- [ ] **Step 1: Add Slack adapter tests**

Append to `src/__tests__/integrations.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

// Mock @slack/socket-mode before importing adapter
vi.mock('@slack/socket-mode', () => ({
  SocketModeClient: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
  })),
}))

describe('Slack adapter', () => {
  it('maps a DM event to unified notification format', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.js')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    // Simulate a DM event firing
    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results[0].value
    const messageHandler = instance.on.mock.calls.find(([event]) => event === 'message')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    await messageHandler({
      event: { channel_type: 'im', user: 'U123', text: 'Hello world', channel: 'D456' },
      ack: fakeAck,
    })

    expect(fakeAck).toHaveBeenCalled()
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      source: 'slack',
      type: 'dm',
      sender: { name: 'U123' },
      text: 'Hello world',
    })
    expect(typeof notifications[0].id).toBe('string')
    expect(typeof notifications[0].timestamp).toBe('number')
  })

  it('maps a mention event to unified notification format', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.js')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results[1].value
    const mentionHandler = instance.on.mock.calls.find(([event]) => event === 'app_mention')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    await mentionHandler({
      event: { user: 'U999', text: '<@UBOT> hey buddy', channel: 'C123' },
      ack: fakeAck,
    })

    expect(notifications[0]).toMatchObject({
      source: 'slack',
      type: 'mention',
      sender: { name: 'U999' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- integrations
```

Expected: FAIL — `integrations/slack.js` not found.

- [ ] **Step 3: Create integrations/slack.js**

```js
// integrations/slack.js
const { SocketModeClient } = require('@slack/socket-mode')
const { WebClient } = require('@slack/web-api')
const { v4: uuidv4 } = require('uuid')

/**
 * createSlackAdapter({ appToken, botToken })
 * Returns an integration object matching the registry interface.
 */
function createSlackAdapter({ appToken, botToken }) {
  let client = null
  let webClient = null

  // Map<notificationId, replyFn> — shared with main process via module scope
  const replyHandlers = new Map()

  return {
    name: 'slack',
    replyHandlers,

    async start(onNotification) {
      if (!appToken || !botToken) {
        console.warn('[Slack] Missing tokens — integration disabled.')
        return
      }

      webClient = new WebClient(botToken)
      client = new SocketModeClient({ appToken })

      client.on('message', async ({ event, ack }) => {
        await ack()
        if (!event || event.channel_type !== 'im') return

        const id = uuidv4()
        const notification = {
          id,
          source: 'slack',
          type: 'dm',
          sender: { name: event.user || 'unknown', avatar: null },
          text: (event.text || '').substring(0, 200),
          timestamp: Date.now(),
        }

        replyHandlers.set(id, async (replyText) => {
          await webClient.chat.postMessage({ channel: event.channel, text: replyText })
        })

        onNotification(notification)
      })

      client.on('app_mention', async ({ event, ack }) => {
        await ack()

        const id = uuidv4()
        const notification = {
          id,
          source: 'slack',
          type: 'mention',
          sender: { name: event.user || 'unknown', avatar: null },
          text: (event.text || '').substring(0, 200),
          timestamp: Date.now(),
        }

        replyHandlers.set(id, async (replyText) => {
          await webClient.chat.postMessage({ channel: event.channel, text: replyText })
        })

        onNotification(notification)
      })

      client.on('connecting', () => console.log('[Slack] Connecting...'))
      client.on('connected', () => console.log('[Slack] Connected.'))
      client.on('reconnecting', () => console.log('[Slack] Reconnecting...'))
      client.on('disconnected', () => console.log('[Slack] Disconnected.'))

      await client.start()
      console.log('[Slack] Socket Mode started.')
    },

    async stop() {
      if (client) await client.disconnect()
    },
  }
}

module.exports = { createSlackAdapter }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- integrations
```

Expected: All tests PASS.

- [ ] **Step 5: Delete the old slack.js**

```bash
git rm slack.js
```

- [ ] **Step 6: Commit**

```bash
git add integrations/slack.js src/__tests__/integrations.test.js
git commit -m "feat: add Slack integration adapter with unified notification format"
```

---

## Task 8: Create Mascot SVG component

**Files:**
- Create: `src/components/Mascot.jsx`

- [ ] **Step 1: Create Mascot.jsx**

```jsx
// src/components/Mascot.jsx
// Animated SVG mascot. State controls which eyes/animations are shown.
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

export function Mascot({ state = 'idle', size = 120, className = '' }) {
  const isSleep = state === 'sleep'
  const isHappy = state === 'happy'
  const isAlert = state === 'alert'
  const isThinking = state === 'thinking'

  // Thinking: pupils shift up-left
  const lPupilX = isThinking ? 41 : 44
  const lPupilY = isThinking ? 48 : 52
  const rPupilX = isThinking ? 73 : 76
  const rPupilY = isThinking ? 48 : 52
  const eyeR = isAlert ? 11 : 9

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot mascot--${state} ${className}`}
      aria-label={`Buddy is ${state}`}
    >
      {/* Ambient floating particles */}
      <circle className="particle" cx="28" cy="30" r="2" fill="#38bdf8" opacity="0.6" />
      <circle className="particle" cx="92" cy="38" r="1.5" fill="#38bdf8" opacity="0.5" />
      <circle className="particle" cx="18" cy="72" r="1" fill="#38bdf8" opacity="0.4" />
      <circle className="particle" cx="102" cy="68" r="1.5" fill="#38bdf8" opacity="0.5" />

      {/* Outer glow border */}
      <path
        className="mascot-glow"
        d="M60 16 C82 12 104 32 104 56 C104 80 83 100 60 100 C37 100 16 80 16 56 C16 32 38 20 60 16 Z"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.5"
        opacity="0.35"
      />

      {/* Body */}
      <path
        className="mascot-body"
        d="M60 16 C82 12 104 32 104 56 C104 80 83 100 60 100 C37 100 16 80 16 56 C16 32 38 20 60 16 Z"
        fill="#1a1f2e"
      />

      {/* Inner ambient glow */}
      <ellipse cx="60" cy="60" rx="24" ry="20" fill="#38bdf8" opacity="0.06" />

      {/* ── Eyes ── */}

      {/* Normal / alert eyes */}
      {!isSleep && !isHappy && (
        <>
          {/* Left eye */}
          <circle cx="44" cy="52" r={eyeR} fill="#e2e8f0" />
          <circle cx={lPupilX} cy={lPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="42" cy="49" r="1.8" fill="white" />

          {/* Right eye */}
          <circle cx="76" cy="52" r={eyeR} fill="#e2e8f0" />
          <circle cx={rPupilX} cy={rPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="74" cy="49" r="1.8" fill="white" />
        </>
      )}

      {/* Sleep eyes: closed arc lines + zzz */}
      {isSleep && (
        <>
          <path d="M36 52 Q44 44 52 52" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M68 52 Q76 44 84 52" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="85" y="32" fontSize="10" fill="#38bdf8" opacity="0.8" fontFamily="monospace" fontWeight="bold">z</text>
          <text x="93" y="23" fontSize="8"  fill="#38bdf8" opacity="0.5" fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* Happy eyes: upward arc */}
      {isHappy && (
        <>
          <path d="M36 56 Q44 45 52 56" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 56 Q76 45 84 56" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Arms ── */}
      <path
        className="arm arm-left"
        d="M22 66 C12 58 10 72 20 74"
        stroke="#38bdf8"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        className="arm arm-right"
        d="M98 66 C108 58 110 72 100 74"
        stroke="#38bdf8"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Mascot.jsx
git commit -m "feat: add animated SVG mascot component with 6 states"
```

---

## Task 9: Create SpeechBubble component

**Files:**
- Create: `src/components/SpeechBubble.jsx`

The bubble has three layers: notification preview, AI placeholder (Phase 3 wires real AI), and reply input.

- [ ] **Step 1: Create SpeechBubble.jsx**

```jsx
// src/components/SpeechBubble.jsx
import { useState, useEffect } from 'react'

/**
 * Props:
 *   notification: { id, source, type, sender: { name }, text }
 *   onDismiss: () => void
 *   onReply: (notificationId, text) => void
 *   autoDismissMs: number (default 8000, 0 = never)
 */
export function SpeechBubble({ notification, onDismiss, onReply, autoDismissMs = 8000 }) {
  const [replyText, setReplyText] = useState('')
  const [sent, setSent] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Auto-dismiss timer
  useEffect(() => {
    if (!autoDismissMs) return
    const timer = setTimeout(() => dismiss(), autoDismissMs)
    return () => clearTimeout(timer)
  }, [autoDismissMs])

  function dismiss() {
    setExiting(true)
    setTimeout(onDismiss, 250) // wait for fade-out animation
  }

  function handleSend() {
    if (!replyText.trim()) return
    onReply(notification.id, replyText.trim())
    setSent(true)
    setReplyText('')
    setTimeout(dismiss, 1000)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') dismiss()
  }

  const typeLabel = notification.type === 'dm' ? 'DM' : notification.type === 'mention' ? 'Mention' : 'Email'
  const sourceLabel = notification.source === 'slack' ? '🔔 Slack' : '📧 Gmail'

  return (
    <div
      className={`
        ${exiting ? 'bubble-exit' : 'bubble-enter'}
        w-72 rounded-2xl border border-buddy-border bg-buddy-surface shadow-2xl shadow-black/40
        flex flex-col gap-2 p-3 text-buddy-text
      `}
    >
      {/* Bubble tail (pointing down toward mascot) */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-t-[10px] border-t-buddy-border" />

      {/* ── Layer 1: Notification ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-buddy-muted">{sourceLabel}</span>
            <span className="text-xs bg-buddy-border text-buddy-muted px-1.5 py-0.5 rounded">{typeLabel}</span>
          </div>
          <p className="text-xs font-semibold text-buddy-glow truncate">{notification.sender.name}</p>
          <p className="text-sm leading-snug line-clamp-2 mt-0.5">{notification.text}</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-buddy-muted hover:text-buddy-text text-lg leading-none -mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* ── Layer 2: AI quip placeholder ── */}
      <div className="border-t border-buddy-border pt-2">
        <p className="text-xs text-buddy-muted italic">
          💬 <span className="text-buddy-glow/70">Buddy</span>
          {' '}· <span className="text-buddy-muted">AI responses coming in Phase 3</span>
        </p>
      </div>

      {/* ── Layer 3: Reply input ── */}
      <div className="border-t border-buddy-border pt-2 flex gap-2">
        {sent ? (
          <p className="text-xs text-buddy-glow w-full text-center py-1">Sent ✓</p>
        ) : (
          <>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply…"
              className="flex-1 bg-buddy-bg border border-buddy-border rounded-lg px-2.5 py-1.5
                text-sm text-buddy-text placeholder:text-buddy-muted
                focus:outline-none focus:border-buddy-glow/60 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-buddy-glow/20 text-buddy-glow
                border border-buddy-glow/30 hover:bg-buddy-glow/30
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SpeechBubble.jsx
git commit -m "feat: add SpeechBubble component with notification, AI placeholder, and reply input"
```

---

## Task 10: Create Desktop Pet layout

**Files:**
- Create: `src/layouts/DesktopPet.jsx`

The mascot wanders left/right via a `requestAnimationFrame` game loop in a custom hook. On notification, it stops, plays `alert` then `wave`, and shows the speech bubble above.

- [ ] **Step 1: Create src/layouts/DesktopPet.jsx**

```jsx
// src/layouts/DesktopPet.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mascot } from '../components/Mascot.jsx'
import { SpeechBubble } from '../components/SpeechBubble.jsx'
import { useStore } from '../store.js'

const MASCOT_SIZE = 100
const WALK_SPEED = 40   // px/s
const IDLE_AFTER = 20   // seconds of no notifications before sleep

export function DesktopPet() {
  const { notifications, mascotState, setMascotState, clearNotification } = useStore()

  const [posX, setPosX] = useState(window.innerWidth / 2)
  const [facing, setFacing] = useState(1) // 1 = right, -1 = left
  const [activeBubble, setActiveBubble] = useState(null) // notification object or null

  const stateRef = useRef('idle')
  const posXRef = useRef(posX)
  const facingRef = useRef(1)
  const lastTimeRef = useRef(performance.now())
  const idleAccumRef = useRef(0)
  const stateTimerRef = useRef(0)
  const stateDurationRef = useRef(rand(3, 6))
  const notificationQueueRef = useRef([])
  const rafRef = useRef(null)

  function rand(a, b) { return a + Math.random() * (b - a) }

  // Map internal locomotion states to mascot visual states
  const VISUAL_STATE = { idle: 'idle', walk: 'idle', alert: 'alert', wave: 'wave', sleep: 'sleep', happy: 'happy', thinking: 'thinking' }

  const setState = useCallback((s, duration) => {
    stateRef.current = s
    stateTimerRef.current = 0
    stateDurationRef.current = duration ?? rand(3, 6)
    setMascotState(VISUAL_STATE[s] ?? 'idle')

    if (s === 'alert' || s === 'wave') {
      idleAccumRef.current = 0
    }
  }, [setMascotState])

  // Enqueue incoming notifications
  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[0]
    // Only enqueue if not already in queue
    if (!notificationQueueRef.current.find((n) => n.id === latest.id)) {
      notificationQueueRef.current.push(latest)
    }
  }, [notifications])

  // Game loop
  useEffect(() => {
    function loop() {
      const now = performance.now()
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      idleAccumRef.current += dt
      stateTimerRef.current += dt

      const maxX = window.innerWidth - MASCOT_SIZE - 20
      const minX = 20
      const current = stateRef.current
      const queue = notificationQueueRef.current

      // Notification arrives → alert (unless already alerting/waving)
      if (queue.length > 0 && current !== 'alert' && current !== 'wave') {
        const next = queue.shift()
        setState('alert', 2.5)
        setActiveBubble(next)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (current === 'idle') {
        if (idleAccumRef.current >= IDLE_AFTER) {
          setState('sleep')
        } else if (stateTimerRef.current >= stateDurationRef.current) {
          const dir = Math.random() > 0.5 ? 1 : -1
          facingRef.current = dir
          setFacing(dir)
          setState('walk', rand(2, 4))
        }
      } else if (current === 'walk') {
        const newX = posXRef.current + facingRef.current * WALK_SPEED * dt
        const clamped = Math.max(minX, Math.min(maxX, newX))
        if (clamped !== newX) {
          facingRef.current = -facingRef.current
          setFacing(facingRef.current)
        }
        posXRef.current = clamped
        setPosX(clamped)

        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('idle')
        }
      } else if (current === 'alert') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('wave', 2.5)
        }
      } else if (current === 'wave') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          if (queue.length > 0) {
            const next = queue.shift()
            setState('alert', 2.5)
            setActiveBubble(next)
          } else {
            setState('happy', 1.5)
          }
        }
      } else if (current === 'happy') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('idle')
        }
      } else if (current === 'sleep') {
        if (queue.length > 0) {
          const next = queue.shift()
          setState('alert', 2.5)
          setActiveBubble(next)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setState])

  // Click mascot → wave + idle quip
  function handleMascotClick() {
    if (stateRef.current === 'alert' || stateRef.current === 'wave') return
    setState('wave', 2)
  }

  // Mouse enter/leave mascot: tell main process to disable/re-enable click-through
  function handleMouseEnter() { window.buddy?.setMouseOverMascot(true) }
  function handleMouseLeave() { window.buddy?.setMouseOverMascot(false) }

  function handleDismissBubble() {
    if (activeBubble) clearNotification(activeBubble.id)
    setActiveBubble(null)
  }

  function handleReply(notificationId, text) {
    window.buddy?.sendReply(notificationId, text)
  }

  const mascotBottom = 24 // px from bottom of screen
  const mascotLeft = posX - MASCOT_SIZE / 2
  const bubbleBottom = mascotBottom + MASCOT_SIZE + 12

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Speech bubble — positioned above mascot */}
      {activeBubble && (
        <div
          className="absolute pointer-events-auto"
          style={{
            bottom: bubbleBottom,
            left: Math.max(8, Math.min(window.innerWidth - 296, posX - 144)),
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <SpeechBubble
            notification={activeBubble}
            onDismiss={handleDismissBubble}
            onReply={handleReply}
          />
        </div>
      )}

      {/* Mascot */}
      <div
        className="absolute pointer-events-auto cursor-pointer"
        style={{
          bottom: mascotBottom,
          left: mascotLeft,
          transform: facing < 0 ? 'scaleX(-1)' : 'none',
          transition: 'transform 0.15s ease',
        }}
        onClick={handleMascotClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Mascot state={mascotState} size={MASCOT_SIZE} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/DesktopPet.jsx
git commit -m "feat: add Desktop Pet layout with wandering mascot and speech bubble"
```

---

## Task 11: Create App shell

**Files:**
- Create: `src/App.jsx`
- Create: `src/main.jsx`

- [ ] **Step 1: Create src/App.jsx**

```jsx
// src/App.jsx
import { useEffect } from 'react'
import { useStore } from './store.js'
import { DesktopPet } from './layouts/DesktopPet.jsx'

// Future layouts imported here in later phases
const LAYOUTS = {
  'desktop-pet': DesktopPet,
}

export function App() {
  const { layoutMode, addNotification, setMascotState } = useStore()

  // Listen for notifications from Electron main process
  useEffect(() => {
    if (!window.buddy) return
    window.buddy.onNotification((notification) => {
      addNotification(notification)
    })
  }, [addNotification])

  const Layout = LAYOUTS[layoutMode] ?? DesktopPet

  return <Layout />
}
```

- [ ] **Step 2: Create src/main.jsx**

```jsx
// src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import './styles/globals.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: add React app shell with layout router and notification listener"
```

---

## Task 12: Update main.js for Electron

**Files:**
- Modify: `main.js`

The main process must:
1. Load Vite dev server (dev) or `dist/index.html` (prod)
2. Configure a transparent, always-on-top, click-through window for Desktop Pet
3. Start the Slack integration
4. Handle IPC: notifications → renderer, replies → Slack
5. Handle click-through toggle (mouse over mascot)

- [ ] **Step 1: Replace main.js**

```js
// main.js
const { app, BrowserWindow, ipcMain, screen, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { register, startAll } = require('./integrations/index.js')
const { createSlackAdapter } = require('./integrations/slack.js')

const isDev = process.env.NODE_ENV === 'development'
const SETTINGS_PATH = path.join(os.homedir(), '.voxelbuddy', 'settings.json')

// ── Settings helpers ────────────────────────────────────────────
function loadSettings() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
    }
  } catch (e) {
    console.warn('[Settings] Failed to load:', e.message)
  }
  return { layout: 'desktop-pet', mascotName: 'Buddy' }
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  } catch (e) {
    console.warn('[Settings] Failed to save:', e.message)
  }
}

// ── Reply handler map ───────────────────────────────────────────
// Populated by integration adapters. Key = notificationId, Value = async fn(text)
const replyHandlers = new Map()

// ── Window ─────────────────────────────────────────────────────
let win = null

function createWindow(settings) {
  const { width, height } = screen.getPrimaryDisplay().bounds

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

// ── IPC handlers ────────────────────────────────────────────────
function registerIPC() {
  // Mouse over mascot → disable/re-enable click-through
  ipcMain.on('buddy:mouse-over-mascot', (_event, isOver) => {
    if (!win) return
    if (isOver) {
      win.setIgnoreMouseEvents(false)
      win.setFocusable(true)
    } else {
      win.setIgnoreMouseEvents(true, { forward: true })
      win.setFocusable(false)
    }
  })

  // Send reply via the correct integration
  ipcMain.handle('buddy:send-reply', async (_event, { notificationId, text }) => {
    const fn = replyHandlers.get(notificationId)
    if (!fn) { console.warn('[IPC] No reply handler for', notificationId); return }
    try {
      await fn(text)
      console.log('[IPC] Reply sent for', notificationId)
    } catch (e) {
      console.error('[IPC] Reply failed:', e.message)
    }
  })

  // Settings
  ipcMain.handle('buddy:get-settings', () => loadSettings())
  ipcMain.handle('buddy:save-settings', (_event, settings) => {
    saveSettings(settings)
    return true
  })
}

// ── Integrations ────────────────────────────────────────────────
async function startIntegrations() {
  const settings = loadSettings()
  const slackSettings = settings.integrations?.slack ?? {}
  const appToken = slackSettings.appToken || process.env.SLACK_APP_TOKEN
  const botToken = slackSettings.botToken || process.env.SLACK_BOT_TOKEN

  const slackAdapter = createSlackAdapter({ appToken, botToken })

  // Merge slack reply handlers into our global map
  register({
    name: 'slack',
    start: async (onNotification) => {
      await slackAdapter.start(onNotification)
      // Copy reply handlers populated by slackAdapter.start()
      slackAdapter.replyHandlers.forEach((fn, id) => replyHandlers.set(id, fn))
    },
    stop: () => slackAdapter.stop(),
  })

  // Intercept onNotification to also merge new reply handlers as they arrive
  function onNotification(notification) {
    // Slack adapter sets replyHandlers BEFORE calling onNotification — sync immediately
    slackAdapter.replyHandlers.forEach((fn, id) => replyHandlers.set(id, fn))

    if (win && !win.isDestroyed()) {
      win.webContents.send('buddy:notification', notification)
    }
  }

  await startAll(onNotification)
}

// ── App lifecycle ───────────────────────────────────────────────
app.whenReady().then(async () => {
  registerIPC()
  const settings = loadSettings()
  createWindow(settings)
  await startIntegrations()
})

app.on('window-all-closed', () => app.quit())
```

- [ ] **Step 2: Commit**

```bash
git add main.js
git commit -m "feat: update Electron main process for Desktop Pet, IPC, and Slack integration"
```

---

## Task 13: Update launch.json and verify dev workflow

**Files:**
- Modify: `.claude/launch.json`

- [ ] **Step 1: Update .claude/launch.json**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "Vite (renderer dev server)",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    },
    {
      "name": "Electron + Vite (full dev)",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:all"],
      "port": 5173
    }
  ]
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests PASS (store + integrations).

- [ ] **Step 3: Start the Vite dev server**

```bash
npm run dev
```

Expected: Vite starts on http://localhost:5173.

- [ ] **Step 4: In a separate terminal, start Electron**

```bash
npm run dev:electron
```

Expected: Electron window opens, transparent overlay, mascot visible in bottom center, wandering animation plays.

- [ ] **Step 5: Verify click-through works**

Click on the desktop behind the mascot — clicks should pass through. Click the mascot itself — wave animation plays.

- [ ] **Step 6: Verify Slack (if tokens available)**

```bash
SLACK_APP_TOKEN=xapp-... SLACK_BOT_TOKEN=xoxb-... npm run dev:electron
```

Send yourself a DM or @mention the bot. Expected: mascot plays `alert` → `wave`, speech bubble appears above with message preview and reply input.

- [ ] **Step 7: Final commit**

```bash
git add .claude/launch.json
git commit -m "feat: Phase 1 complete — Desktop Pet + Slack integration MVP"
```

---

## Phase 1 Complete ✓

**What you have after Phase 1:**
- Electron + Vite + React + Tailwind app running
- Animated SVG mascot with 6 states (idle, walk, alert, wave, sleep, happy)
- Desktop Pet mode: transparent overlay, mascot wanders, sleeps on inactivity
- Slack DMs + mentions → mascot alert animation + speech bubble
- Reply directly to Slack from the speech bubble
- Zustand store with tested notification management
- Integration registry ready for Gmail (Phase 2)
- Settings persisted to `~/.voxelbuddy/settings.json`

**Next phases (separate plans):**
- **Phase 2:** Gmail integration (OAuth + polling, unified format, reply)
- **Phase 3:** AI personality layer (Claude, OpenAI, Gemma 4, Ollama)
- **Phase 4:** Remaining layouts (CompactWidget, FloatingSidebar, TrayPanel, FullWindow) + Settings UI
