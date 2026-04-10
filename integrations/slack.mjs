// integrations/slack.mjs  (explicit .mjs = ESM — safe to dynamic import() from CJS main.js)
import { SocketModeClient } from '@slack/socket-mode'
import { WebClient } from '@slack/web-api'
import { v4 as uuidv4 } from 'uuid'

const MAX_RECONNECT_DELAY_MS = 30_000 // cap backoff at 30 s

/**
 * createSlackAdapter({ appToken, botToken })
 * Returns an integration object matching the registry interface.
 *
 * start(onNotification, onStatus) — onStatus({ status, error? }) fires on every
 * connection state change so the UI can show a live indicator.
 */
function createSlackAdapter({ appToken, botToken }) {
  let client = null
  let webClient = null
  let _stopped = false
  let _reconnectAttempts = 0
  let _onStatus = null

  // Map<notificationId, replyFn> — synced to main process replyHandlers
  const replyHandlers = new Map()

  // Cache of userId → display name to avoid repeated users.info calls
  const _userCache = new Map()

  async function resolveDisplayName(userId) {
    if (!userId) return 'unknown'
    if (_userCache.has(userId)) return _userCache.get(userId)
    try {
      const res = await webClient.users.info({ user: userId })
      const name = res.user?.profile?.display_name || res.user?.real_name || userId
      _userCache.set(userId, name)
      return name
    } catch (e) {
      console.warn('[Slack] users.info failed for', userId, '—', e.message)
      return userId
    }
  }

  function emitStatus(status, error) {
    _onStatus?.({ status, ...(error ? { error } : {}) })
  }

  async function connectClient() {
    client = new SocketModeClient({ appToken })

    client.on('connecting',    () => { console.log('[Slack] Connecting…');    emitStatus('connecting') })
    client.on('connected',     () => { console.log('[Slack] Connected.');     _reconnectAttempts = 0; emitStatus('connected') })
    client.on('reconnecting',  () => { console.log('[Slack] Reconnecting…'); emitStatus('reconnecting') })

    client.on('disconnected', async () => {
      console.log('[Slack] Disconnected.')
      if (_stopped) return
      emitStatus('disconnected')

      // Exponential backoff — doubles each attempt, capped at 30 s
      const delay = Math.min(1000 * 2 ** _reconnectAttempts, MAX_RECONNECT_DELAY_MS)
      _reconnectAttempts++
      console.log(`[Slack] Will retry in ${delay}ms (attempt ${_reconnectAttempts})…`)
      emitStatus('reconnecting')

      await new Promise((r) => setTimeout(r, delay))
      if (_stopped) return

      try {
        await client.start()
      } catch (e) {
        console.error('[Slack] Reconnect failed:', e.message)
        emitStatus('error', e.message)
      }
    })

    // ── Message events ────────────────────────────────────────────

    client.on('message', async ({ event, ack }) => {
      await ack()

      // Ignore bot messages (including our own replies) — prevents echo loops
      if (!event || event.bot_id || event.subtype === 'bot_message') return
      if (event.channel_type !== 'im') return

      const id = uuidv4()
      const displayName = await resolveDisplayName(event.user)
      const notification = {
        id,
        source: 'slack',
        type: 'dm',
        sender: { name: displayName, avatar: null },
        text: (event.text || '').substring(0, 200),
        timestamp: Date.now(),
      }

      // Use thread_ts so replies stay in the same thread
      const threadTs = event.thread_ts || event.ts
      replyHandlers.set(id, async (replyText) => {
        await webClient.chat.postMessage({
          channel: event.channel,
          text: replyText,
          thread_ts: threadTs,
        })
      })

      onNotification(notification)
    })

    client.on('app_mention', async ({ event, ack }) => {
      await ack()
      if (!event || event.bot_id || event.subtype === 'bot_message') return

      const id = uuidv4()
      const displayName = await resolveDisplayName(event.user)
      const notification = {
        id,
        source: 'slack',
        type: 'mention',
        sender: { name: displayName, avatar: null },
        text: (event.text || '').substring(0, 200),
        timestamp: Date.now(),
      }

      const threadTs = event.thread_ts || event.ts
      replyHandlers.set(id, async (replyText) => {
        await webClient.chat.postMessage({
          channel: event.channel,
          text: replyText,
          thread_ts: threadTs,
        })
      })

      onNotification(notification)
    })

    return client
  }

  // onNotification captured in closure so reconnectClient can reuse it
  let onNotification = null

  return {
    name: 'slack',
    replyHandlers,

    async start(_onNotification, onStatus) {
      onNotification = _onNotification
      _onStatus = onStatus

      if (!appToken || !botToken) {
        console.warn('[Slack] Missing tokens — integration disabled.')
        emitStatus('error', 'Missing tokens. Open Settings to add them.')
        return
      }

      _stopped = false
      webClient = new WebClient(botToken)

      try {
        await connectClient()
        await client.start()
        console.log('[Slack] Socket Mode started.')
      } catch (e) {
        console.error('[Slack] Failed to start:', e.message)
        emitStatus('error', e.message)
      }
    },

    async stop() {
      _stopped = true
      replyHandlers.clear()
      _userCache.clear()
      if (client) {
        try {
          await client.disconnect()
        } catch (e) {
          console.warn('[Slack] Error on disconnect:', e.message)
        }
      }
    },
  }
}

export { createSlackAdapter }
