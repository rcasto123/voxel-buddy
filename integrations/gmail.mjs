// integrations/gmail.mjs  (ESM — safe to dynamic import() from CJS main.js)
import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'

const POLL_INTERVAL_MS = 60_000 // 60 seconds
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
]

/**
 * createGmailAdapter({ accessToken, refreshToken, clientId, clientSecret })
 * Returns an integration object matching the registry interface.
 *
 * Polls Gmail for unread INBOX messages every 60 seconds and converts each
 * to the unified notification shape. Deduplicates by message ID so the same
 * email never fires twice in the same session.
 *
 * Extra method exposed on the adapter:
 *   markRead(gmailMessageId) — removes the UNREAD label from a message
 */
function createGmailAdapter({ accessToken, refreshToken, clientId, clientSecret }) {
  let _stopped = false
  let _pollTimer = null
  let _onStatus = null
  let _onNotification = null
  let _gmail = null
  let _auth = null

  // Track message IDs we've already emitted so we don't re-fire on next poll
  const _seen = new Set()

  // For the caller to retrieve the authenticated user's email address (set after first poll)
  let _emailAddress = null

  function emitStatus(status, error) {
    _onStatus?.({ status, ...(error ? { error } : {}) })
  }

  function buildAuth() {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      scope: GMAIL_SCOPES.join(' '),
    })
    return oauth2
  }

  async function fetchUnreadMessages() {
    // list unread messages in INBOX
    const res = await _gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 20,
    })

    const messages = res.data.messages ?? []
    return messages
  }

  async function fetchMessageDetails(messageId) {
    const res = await _gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    })
    return res.data
  }

  function parseFrom(fromHeader) {
    if (!fromHeader) return { name: 'Unknown', email: '' }
    // "Display Name <email@example.com>" or just "email@example.com"
    const match = fromHeader.match(/^"?([^"<]+?)"?\s*(?:<([^>]+)>)?$/)
    if (match) {
      return {
        name: (match[1] || match[2] || fromHeader).trim(),
        email: (match[2] || match[1] || '').trim(),
      }
    }
    return { name: fromHeader, email: fromHeader }
  }

  function getHeader(msg, name) {
    return msg.payload?.headers?.find((h) => h.name === name)?.value ?? ''
  }

  function messageToNotification(msg) {
    const from = parseFrom(getHeader(msg, 'From'))
    const subject = getHeader(msg, 'Subject') || '(no subject)'
    const dateStr = getHeader(msg, 'Date')
    const timestamp = dateStr ? new Date(dateStr).getTime() : Date.now()

    return {
      id: uuidv4(),
      source: 'gmail',
      type: 'email',
      sender: { name: from.name, avatar: null },
      text: subject,
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      gmailMessageId: msg.id,
    }
  }

  async function resolveEmailAddress() {
    try {
      const res = await _gmail.users.getProfile({ userId: 'me' })
      _emailAddress = res.data.emailAddress ?? null
    } catch (e) {
      console.warn('[Gmail] Could not resolve email address:', e.message)
    }
  }

  async function poll() {
    if (_stopped) return

    try {
      const messages = await fetchUnreadMessages()

      for (const { id } of messages) {
        if (_seen.has(id)) continue
        _seen.add(id)

        try {
          const details = await fetchMessageDetails(id)
          const notification = messageToNotification(details)
          _onNotification?.(notification)
        } catch (e) {
          console.warn('[Gmail] Failed to fetch message details for', id, '—', e.message)
        }
      }

      // Lazy-resolve email address once after first successful poll
      if (_emailAddress === null) {
        await resolveEmailAddress()
      }
    } catch (e) {
      console.error('[Gmail] Poll error:', e.message)
      emitStatus('error', e.message)
    }
  }

  function schedulePoll() {
    _pollTimer = setInterval(async () => {
      await poll()
    }, POLL_INTERVAL_MS)
  }

  return {
    name: 'gmail',

    /** Resolved after first poll. Useful for showing the email address in UI. */
    get emailAddress() {
      return _emailAddress
    },

    async start(_onNotif, onStatus) {
      _onNotification = _onNotif
      _onStatus = onStatus

      if (!accessToken || !refreshToken || !clientId || !clientSecret) {
        console.warn('[Gmail] Missing credentials — integration disabled.')
        emitStatus('error', 'Missing credentials. Open Settings to connect Gmail.')
        return
      }

      _stopped = false

      try {
        _auth = buildAuth()
        _gmail = google.gmail({ version: 'v1', auth: _auth })

        emitStatus('connecting')
        // Do an immediate poll to populate quickly, then schedule recurring
        await poll()
        emitStatus('connected')
        schedulePoll()
        console.log('[Gmail] Polling started.')
      } catch (e) {
        console.error('[Gmail] Failed to start:', e.message)
        emitStatus('error', e.message)
      }
    },

    async stop() {
      _stopped = true
      if (_pollTimer) {
        clearInterval(_pollTimer)
        _pollTimer = null
      }
      _seen.clear()
      _emailAddress = null
      console.log('[Gmail] Stopped.')
    },

    /**
     * Mark a Gmail message as read by removing the UNREAD label.
     * Called when the user dismisses a Gmail notification.
     */
    async markRead(gmailMessageId) {
      if (!_gmail || !gmailMessageId) return
      try {
        await _gmail.users.messages.modify({
          userId: 'me',
          id: gmailMessageId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        })
        console.log('[Gmail] Marked as read:', gmailMessageId)
      } catch (e) {
        console.warn('[Gmail] Failed to mark as read:', gmailMessageId, '—', e.message)
      }
    },
  }
}

export { createGmailAdapter }
