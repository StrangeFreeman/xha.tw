import assert from 'node:assert/strict'

import worker from './src/index.ts'

const env = {
  ALLOWED_ORIGINS: 'https://xha.tw,https://blog.xha.tw',
  GITHUB_OAUTH_ID: 'test-client-id',
  GITHUB_OAUTH_SECRET: 'test-client-secret',
  GITHUB_SCOPE: 'public_repo'
}

const rootResponse = await worker.fetch(new Request('https://auth.xha.tw/'), env)
assert.equal(rootResponse.status, 200)

const authorizationResponse = await worker.fetch(
  new Request('https://auth.xha.tw/auth?provider=github&site_id=xha.tw'),
  env
)
assert.equal(authorizationResponse.status, 302)

const authorizationUrl = new URL(authorizationResponse.headers.get('location'))
assert.equal(authorizationUrl.origin, 'https://github.com')
assert.equal(authorizationUrl.searchParams.get('redirect_uri'), 'https://auth.xha.tw/callback')
assert.equal(authorizationUrl.searchParams.get('scope'), 'public_repo')

const state = authorizationUrl.searchParams.get('state')
assert.ok(state)

const invalidCallback = await worker.fetch(
  new Request(`https://auth.xha.tw/callback?code=test-code&state=${state}invalid`),
  env
)
assert.equal(invalidCallback.status, 400)

globalThis.fetch = async () =>
  new Response(JSON.stringify({ access_token: 'test-access-token' }), {
    headers: { 'Content-Type': 'application/json' }
  })

const callbackResponse = await worker.fetch(
  new Request(`https://auth.xha.tw/callback?code=test-code&state=${state}`),
  env
)
assert.equal(callbackResponse.status, 200)
assert.match(await callbackResponse.text(), /test-access-token/)
assert.match(callbackResponse.headers.get('content-security-policy'), /default-src 'none'/)

const methodResponse = await worker.fetch(
  new Request('https://auth.xha.tw/auth?provider=github', { method: 'POST' }),
  env
)
assert.equal(methodResponse.status, 405)

console.log('OAuth worker checks passed')
