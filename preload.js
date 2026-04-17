// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddy', {
  // ── Notifications ─────────────────────────────────────────────
  onNotification: (callback) => {
    const handler = (_event, notification) => callback(notification)
    ipcRenderer.on('buddy:notification', handler)
    return () => ipcRenderer.removeListener('buddy:notification', handler)
  },

  // Returns { ok: boolean, error?: string } so the UI can show send failures
  sendReply: (notificationId, text) =>
    ipcRenderer.invoke('buddy:send-reply', { notificationId, text }),

  dismissNotification: (notificationId) =>
    ipcRenderer.send('buddy:dismiss-notification', notificationId),

  // ── Mouse / click-through ──────────────────────────────────────
  // Legacy boolean API — still supported by main.js but prefer the refcount
  // variants below when multiple interactive regions (mascot + bubble +
  // context menu) can overlap.
  setMouseOverMascot: (isOver) =>
    ipcRenderer.send('buddy:mouse-over-mascot', !!isOver),
  // Refcount API — call with +1 on region enter, -1 on leave. Main clamps
  // the count to [0, 10] and flips click-through only on 0↔>0 crossings,
  // which stops `setIgnoreMouseEvents` thrash when regions touch.
  bumpMouseOverMascot: (delta) =>
    ipcRenderer.send('buddy:mouse-over-mascot', { delta }),
  // Force-reset the refcount to 0 — call on window blur / visibility change
  // to recover from a missed leave (e.g. browser devtools stealing focus).
  resetMouseOverMascot: () =>
    ipcRenderer.send('buddy:mouse-over-mascot', { reset: true }),

  // ── Settings ──────────────────────────────────────────────────
  // Tokens returned here are always decrypted — never stored encrypted in renderer
  getSettings: () => ipcRenderer.invoke('buddy:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('buddy:save-settings', settings),

  // ── Mute ──────────────────────────────────────────────────────
  setMuted: (muted) => ipcRenderer.invoke('buddy:set-muted', muted),
  onMuteChanged: (callback) => {
    const handler = (_event, muted) => callback(muted)
    ipcRenderer.on('buddy:mute-changed', handler)
    return () => ipcRenderer.removeListener('buddy:mute-changed', handler)
  },

  // ── Slack connection status ────────────────────────────────────
  // Fires with { status: 'connecting'|'connected'|'reconnecting'|'disconnected'|'error', error?: string }
  onSlackStatus: (callback) => {
    const handler = (_event, statusInfo) => callback(statusInfo)
    ipcRenderer.on('buddy:slack-status', handler)
    return () => ipcRenderer.removeListener('buddy:slack-status', handler)
  },

  // ── Settings window ───────────────────────────────────────────
  openSettingsWindow: () => ipcRenderer.send('buddy:open-settings-window'),
  restartIntegrations: () => ipcRenderer.invoke('buddy:restart-integrations'),

  // ── App lifecycle ─────────────────────────────────────────────
  quit: () => ipcRenderer.send('buddy:quit'),

  // ── Auto-start ────────────────────────────────────────────────
  setLoginItem: (enabled) => ipcRenderer.invoke('buddy:set-login-item', enabled),
  getLoginItem: () => ipcRenderer.invoke('buddy:get-login-item'),

  // ── External links ────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('buddy:open-external', url),

  // ── Gmail ─────────────────────────────────────────────────────
  gmailAuthStart: (clientId, clientSecret) =>
    ipcRenderer.invoke('buddy:gmail-auth-start', { clientId, clientSecret }),

  gmailDisconnect: () => ipcRenderer.invoke('buddy:gmail-disconnect'),

  gmailMarkRead: (messageId) => ipcRenderer.invoke('buddy:gmail-mark-read', messageId),

  // Fires with { status: 'connecting'|'connected'|'error', error?: string }
  onGmailStatus: (callback) => {
    const handler = (_event, statusInfo) => callback(statusInfo)
    ipcRenderer.on('buddy:gmail-status', handler)
    return () => ipcRenderer.removeListener('buddy:gmail-status', handler)
  },
})
