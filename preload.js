// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddy', {
  // ── Notifications ─────────────────────────────────────────────
  // Returns a cleanup function — call it in useEffect cleanup to avoid listener leaks.
  onNotification: (callback) => {
    const handler = (_event, notification) => callback(notification)
    ipcRenderer.on('buddy:notification', handler)
    return () => ipcRenderer.removeListener('buddy:notification', handler)
  },

  sendReply: (notificationId, text) =>
    ipcRenderer.invoke('buddy:send-reply', { notificationId, text }),

  dismissNotification: (notificationId) =>
    ipcRenderer.send('buddy:dismiss-notification', notificationId),

  // ── Mouse / click-through ──────────────────────────────────────
  setMouseOverMascot: (isOver) =>
    ipcRenderer.send('buddy:mouse-over-mascot', isOver),

  // ── Settings ──────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('buddy:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('buddy:save-settings', settings),

  // ── Mute ──────────────────────────────────────────────────────
  setMuted: (muted) => ipcRenderer.invoke('buddy:set-muted', muted),
  // Listen for tray-driven mute changes. Returns cleanup fn.
  onMuteChanged: (callback) => {
    const handler = (_event, muted) => callback(muted)
    ipcRenderer.on('buddy:mute-changed', handler)
    return () => ipcRenderer.removeListener('buddy:mute-changed', handler)
  },

  // ── Settings window ───────────────────────────────────────────
  openSettingsWindow: () => ipcRenderer.send('buddy:open-settings-window'),
  restartIntegrations: () => ipcRenderer.invoke('buddy:restart-integrations'),

  // ── Auto-start ────────────────────────────────────────────────
  setLoginItem: (enabled) => ipcRenderer.invoke('buddy:set-login-item', enabled),
  getLoginItem: () => ipcRenderer.invoke('buddy:get-login-item'),

  // ── External links ────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('buddy:open-external', url),
})
