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
