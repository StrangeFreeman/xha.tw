interface Env {
  ALLOWED_ORIGINS: string
  GITHUB_OAUTH_ID: string
  GITHUB_OAUTH_SECRET: string
  GITHUB_SCOPE: string
}

interface OAuthState {
  expiresAt: number
  nonce: string
}

const encoder = new TextEncoder()
const stateLifetimeMs = 10 * 60 * 1000

function securityHeaders(contentType: string): HeadersInit {
  return {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  }
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function randomToken(bytes = 16): string {
  const value = new Uint8Array(bytes)
  crypto.getRandomValues(value)
  return base64UrlEncode(value)
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign', 'verify']
  )
}

async function createState(secret: string): Promise<string> {
  const payload: OAuthState = {
    expiresAt: Date.now() + stateLifetimeMs,
    nonce: randomToken()
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importSigningKey(secret),
    encoder.encode(encodedPayload)
  )

  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function verifyState(state: string, secret: string): Promise<boolean> {
  const [encodedPayload, encodedSignature, extra] = state.split('.')
  if (!encodedPayload || !encodedSignature || extra) return false

  try {
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      await importSigningKey(secret),
      base64UrlDecode(encodedSignature).buffer as ArrayBuffer,
      encoder.encode(encodedPayload)
    )
    if (!validSignature) return false

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload))
    ) as OAuthState
    return (
      typeof payload.nonce === 'string' &&
      payload.nonce.length >= 16 &&
      payload.expiresAt > Date.now()
    )
  } catch {
    return false
  }
}

function callbackUrl(requestUrl: URL): string {
  return `${requestUrl.protocol}//${requestUrl.host}/callback`
}

function validateEnvironment(env: Env): Response | undefined {
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return new Response('OAuth worker is not configured', {
      headers: securityHeaders('text/plain; charset=utf-8'),
      status: 503
    })
  }
}

async function authorize(url: URL, env: Env): Promise<Response> {
  if (url.searchParams.get('provider') !== 'github') {
    return new Response('Invalid OAuth provider', {
      headers: securityHeaders('text/plain; charset=utf-8'),
      status: 400
    })
  }

  const state = await createState(env.GITHUB_OAUTH_SECRET)
  const target = new URL('https://github.com/login/oauth/authorize')
  target.search = new URLSearchParams({
    client_id: env.GITHUB_OAUTH_ID,
    redirect_uri: callbackUrl(url),
    response_type: 'code',
    scope: env.GITHUB_SCOPE || 'public_repo',
    state
  }).toString()

  return new Response(null, {
    headers: {
      ...securityHeaders('text/plain; charset=utf-8'),
      Location: target.toString()
    },
    status: 302
  })
}

async function exchangeCode(code: string, url: URL, env: Env): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(url)
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST'
  })

  const result = (await response.json()) as { access_token?: string; error?: string }
  if (!response.ok || !result.access_token) throw new Error(result.error || 'token_exchange_failed')

  return result.access_token
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function callbackPage(
  status: 'success' | 'error',
  payload: Record<string, string>,
  env: Env
): Response {
  const nonce = randomToken()
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authorizing Decap CMS</title>
  </head>
  <body>
    <p>${status === 'success' ? 'Authorization complete. You can close this window.' : 'Authorization failed. Please close this window and try again.'}</p>
    <script nonce="${nonce}">
      const allowedOrigins = ${safeJson(allowedOrigins)};
      const responseMessage = ${safeJson(message)};
      const receiveMessage = (event) => {
        if (event.source !== window.opener || !allowedOrigins.includes(event.origin)) return;
        window.opener.postMessage(responseMessage, event.origin);
        window.removeEventListener('message', receiveMessage);
      };
      window.addEventListener('message', receiveMessage);
      if (window.opener) window.opener.postMessage('authorizing:github', '*');
    </script>
  </body>
</html>`

  return new Response(html, {
    headers: {
      ...securityHeaders('text/html; charset=utf-8'),
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'none'; img-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
    },
    status: status === 'success' ? 200 : 400
  })
}

async function callback(url: URL, env: Env): Promise<Response> {
  const oauthError = url.searchParams.get('error')
  if (oauthError) return callbackPage('error', { error: oauthError }, env)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state || !(await verifyState(state, env.GITHUB_OAUTH_SECRET))) {
    return callbackPage('error', { error: 'invalid_callback' }, env)
  }

  try {
    return callbackPage('success', { token: await exchangeCode(code, url, env) }, env)
  } catch {
    return callbackPage('error', { error: 'token_exchange_failed' }, env)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        headers: { ...securityHeaders('text/plain; charset=utf-8'), Allow: 'GET, HEAD' },
        status: 405
      })
    }

    const configurationError = validateEnvironment(env)
    if (configurationError) return configurationError

    const url = new URL(request.url)
    if (url.pathname === '/auth') return authorize(url, env)
    if (url.pathname === '/callback') return callback(url, env)

    return new Response('xha.tw CMS OAuth worker is ready', {
      headers: securityHeaders('text/plain; charset=utf-8')
    })
  }
}
