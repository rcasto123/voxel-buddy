// src/__tests__/store.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from '../store.js'

// Helper: get fresh store state
function getStore() {
  return useStore.getState()
}

// Reset store between tests
beforeEach(() => {
  useStore.setState({
    notifications: [],
    mascotState: 'idle',
    layoutMode: 'desktop-pet',
  })
})

describe('addNotification', () => {
  it('adds a notification to the list', () => {
    const n = { id: '1', source: 'slack', type: 'dm', sender: { name: 'Alice', avatar: null }, text: 'Hey!', timestamp: 1000 }
    act(() => getStore().addNotification(n))
    expect(getStore().notifications).toHaveLength(1)
    expect(getStore().notifications[0].text).toBe('Hey!')
  })

  it('prepends new notifications (newest first)', () => {
    const n1 = { id: '1', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'first', timestamp: 1000 }
    const n2 = { id: '2', source: 'slack', type: 'dm', sender: { name: 'B', avatar: null }, text: 'second', timestamp: 2000 }
    act(() => {
      getStore().addNotification(n1)
      getStore().addNotification(n2)
    })
    expect(getStore().notifications[0].text).toBe('second')
  })

  it('caps the list at 50 notifications', () => {
    act(() => {
      for (let i = 0; i < 55; i++) {
        getStore().addNotification({ id: String(i), source: 'slack', type: 'dm', sender: { name: 'X', avatar: null }, text: String(i), timestamp: i })
      }
    })
    expect(getStore().notifications).toHaveLength(50)
  })
})

describe('clearNotification', () => {
  it('removes a notification by id', () => {
    const n = { id: 'abc', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'hi', timestamp: 1 }
    act(() => {
      getStore().addNotification(n)
      getStore().clearNotification('abc')
    })
    expect(getStore().notifications).toHaveLength(0)
  })
})

describe('setMascotState', () => {
  it('updates mascot state', () => {
    act(() => getStore().setMascotState('alert'))
    expect(getStore().mascotState).toBe('alert')
  })

  it('rejects unknown states', () => {
    act(() => getStore().setMascotState('dancing'))
    expect(getStore().mascotState).toBe('idle') // unchanged
  })
})

describe('settings', () => {
  it('default mascotCharacter is buddy', () => {
    const { getState } = useStore
    expect(getState().settings.mascotCharacter).toBe('buddy')
  })
})

describe('unreadCount', () => {
  it('counts all notifications as unread', () => {
    act(() => {
      getStore().addNotification({ id: '1', source: 'slack', type: 'dm', sender: { name: 'A', avatar: null }, text: 'a', timestamp: 1 })
      getStore().addNotification({ id: '2', source: 'slack', type: 'dm', sender: { name: 'B', avatar: null }, text: 'b', timestamp: 2 })
    })
    expect(getStore().unreadCount()).toBe(2)
  })
})
