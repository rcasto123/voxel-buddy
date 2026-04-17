// main.js
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { autoUpdater } = require('electron-updater')
const { register, startAll, stopAll, reset } = require('./integrations/index.js')
const { startOAuthServer } = require('./integrations/oauth-server.js')

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
//
// Cache invariant: `_cachedSettings` is ALWAYS plaintext (tokens decrypted).
// Disk representation is encrypted-on-tokens. This removes the footgun where
// callers had to remember to bust the cache after a write, and prevents
// plaintext<->ciphertext confusion in callers like `loadSettings()` that
// previously returned cipher strings.
let _cachedSettings = null

function decryptAllTokens(s) {
  if (!s) return s
  const out = { ...s, integrations: { ...(s.integrations ?? {}) } }
  if (out.integrations.slack) {
    out.integrations.slack = {
      ...out.integrations.slack,
      appToken: decryptToken(out.integrations.slack.appToken),
      botToken: decryptToken(out.integrations.slack.botToken),
    }
  }
  if (out.integrations.gmail) {
    out.integrations.gmail = {
      ...out.integrations.gmail,
      accessToken:  decryptToken(out.integrations.gmail.accessToken),
      refreshToken: decryptToken(out.integrations.gmail.refreshToken),
      clientId:     decryptToken(out.integrations.gmail.clientId),
      clientSecret: decryptToken(out.integrations.gmail.clientSecret),
      email:        out.integrations.gmail.email ?? null,
    }
  }
  return out
}

function encryptAllTokens(s) {
  const out = { ...s, integrations: { ...(s.integrations ?? {}) } }
  if (out.integrations.slack) {
    out.integrations.slack = {
      ...out.integrations.slack,
      appToken: encryptToken(out.integrations.slack.appToken),
      botToken: encryptToken(out.integrations.slack.botToken),
    }
  }
  if (out.integrations.gmail) {
    out.integrations.gmail = {
      ...out.integrations.gmail,
      accessToken:  encryptToken(out.integrations.gmail.accessToken),
      refreshToken: encryptToken(out.integrations.gmail.refreshToken),
      clientId:     encryptToken(out.integrations.gmail.clientId),
      clientSecret: encryptToken(out.integrations.gmail.clientSecret),
      email:        out.integrations.gmail.email ?? null,
    }
  }
  return out
}

// Returns the plaintext settings object. Safe to mutate a shallow copy.
function loadSettings() {
  if (_cachedSettings) return _cachedSettings
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    if (fs.existsSync(SETTINGS_PATH)) {
      const onDisk = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
      _cachedSettings = decryptAllTokens(onDisk)
      return _cachedSettings
    }
  } catch (e) {
    console.warn('[Settings] Failed to load:', e.message)
  }
  _cachedSettings = { layout: 'desktop-pet', mascotName: 'Buddy' }
  return _cachedSettings
}

// Kept for API clarity — the renderer always gets decrypted tokens, same
// as what `loadSettings()` now returns internally.
function loadSettingsDecrypted() {
  return loadSettings()
}

function saveSettings(settings) {
  try {
    // Cache holds plaintext; disk holds encrypted tokens.
    _cachedSettings = settings
    const toWrite = encryptAllTokens(settings)
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toWrite, null, 2))
  } catch (e) {
    console.warn('[Settings] Failed to save:', e.message)
  }
}

// ── Reply handler map ───────────────────────────────────────────
const replyHandlers = new Map()

// ── Gmail adapter (module-level so IPC handlers can reach it) ───
let gmailAdapter = null

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

// Click-through refcount. The renderer has multiple interactive regions
// (mascot, bubble, context menu) and their hover boxes overlap and fire
// enter/leave in unpredictable order. Rather than a single boolean flag
// — which would thrash `setIgnoreMouseEvents` mid-drag when a 1-pixel gap
// between two regions causes leave-then-enter — we keep a refcount and
// only flip the window's mouse events when the count crosses 0.
//
// The renderer sends +1 on region enter and -1 on region leave. Extra
// safety: we clamp the count to [0, 10] to guard against bugs where
// a leave is missed (e.g. React unmount during hover).
let _mouseOverCount = 0
function applyMouseOver() {
  if (!win) return
  const over = _mouseOverCount > 0
  if (over) {
    win.setIgnoreMouseEvents(false)
    win.setFocusable(true)
  } else {
    win.setIgnoreMouseEvents(true, { forward: true })
    win.setFocusable(false)
  }
}

function registerIPC() {
  ipcMain.on('buddy:mouse-over-mascot', (_event, payload) => {
    // Back-compat: old renderers may still send boolean isOver.
    // New renderers send { delta: +1 | -1 } or { reset: true }.
    if (typeof payload === 'boolean') {
      // Legacy boolean path — treat as an absolute "over vs not" signal.
      // We don't know the other regions' state, so force the count to
      // match. This shouldn't be hit after the renderer upgrade but keeps
      // the wire compatible during hot-reload.
      _mouseOverCount = payload ? 1 : 0
    } else if (payload && typeof payload === 'object') {
      if (payload.reset) {
        _mouseOverCount = 0
      } else if (Number.isFinite(payload.delta)) {
        _mouseOverCount = Math.max(0, Math.min(10, _mouseOverCount + payload.delta))
      }
    }
    applyMouseOver()
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

  // Quit from context menu. Triggered by user action — safe to call app.quit().
  ipcMain.on('buddy:quit', () => app.quit())

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
    // Strict validation via URL parser — rejects userinfo, non-http(s) schemes,
    // javascript:, file:, and malformed input. `url.startsWith('https://')`
    // previously let `https://evil@attacker.com/...` through.
    if (typeof url !== 'string' || url.length > 2048) return { ok: false }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { ok: false }
      if (parsed.username || parsed.password) return { ok: false }
      shell.openExternal(parsed.toString())
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  // ── Gmail OAuth ─────────────────────────────────────────────────
  ipcMain.handle('buddy:gmail-auth-start', async (_event, { clientId, clientSecret }) => {
    try {
      if (!clientId || !clientSecret) {
        return { ok: false, error: 'Client ID and Client Secret are required.' }
      }

      const { google } = await import('googleapis')
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:42813/oauth/google/callback'
      )

      // CSRF protection: random state bound to this auth flow. The local
      // server below rejects any callback whose `state` doesn't match.
      const state = crypto.randomBytes(24).toString('base64url')

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // force refresh_token to always be returned
        state,
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
        ],
      })

      // Start the local server BEFORE opening the browser so we're ready
      const codePromise = startOAuthServer({ expectedState: state })
      shell.openExternal(authUrl)

      const code = await codePromise

      const { tokens } = await oauth2Client.getToken(code)
      const { access_token, refresh_token } = tokens

      if (!access_token || !refresh_token) {
        return { ok: false, error: 'Did not receive tokens from Google.' }
      }

      // Resolve the user's email address
      oauth2Client.setCredentials(tokens)
      let email = null
      try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        const profile = await gmail.users.getProfile({ userId: 'me' })
        email = profile.data.emailAddress ?? null
      } catch (e) {
        console.warn('[Gmail] Could not fetch profile email:', e.message)
      }

      // Persist tokens (encrypted)
      const s = loadSettings()
      s.integrations = {
        ...s.integrations,
        gmail: {
          accessToken:  access_token,
          refreshToken: refresh_token,
          clientId,
          clientSecret,
          email,
        },
      }
      saveSettings(s) // saveSettings now updates the plaintext cache itself

      // Start the Gmail adapter
      await startGmailAdapter({ accessToken: access_token, refreshToken: refresh_token, clientId, clientSecret })

      return { ok: true, email }
    } catch (e) {
      console.error('[Gmail] Auth failed:', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('buddy:gmail-disconnect', async () => {
    try {
      if (gmailAdapter) {
        await gmailAdapter.stop()
        gmailAdapter = null
      }
      const s = loadSettings()
      if (s.integrations?.gmail) {
        delete s.integrations.gmail
        saveSettings(s)
      }
      return { ok: true }
    } catch (e) {
      console.error('[Gmail] Disconnect failed:', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('buddy:gmail-mark-read', async (_event, messageId) => {
    try {
      if (!gmailAdapter) return { ok: false, error: 'Gmail not connected' }
      await gmailAdapter.markRead(messageId)
      return { ok: true }
    } catch (e) {
      console.error('[Gmail] Mark-read failed:', e.message)
      return { ok: false, error: e.message }
    }
  })
}

// ── Integrations ────────────────────────────────────────────────

function broadcastNotification(notification) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('buddy:notification', notification)
  }
}

function broadcastGmailStatus(statusInfo) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('buddy:gmail-status', statusInfo)
  }
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send('buddy:gmail-status', statusInfo)
  }
}

async function startGmailAdapter({ accessToken, refreshToken, clientId, clientSecret }) {
  if (gmailAdapter) {
    await gmailAdapter.stop()
    gmailAdapter = null
  }

  const { createGmailAdapter } = await import('./integrations/gmail.mjs')
  gmailAdapter = createGmailAdapter({ accessToken, refreshToken, clientId, clientSecret })

  await gmailAdapter.start(broadcastNotification, broadcastGmailStatus)
  return gmailAdapter
}

async function startIntegrations() {
  const settings = loadSettingsDecrypted() // use decrypted tokens

  // ── Slack ──────────────────────────────────────────────────────
  const slackSettings = settings.integrations?.slack ?? {}
  const appToken = slackSettings.appToken || process.env.SLACK_APP_TOKEN
  const botToken = slackSettings.botToken || process.env.SLACK_BOT_TOKEN

  const { createSlackAdapter } = await import('./integrations/slack.mjs')
  const slackAdapter = createSlackAdapter({ appToken, botToken })

  function onNotification(notification) {
    slackAdapter.replyHandlers.forEach((fn, id) => replyHandlers.set(id, fn))
    broadcastNotification(notification)
  }

  function onSlackStatus(statusInfo) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('buddy:slack-status', statusInfo)
    }
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send('buddy:slack-status', statusInfo)
    }
  }

  register({
    name: 'slack',
    start: (onNotif) => slackAdapter.start(onNotif, onSlackStatus),
    stop: () => slackAdapter.stop(),
  })

  // ── Gmail ──────────────────────────────────────────────────────
  const gmailSettings = settings.integrations?.gmail ?? {}
  if (gmailSettings.accessToken && gmailSettings.refreshToken && gmailSettings.clientId && gmailSettings.clientSecret) {
    try {
      await startGmailAdapter({
        accessToken:  gmailSettings.accessToken,
        refreshToken: gmailSettings.refreshToken,
        clientId:     gmailSettings.clientId,
        clientSecret: gmailSettings.clientSecret,
      })
    } catch (e) {
      console.error('[Gmail] Failed to start on boot:', e.message)
    }
  }

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
