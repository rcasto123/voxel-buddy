// integrations/oauth-server.js (CJS — required from main.js)
// Tiny local HTTP server that captures the OAuth callback from Google.

const http = require('http')

const PORT = 42813
const CALLBACK_PATH = '/oauth/google/callback'
const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * startOAuthServer()
 *
 * Returns a Promise that resolves with the authorization code Google sends
 * to http://localhost:42813/oauth/google/callback?code=...
 *
 * The server closes itself as soon as it receives the code, or after the
 * 5-minute timeout (in which case the promise rejects).
 */
function startOAuthServer() {
  return new Promise((resolve, reject) => {
    let timeoutHandle = null

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`)

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      // Send a friendly HTML page back to the browser tab before we close
      const html = code
        ? `<!DOCTYPE html><html><head><title>Voxel Buddy</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d111a;color:#e2e8f0">
            <h2 style="color:#2dd4bf">Gmail connected!</h2>
            <p>You can close this tab and return to Voxel Buddy.</p>
           </body></html>`
        : `<!DOCTYPE html><html><head><title>Voxel Buddy</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d111a;color:#e2e8f0">
            <h2 style="color:#f87171">Connection failed</h2>
            <p>${error || 'Unknown error'}</p>
           </body></html>`

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)

      clearTimeout(timeoutHandle)
      cleanup()

      if (code) {
        resolve(code)
      } else {
        reject(new Error(error || 'OAuth callback received no code'))
      }
    })

    function cleanup() {
      try {
        server.close()
      } catch (_) {
        // already closed — ignore
      }
    }

    server.on('error', (err) => {
      clearTimeout(timeoutHandle)
      reject(new Error(`OAuth server error: ${err.message}`))
    })

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[OAuth] Listening on http://localhost:${PORT}${CALLBACK_PATH}`)
    })

    timeoutHandle = setTimeout(() => {
      cleanup()
      reject(new Error('OAuth flow timed out after 5 minutes'))
    }, TIMEOUT_MS)
  })
}

module.exports = { startOAuthServer, PORT, CALLBACK_PATH }
