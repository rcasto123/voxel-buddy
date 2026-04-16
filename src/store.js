// src/store.js
import { create } from 'zustand'

const VALID_STATES = new Set(['idle', 'walk', 'alert', 'wave', 'sleep', 'thinking', 'happy'])
const MAX_NOTIFICATIONS = 50

export const useStore = create((set, get) => ({
  notifications: [],
  mascotState: 'idle',
  layoutMode: 'desktop-pet',
  isMuted: false,
  isFirstRun: false,

  // 'unknown' before first status event; one of:
  // 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
  slackStatus: 'unknown',
  slackError: null,

  gmailStatus: 'unknown',
  gmailError: null,

  settings: {
    mascotName: 'Buddy',
    layout: 'desktop-pet',
    mascotCharacter: 'airie',  // 'buddy' | 'airie'
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

  setMuted: (muted) => set({ isMuted: muted }),

  setFirstRun: (v) => set({ isFirstRun: v }),

  setSlackStatus: ({ status, error = null }) => set({ slackStatus: status, slackError: error }),

  setGmailStatus: ({ status, error = null }) => set({ gmailStatus: status, gmailError: error }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  unreadCount: () => get().notifications.length,
}))
