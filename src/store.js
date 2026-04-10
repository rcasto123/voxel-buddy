// src/store.js
import { create } from 'zustand'

// 'walk' is now a valid visual state — maps to .airie--walk CSS class with its
// own hop animation, avoiding the need for !important overrides.
const VALID_STATES = new Set(['idle', 'walk', 'alert', 'wave', 'sleep', 'thinking', 'happy'])
const MAX_NOTIFICATIONS = 50

export const useStore = create((set, get) => ({
  notifications: [],
  mascotState: 'idle',
  layoutMode: 'desktop-pet',
  isMuted: false,
  isFirstRun: false,

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

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  // Derived count — use useStore(s => s.notifications.length) in components
  // for reactive subscriptions, or getState().unreadCount() imperatively.
  unreadCount: () => get().notifications.length,
}))
