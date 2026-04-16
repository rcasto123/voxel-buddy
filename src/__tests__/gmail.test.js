// src/__tests__/gmail.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock googleapis before any adapter import ──────────────────────────────
const mockModify = vi.fn().mockResolvedValue({})
const mockGetProfile = vi.fn().mockResolvedValue({ data: { emailAddress: 'test@example.com' } })
const mockMessagesList = vi.fn()
const mockMessagesGet = vi.fn()

vi.mock('googleapis', () => {
  const oauth2Instance = {
    setCredentials: vi.fn(),
    generateAuthUrl: vi.fn(() => 'https://accounts.google.com/oauth'),
    getToken: vi.fn().mockResolvedValue({ tokens: { access_token: 'new-at', refresh_token: 'rt' } }),
    on: vi.fn(),
  }

  const OAuth2 = vi.fn(() => oauth2Instance)

  const gmailInstance = {
    users: {
      messages: {
        list: mockMessagesList,
        get: mockMessagesGet,
        modify: mockModify,
      },
      getProfile: mockGetProfile,
    },
  }

  return {
    google: {
      auth: { OAuth2 },
      gmail: vi.fn(() => gmailInstance),
    },
  }
})

vi.mock('uuid', () => ({ v4: () => 'test-uuid-' + Math.random().toString(36).slice(2) }))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMessage(id, from = 'Alice <alice@example.com>', subject = 'Hello') {
  return {
    id,
    payload: {
      headers: [
        { name: 'From', value: from },
        { name: 'Subject', value: subject },
        { name: 'Date', value: 'Wed, 01 Jan 2025 10:00:00 +0000' },
      ],
    },
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Gmail adapter', () => {
  let adapter

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default: return two messages
    mockMessagesList.mockResolvedValue({ data: { messages: [{ id: 'msg1' }, { id: 'msg2' }] } })
    mockMessagesGet.mockImplementation(({ id }) => Promise.resolve({ data: makeMessage(id) }))

    const { createGmailAdapter } = await import('../../integrations/gmail.mjs')
    adapter = createGmailAdapter({
      accessToken: 'test-at',
      refreshToken: 'test-rt',
      clientId: 'test-cid',
      clientSecret: 'test-cs',
    })
  })

  afterEach(async () => {
    await adapter?.stop()
    vi.useRealTimers()
  })

  it('creates notifications with the correct unified shape', async () => {
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())

    expect(notifications).toHaveLength(2)

    const n = notifications[0]
    expect(n).toMatchObject({
      source: 'gmail',
      type: 'email',
      sender: { name: 'Alice', avatar: null },
      text: 'Hello',
    })
    expect(typeof n.id).toBe('string')
    expect(typeof n.timestamp).toBe('number')
    expect(typeof n.gmailMessageId).toBe('string')
  })

  it('does not fire duplicate notifications for the same message ID', async () => {
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())

    // First poll already ran in start() — 2 notifications
    expect(notifications).toHaveLength(2)

    // Advance timer to trigger a second poll — same message IDs returned
    await vi.advanceTimersByTimeAsync(60_000)

    // Should still be 2 — deduplication prevents re-firing
    expect(notifications).toHaveLength(2)
  })

  it('picks up a new message on the second poll', async () => {
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())
    expect(notifications).toHaveLength(2)

    // Second poll returns the original two plus a brand-new one
    mockMessagesList.mockResolvedValueOnce({
      data: { messages: [{ id: 'msg1' }, { id: 'msg2' }, { id: 'msg3' }] },
    })
    mockMessagesGet.mockImplementation(({ id }) =>
      Promise.resolve({ data: makeMessage(id, 'Bob <bob@example.com>', 'New message') })
    )

    await vi.advanceTimersByTimeAsync(60_000)

    expect(notifications).toHaveLength(3)
    expect(notifications[2].gmailMessageId).toBe('msg3')
  })

  it('stores gmailMessageId on the notification (needed for mark-as-read)', async () => {
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())

    expect(notifications[0].gmailMessageId).toBe('msg1')
    expect(notifications[1].gmailMessageId).toBe('msg2')
  })

  it('markRead calls Gmail API to remove the UNREAD label', async () => {
    await adapter.start(vi.fn(), vi.fn())
    await adapter.markRead('msg1')

    expect(mockModify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg1',
      requestBody: { removeLabelIds: ['UNREAD'] },
    })
  })

  it('emits an error status when missing credentials', async () => {
    const { createGmailAdapter } = await import('../../integrations/gmail.mjs')
    const noCredAdapter = createGmailAdapter({
      accessToken: '',
      refreshToken: '',
      clientId: '',
      clientSecret: '',
    })

    const statusEvents = []
    await noCredAdapter.start(vi.fn(), (s) => statusEvents.push(s))

    expect(statusEvents.some((e) => e.status === 'error')).toBe(true)
  })

  it('handles empty inbox without crashing', async () => {
    mockMessagesList.mockResolvedValue({ data: { messages: [] } })
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())
    expect(notifications).toHaveLength(0)
  })

  it('handles missing messages array in API response', async () => {
    mockMessagesList.mockResolvedValue({ data: {} })
    const notifications = []
    await adapter.start((n) => notifications.push(n), vi.fn())
    expect(notifications).toHaveLength(0)
  })

  it('auto-resolves email address after first poll', async () => {
    mockGetProfile.mockResolvedValue({ data: { emailAddress: 'me@gmail.com' } })
    await adapter.start(vi.fn(), vi.fn())
    expect(adapter.emailAddress).toBe('me@gmail.com')
  })
})
