import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPair, SignJWT } from 'jose'

import { accessConfig, createPreviewHandler } from '../preview/access-worker.mjs'

const { publicKey, privateKey } = await generateKeyPair('RS256')
const env = {
  ACCESS_TEAM_DOMAIN: 'https://test.cloudflareaccess.com',
  ACCESS_AUD: 'preview-app',
  ACCESS_EMAILS: 'editor@example.test',
  ASSETS: {
    fetch: async () => new Response('PRIVATE DRAFT', { headers: { 'Content-Type': 'text/html' } })
  }
}
const worker = createPreviewHandler(async () => publicKey)
async function token(claims = {}, key = privateKey) {
  return new SignJWT({ email: 'editor@example.test', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(claims.iss || env.ACCESS_TEAM_DOMAIN)
    .setAudience(claims.aud || env.ACCESS_AUD)
    .setSubject('editor')
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? '1h')
    .sign(key)
}
function request(jwt, path = '/', method = 'GET') {
  return new Request(`https://hash.xha-preview.pages.dev${path}`, {
    method,
    headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {}
  })
}

test('every anonymous page and asset is denied without fetching content', async () => {
  let fetched = false
  for (const path of [
    '/',
    '/about',
    '/admin/',
    '/uploads/private.svg',
    '/_astro/app.js',
    '/robots.txt'
  ]) {
    const response = await worker.fetch(request(null, path), {
      ...env,
      ASSETS: {
        fetch: () => {
          fetched = true
        }
      }
    })
    assert.equal(response.status, 403)
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
  assert.equal(fetched, false)
})
test('missing or invalid Access configuration fails closed', async () => {
  for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ACCESS_EMAILS']) {
    assert.equal((await worker.fetch(request(await token()), { ...env, [key]: '' })).status, 503)
  }
  assert.equal(accessConfig({ ...env, ACCESS_TEAM_DOMAIN: 'https://attacker.test' }), null)
})
test('only the permitted email with a valid signature, issuer, audience and lifetime is served', async () => {
  const success = await worker.fetch(request(await token()), env)
  assert.equal(success.status, 200)
  assert.equal(await success.text(), 'PRIVATE DRAFT')
  assert.equal(success.headers.get('content-type'), 'text/html')
  assert.match(success.headers.get('x-robots-tag'), /noindex/)
  for (const claims of [
    { email: 'stranger@example.test' },
    { iss: 'https://wrong.cloudflareaccess.com' },
    { aud: 'other-app' },
    { exp: 1 }
  ]) {
    assert.equal((await worker.fetch(request(await token(claims)), env)).status, 403)
  }
  const attacker = await generateKeyPair('RS256')
  assert.equal((await worker.fetch(request(await token({}, attacker.privateKey)), env)).status, 403)
  assert.equal((await worker.fetch(request('not-a-token'), env)).status, 403)
})
test('key service failure cannot bypass protection; previews cannot host CMS writes', async () => {
  const failing = createPreviewHandler(async () => {
    throw new Error('key service unavailable')
  })
  assert.equal((await failing.fetch(request(await token()), env)).status, 403)
  assert.equal((await worker.fetch(request(await token(), '/admin/'), env)).status, 404)
  assert.equal((await worker.fetch(request(await token(), '/', 'POST'), env)).status, 405)
})
