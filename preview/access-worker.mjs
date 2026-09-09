import { createRemoteJWKSet, jwtVerify } from 'jose'

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
}

function denied(status = 403) {
  return new Response('Private preview. Access denied.', { status, headers: privateHeaders })
}

export function accessConfig(env) {
  const issuer = String(env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '')
  const audience = String(env.ACCESS_AUD || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const emails = String(env.ACCESS_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) ||
    !audience.length ||
    !emails.length
  )
    return null
  return { issuer, audience, emails }
}

// Factory permits real signed-token tests without making live requests to the Access tenant.
export function createPreviewHandler(keyResolver) {
  let issuerCache
  let jwks
  return {
    async fetch(request, env) {
      const config = accessConfig(env)
      if (!config) return denied(503)
      const token = request.headers.get('Cf-Access-Jwt-Assertion')
      if (!token) return denied()
      try {
        if (!keyResolver && issuerCache !== config.issuer) {
          jwks = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`))
          issuerCache = config.issuer
        }
        const { payload } = await jwtVerify(token, keyResolver || jwks, {
          issuer: config.issuer,
          audience: config.audience,
          algorithms: ['RS256'],
          requiredClaims: ['exp', 'iat', 'sub', 'email'],
          clockTolerance: 5
        })
        if (
          typeof payload.email !== 'string' ||
          !config.emails.includes(payload.email.toLowerCase())
        )
          return denied()
      } catch {
        // Never fall through to static assets when Access or its key service fails.
        return denied()
      }
      if (!['GET', 'HEAD'].includes(request.method)) return denied(405)
      const path = new URL(request.url).pathname
      if (/^\/admin(?:\/|$)/.test(path)) return denied(404)
      const asset = await env.ASSETS.fetch(request)
      const response = new Response(asset.body, asset)
      for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value)
      return response
    }
  }
}

export default createPreviewHandler()
