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
        const notification = {
          id,
          source: 'slack',
          type: 'dm',
          sender: { name: event.user || 'unknown', avatar: null },
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

        const id = uuidv4()
        const notification = {
          id,
          source: 'slack',
          type: 'mention',
          sender: { name: event.user || 'unknown', avatar: null },
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
      if (client) await client.disconnect()
    },
  }
}

export { createSlackAdapter }
