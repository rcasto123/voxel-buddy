// main.js
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { autoUpdater } = require('electron-updater')
const { register, startAll, stopAll, reset } = require('./integrations/index.js')

const isDev = process.env.NODE_ENV === 'development'
const SETTINGS_PATH = path.join(os.homedir(), '.voxelbuddy', 'settings.json')
const ENC_PREFIX = 'enc:'

// ── Token encryption (electron.safeStorage → OS keychain) ──────
// Tokens are stored encrypted in settings.json. On platforms where
// safeStorage is unavailable the raw value is stored with a warning.

function encryptToken(value) {
  if (!value) return value
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
    }
  } catch (e) {
    console.warn('[SafeStorage] Encryption unavailable:', e.message)
  }
  return value
}

function decryptToken(value) {
  if (!value) return value
  try {
    if (typeof value === 'string' && value.startsWith(ENC_PREFIX)) {
      const buf = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
      return safeStorage.decryptString(buf)
    }
  } catch (e) {
    console.warn('[SafeStorage] Decryption failed — returning raw value:', e.message)
  }
  return value // migration path: plaintext tokens from before encryption was added
}

// ── Settings helpers ────────────────────────────────────────────
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

// Returns settings with tokens decrypted for consumption by the renderer
function loadSettingsDecrypted() {
  const s = loadSettings()
  if (!s.integrations?.slack) return s
  return {
    ...s,
    integrations: {
      ...s.integrations,
      slack: {
        appToken: decryptToken(s.integrations.slack.appToken),
        botToken: decryptToken(s.integrations.slack.botToken),
      },
    },
  }
}

function saveSettings(settings) {
  try {
    // Encrypt tokens before writing to disk
    const toWrite = { ...settings }
    if (toWrite.integrations?.slack) {
      toWrite.integrations = {
        ...toWrite.integrations,
        slack: {
          appToken: encryptToken(toWrite.integrations.slack.appToken),
          botToken: encryptToken(toWrite.integrations.slack.botToken),
        },
      }
    }
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toWrite, null, 2))
    _cachedSettings = toWrite
  } catch (e) {
    console.warn('[Settings] Failed to save:', e.message)
  }
}

// ── Reply handler map ───────────────────────────────────────────
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

  // Multi-monitor: resize overlay to follow the primary display whenever
  // the display configuration changes (plug/unplug, resolution change, etc.)
  screen.on('display-added', updateWindowBounds)
  screen.on('display-removed', updateWindowBounds)
  screen.on('display-metrics-changed', updateWindowBounds)
}

function updateWindowBounds() {
  if (!win || win.isDestroyed()) return
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds
  win.setBounds({ x, y, width, height })
  console.log('[Screen] Display changed — overlay resized to', { x, y, width, height })
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

  if (process.platform !== 'darwin') {
    tray.on('click', openSettingsWindow)
  }
}

// ── IPC handlers ────────────────────────────────────────────────
function registerIPC() {
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

  // Send reply — return { ok: true } or { ok: false, error } so renderer can show feedback
  ipcMain.handle('buddy:send-reply', async (_event, { notificationId, text }) => {
    const fn = replyHandlers.get(notificationId)
    if (!fn) {
      console.warn('[IPC] No reply handler for', notificationId)
      return { ok: false, error: 'No handler found' }
    }
    try {
      await fn(text)
      console.log('[IPC] Reply sent for', notificationId)
      return { ok: true }
    } catch (e) {
      console.error('[IPC] Reply failed:', e.message)
      return { ok: false, error: e.message }
    } finally {
      replyHandlers.delete(notificationId)
    }
  })

  ipcMain.on('buddy:dismiss-notification', (_event, notificationId) => {
    replyHandlers.delete(notificationId)
  })

  // Settings — always return decrypted values to the renderer
  ipcMain.handle('buddy:get-settings', () => loadSettingsDecrypted())
  ipcMain.handle('buddy:save-settings', (_event, settings) => {
    saveSettings(settings) // encrypts tokens before writing
    return true
  })

  ipcMain.handle('buddy:set-muted', (_event, muted) => {
    const s = loadSettings()
    s.muted = muted
    saveSettings(s)
    win?.webContents.send('buddy:mute-changed', muted)
    rebuildTrayMenu()
    return true
  })

  ipcMain.on('buddy:open-settings-window', openSettingsWindow)

  ipcMain.handle('buddy:restart-integrations', async () => {
    await stopAll()
    reset()
    _cachedSettings = null
    await startIntegrations()
    return true
  })

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

  ipcMain.handle('buddy:open-external', (_event, url) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })
}

// ── Integrations ────────────────────────────────────────────────
async function startIntegrations() {
  const settings = loadSettingsDecrypted() // use decrypted tokens
  const slackSettings = settings.integrations?.slack ?? {}
  const appToken = slackSettings.appToken || process.env.SLACK_APP_TOKEN
  const botToken = slackSettings.botToken || process.env.SLACK_BOT_TOKEN

  const { createSlackAdapter } = await import('./integrations/slack.mjs')
  const slackAdapter = createSlackAdapter({ appToken, botToken })

  function onNotification(notification) {
    slackAdapter.replyHandlers.forEach((fn, id) => replyHandlers.set(id, fn))
    if (win && !win.isDestroyed()) {
      win.webContents.send('buddy:notification', notification)
    }
  }

  function onStatus(statusInfo) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('buddy:slack-status', statusInfo)
    }
    // Also forward to settings window if open
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send('buddy:slack-status', statusInfo)
    }
  }

  register({
    name: 'slack',
    start: (onNotif) => slackAdapter.start(onNotif, onStatus),
    stop: () => slackAdapter.stop(),
  })

  await startAll(onNotification)
}

// ── Auto-updater ────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return // skip in development

  autoUpdater.logger = console
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    console.log('[Updater] Update available — downloading…')
  })

  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] Update downloaded — will install on quit')
  })

  autoUpdater.on('error', (err) => {
    console.warn('[Updater] Error:', err.message)
  })
}

// ── App lifecycle ───────────────────────────────────────────────
app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock.hide()
  registerIPC()
  createWindow()
  createTray()
  await startIntegrations()
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

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
