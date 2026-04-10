// main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { register, startAll } = require('./integrations/index.js')

const isDev = process.env.NODE_ENV === 'development'
const SETTINGS_PATH = path.join(os.homedir(), '.voxelbuddy', 'settings.json')

// ── Settings helpers ────────────────────────────────────────────
// Cached after first load — avoids repeated disk reads and TOCTOU issues.
let _cachedSettings = null

function loadSettings() {
  if (_cachedSettings) return _cachedSettings
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    if (fs.existsSync(SETTINGS_PATH)) {
      _cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
      return _cachedSettings
    }
  } catch (e) {
    console.warn('[Settings] Failed to load:', e.message)
  }
  _cachedSettings = { layout: 'desktop-pet', mascotName: 'Buddy' }
  return _cachedSettings
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    _cachedSettings = settings // keep cache in sync
  } catch (e) {
    console.warn('[Settings] Failed to save:', e.message)
  }
}

// ── Reply handler map ───────────────────────────────────────────
// Populated by integration adapters. Key = notificationId, Value = async fn(text)
// Entries are deleted after the reply is sent or the notification is dismissed.
const replyHandlers = new Map()

// ── Window ─────────────────────────────────────────────────────
let win = null

function createWindow() {
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

  // Send reply via the correct integration, then clean up the handler
  ipcMain.handle('buddy:send-reply', async (_event, { notificationId, text }) => {
    const fn = replyHandlers.get(notificationId)
    if (!fn) {
      console.warn('[IPC] No reply handler for', notificationId)
      return
    }
    try {
      await fn(text)
      console.log('[IPC] Reply sent for', notificationId)
    } catch (e) {
      console.error('[IPC] Reply failed:', e.message)
    } finally {
      // Always clean up — prevents the Map from growing unbounded
      replyHandlers.delete(notificationId)
    }
  })

  // Notification dismissed without replying — clean up the handler
  ipcMain.on('buddy:dismiss-notification', (_event, notificationId) => {
    replyHandlers.delete(notificationId)
  })

  // Settings — serve from cache, no repeated disk reads
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

  // integrations/slack.js is ESM — use dynamic import() from this CJS main process
  const { createSlackAdapter } = await import('./integrations/slack.js')
  const slackAdapter = createSlackAdapter({ appToken, botToken })

  function onNotification(notification) {
    // Sync reply handlers — adapter sets them before calling onNotification
    slackAdapter.replyHandlers.forEach((fn, id) => replyHandlers.set(id, fn))

    if (win && !win.isDestroyed()) {
      win.webContents.send('buddy:notification', notification)
    }
  }

  register({
    name: 'slack',
    start: (onNotif) => slackAdapter.start(onNotif),
    stop: () => slackAdapter.stop(),
  })

  await startAll(onNotification)
}

// ── App lifecycle ───────────────────────────────────────────────
app.whenReady().then(async () => {
  registerIPC()
  createWindow()
  await startIntegrations()
})

app.on('window-all-closed', () => app.quit())
