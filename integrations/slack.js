// integrations/slack.js
// Note: Uses ESM import syntax so vitest mocks work in tests.
// Vite/vitest transforms this for the test environment; in production Electron,
// this file is bundled by the build process.
import { SocketModeClient } from '@slack/socket-mode'
import { WebClient } from '@slack/web-api'
import { v4 as uuidv4 } from 'uuid'

/**
 * createSlackAdapter({ appToken, botToken })
 * Returns an integration object matching the registry interface.
 */
function createSlackAdapter({ appToken, botToken }) {
  let client = null
  let webClient = null

  // Map<notificationId, replyFn> — synced to main process replyHandlers
  const replyHandlers = new Map()

  // Cache of userId → display name to avoid repeated users.info calls
  const _userCache = new Map()

  async function resolveDisplayName(userId) {
    if (!userId) return 'unknown'
    if (_userCache.has(userId)) return _userCache.get(userId)
    try {
      const res = await webClient.users.info({ user: userId })
      // Prefer display_name (custom name), fall back to real_name, then raw userId
      const name = res.user?.profile?.display_name || res.user?.real_name || userId
      _userCache.set(userId, name)
      return name
    } catch (e) {
      console.warn('[Slack] users.info failed for', userId, '—', e.message)
      // Degrade gracefully: show the raw ID rather than crashing
      return userId
    }
  }

  return {
    name: 'slack',
    replyHandlers,

    async start(onNotification) {
      if (!appToken || !botToken) {
        console.warn('[Slack] Missing tokens — integration disabled.')
        return
      }

      webClient = new WebClient(botToken)
      client = new SocketModeClient({ appToken })

      client.on('message', async ({ event, ack }) => {
        await ack()
        if (!event || event.channel_type !== 'im') return

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

        replyHandlers.set(id, async (replyText) => {
          await webClient.chat.postMessage({ channel: event.channel, text: replyText })
        })

        onNotification(notification)
      })

      client.on('app_mention', async ({ event, ack }) => {
        await ack()
        if (!event) return

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

        replyHandlers.set(id, async (replyText) => {
          await webClient.chat.postMessage({ channel: event.channel, text: replyText })
        })

        onNotification(notification)
      })

      client.on('connecting', () => console.log('[Slack] Connecting...'))
      client.on('connected', () => console.log('[Slack] Connected.'))
      client.on('reconnecting', () => console.log('[Slack] Reconnecting...'))
      client.on('disconnected', () => console.log('[Slack] Disconnected.'))

      await client.start()
      console.log('[Slack] Socket Mode started.')
    },

    async stop() {
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
