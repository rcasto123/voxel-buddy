// src/services/aiSuggest.js

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-3-5-20241022'
const SYSTEM_PROMPT =
  'You are Airie, a laid-back, friendly desktop companion. ' +
  'Generate 3 short reply options (under 15 words each) for responding to this message. ' +
  'Be casual and human, not corporate. ' +
  'Return ONLY a JSON array of 3 strings, no other text.'

/**
 * Generate 3 AI reply suggestions for a notification.
 * @param {{ text: string, sender: { name: string } }} notification
 * @param {string} apiKey  Anthropic API key (sk-ant-...)
 * @returns {Promise<string[]>}  Array of 3 suggestion strings, or [] on failure
 */
export async function suggestReplies(notification, apiKey) {
  if (!apiKey || !notification?.text) return []

  try {
    const userContent = `Message from ${notification.sender?.name ?? 'someone'}: "${notification.text}"`

    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!res.ok) return []

    const data = await res.json()
    const raw = data?.content?.[0]?.text ?? ''
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map(String)
    }
    return []
  } catch {
    return []
  }
}
