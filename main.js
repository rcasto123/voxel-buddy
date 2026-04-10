// main.js
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { register, startAll, stopAll, reset } = require('./integrations/index.js')

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

// ── Windows ────────────────────────────────────────────────────
let win = null
let settingsWin = null
let tray = null

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

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus()
    return
  }

  settingsWin = new BrowserWindow({
    width: 480,
    height: 620,
    title: 'Voxel Buddy — Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    settingsWin.loadURL('http://localhost:5173/#/settings')
  } else {
    settingsWin.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: '/settings' })
  }

  settingsWin.on('closed', () => { settingsWin = null })
}

// ── Tray ────────────────────────────────────────────────────────
function getTrayIconPath() {
  // In packaged builds, resources live outside the asar in resourcesPath
  const filename = process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png'
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', filename)
    : path.join(__dirname, 'assets', filename)
}

function rebuildTrayMenu() {
  const settings = loadSettings()
  const muted = settings.muted ?? false
  const autoStart = app.getLoginItemSettings().openAtLogin

  const menu = Menu.buildFromTemplate([
    {
      label: muted ? 'Unmute notifications' : 'Mute notifications',
      type: 'normal',
      click: () => {
        const s = loadSettings()
        s.muted = !s.muted
        saveSettings(s)
        win?.webContents.send('buddy:mute-changed', s.muted)
        rebuildTrayMenu()
      },
    },
    {
      label: autoStart ? 'Disable auto-start' : 'Enable auto-start',
      type: 'normal',
      click: () => {
        const next = !autoStart
        app.setLoginItemSettings({ openAtLogin: next, openAsHidden: true })
        const s = loadSettings()
        s.autoStart = next
        saveSettings(s)
        rebuildTrayMenu()
      },
    },
    { type: 'separator' },
    { label: 'Settings', click: openSettingsWindow },
    { type: 'separator' },
    { label: 'Quit Voxel Buddy', click: () => app.quit() },
  ])

  tray.setContextMenu(menu)
}

function createTray() {
  const iconPath = getTrayIconPath()
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('Voxel Buddy')
  rebuildTrayMenu()

  // On macOS left-click opens context menu; on Windows open settings
  if (process.platform !== 'darwin') {
    tray.on('click', openSettingsWindow)
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

  // Mute — renderer-driven (from Settings panel)
  ipcMain.handle('buddy:set-muted', (_event, muted) => {
    const s = loadSettings()
    s.muted = muted
    saveSettings(s)
    win?.webContents.send('buddy:mute-changed', muted)
    rebuildTrayMenu()
    return true
  })

  // Open settings window from renderer (onboarding card, etc.)
  ipcMain.on('buddy:open-settings-window', openSettingsWindow)

  // Restart integrations after token change
  ipcMain.handle('buddy:restart-integrations', async () => {
    await stopAll()
    reset()
    _cachedSettings = null // bust cache so new tokens are read
    await startIntegrations()
    return true
  })

  // Auto-start
  ipcMain.handle('buddy:set-login-item', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true })
    const s = loadSettings()
    s.autoStart = enabled
    saveSettings(s)
    rebuildTrayMenu()
    return true
  })

  ipcMain.handle('buddy:get-login-item', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  // Open external URLs safely (for onboarding links)
  ipcMain.handle('buddy:open-external', (_event, url) => {
    // Only allow http/https to prevent abuse
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
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
  // Hide from macOS dock — we live in the system tray only
  if (process.platform === 'darwin') app.dock.hide()

  registerIPC()
  createWindow()
  createTray()
  await startIntegrations()
})

// On macOS, keep the app alive when all windows are closed
// (the tray is the only UI surface)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Graceful shutdown — wait for integrations to disconnect before quitting
let _isQuitting = false
app.on('before-quit', async (e) => {
  if (_isQuitting) return
  e.preventDefault()
  _isQuitting = true
  try {
    await stopAll()
  } catch (err) {
    console.warn('[Quit] Integration shutdown error:', err.message)
  }
  app.quit()
})
