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
