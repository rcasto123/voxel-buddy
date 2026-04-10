// src/__tests__/integrations.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the registry in isolation — import after we create it
let registry

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../../integrations/index.js')
  registry = mod
})

describe('integration registry', () => {
  it('starts with zero registered integrations', () => {
    expect(registry.getAll()).toHaveLength(0)
  })

  it('registers an integration', () => {
    const fake = { name: 'test', start: vi.fn(), stop: vi.fn() }
    registry.register(fake)
    expect(registry.getAll()).toHaveLength(1)
  })

  it('startAll calls start on every registered integration', async () => {
    const onNotification = vi.fn()
    const fake1 = { name: 'a', start: vi.fn(), stop: vi.fn() }
    const fake2 = { name: 'b', start: vi.fn(), stop: vi.fn() }
    registry.register(fake1)
    registry.register(fake2)
    await registry.startAll(onNotification)
    expect(fake1.start).toHaveBeenCalledWith(onNotification)
    expect(fake2.start).toHaveBeenCalledWith(onNotification)
  })
})

// Mock @slack/socket-mode before importing adapter
vi.mock('@slack/socket-mode', () => ({
  SocketModeClient: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
  })),
}))

describe('Slack adapter', () => {
  it('maps a DM event to unified notification format', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.js')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    // Simulate a DM event firing
    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results[0].value
    const messageHandler = instance.on.mock.calls.find(([event]) => event === 'message')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    await messageHandler({
      event: { channel_type: 'im', user: 'U123', text: 'Hello world', channel: 'D456' },
      ack: fakeAck,
    })

    expect(fakeAck).toHaveBeenCalled()
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      source: 'slack',
      type: 'dm',
      sender: { name: 'U123' },
      text: 'Hello world',
    })
    expect(typeof notifications[0].id).toBe('string')
    expect(typeof notifications[0].timestamp).toBe('number')
  })

  it('maps a mention event to unified notification format', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.js')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results[1].value
    const mentionHandler = instance.on.mock.calls.find(([event]) => event === 'app_mention')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    await mentionHandler({
      event: { user: 'U999', text: '<@UBOT> hey buddy', channel: 'C123' },
      ack: fakeAck,
    })

    expect(notifications[0]).toMatchObject({
      source: 'slack',
      type: 'mention',
      sender: { name: 'U999' },
    })
  })
})
