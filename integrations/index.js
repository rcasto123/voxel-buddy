// integrations/index.js

/**
 * Unified Notification shape (all integrations must produce this):
 * {
 *   id: string,           // uuid
 *   source: string,       // 'slack' | 'gmail'
 *   type: string,         // 'dm' | 'mention' | 'email'
 *   sender: {
 *     name: string,
 *     avatar: string | null,
 *   },
 *   text: string,
 *   timestamp: number,    // Unix ms
 * }
 *
 * replyFn is NOT in the notification — main process stores a Map<id, replyFn>
 */

const _integrations = []

function register(integration) {
  _integrations.push(integration)
}

function getAll() {
  return [..._integrations]
}

async function startAll(onNotification) {
  for (const integration of _integrations) {
    await integration.start(onNotification)
  }
}

async function stopAll() {
  for (const integration of _integrations) {
    if (integration.stop) await integration.stop()
  }
}

// Reset registered integrations — used in tests to prevent state leaking between
// test cases when the module is not fully reloaded via vi.resetModules().
function reset() {
  _integrations.length = 0
}

module.exports = { register, getAll, startAll, stopAll, reset }
