// src/__tests__/integrations.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
    users: {
      info: vi.fn().mockImplementation(({ user }) =>
        Promise.resolve({ user: { profile: { display_name: user }, real_name: user } })
      ),
    },
  })),
}))

describe('Slack adapter', () => {
  it('maps a DM event to unified notification format', async () => {
    // Updated path: slack.mjs (explicit ESM extension)
    const { createSlackAdapter } = await import('../../integrations/slack.mjs')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results.at(-1).value
    const messageHandler = instance.on.mock.calls.find(([event]) => event === 'message')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    await messageHandler({
      event: { channel_type: 'im', user: 'U123', text: 'Hello world', channel: 'D456', ts: '1234.5678' },
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

  it('ignores bot messages (echo loop prevention)', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.mjs')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    const instance = SocketModeClient.mock.results.at(-1).value
    const messageHandler = instance.on.mock.calls.find(([event]) => event === 'message')?.[1]

    const fakeAck = vi.fn().mockResolvedValue(undefined)
    // Simulate a bot_message (e.g. our own reply echoed back)
    await messageHandler({
      event: { channel_type: 'im', bot_id: 'B123', text: 'My own reply', channel: 'D456', ts: '1234.5' },
      ack: fakeAck,
    })

    expect(fakeAck).toHaveBeenCalled()
    expect(notifications).toHaveLength(0) // must be ignored
  })

  it('includes thread_ts in replies so they stay in-thread', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.mjs')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    const { WebClient } = await import('@slack/web-api')
    // Use the most-recently created instance (each test creates a fresh adapter)
    const instance = SocketModeClient.mock.results.at(-1).value
    const messageHandler = instance.on.mock.calls.find(([event]) => event === 'message')?.[1]

    await messageHandler({
      event: { channel_type: 'im', user: 'U123', text: 'hi', channel: 'D456', ts: '111.222' },
      ack: vi.fn().mockResolvedValue(undefined),
    })

    const replyFn = adapter.replyHandlers.get(notifications[0].id)
    await replyFn('pong')

    const postMessage = WebClient.mock.results.at(-1).value.chat.postMessage
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ thread_ts: '111.222' })
    )
  })

  it('maps a mention event to unified notification format', async () => {
    const { createSlackAdapter } = await import('../../integrations/slack.mjs')
    const adapter = createSlackAdapter({ appToken: 'xapp-test', botToken: 'xoxb-test' })

    const notifications = []
    await adapter.start((n) => notifications.push(n))

    const { SocketModeClient } = await import('@slack/socket-mode')
    // Use the most-recently created instance (each test creates a fresh adapter)
    const instance = SocketModeClient.mock.results.at(-1).value
    const mentionHandler = instance.on.mock.calls.find(([event]) => event === 'app_mention')?.[1]

    await mentionHandler({
      event: { user: 'U999', text: '<@UBOT> hey buddy', channel: 'C123', ts: '999.0' },
      ack: vi.fn().mockResolvedValue(undefined),
    })

    expect(notifications[0]).toMatchObject({
      source: 'slack',
      type: 'mention',
      sender: { name: 'U999' },
    })
  })
})
