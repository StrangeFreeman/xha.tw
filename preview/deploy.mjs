import { spawnSync } from 'node:child_process'
import { appendFile } from 'node:fs/promises'

import { deployments, pagesApi, previewBranch, settings } from './pages-api.mjs'

const { project } = settings()
const pr = process.env.PREVIEW_PR
const branch = pr ? previewBranch(pr) : 'main'
const sha = process.env.PREVIEW_SHA
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('PREVIEW_SHA must be a full commit SHA.')
const config = await pagesApi()
if (config.production_branch !== 'main')
  throw new Error('This preview project must use main as its production branch.')
const deploymentConfig = config.deployment_configs?.[pr ? 'preview' : 'production']
if (deploymentConfig?.fail_open !== false)
  throw new Error('Pages must use fail-closed mode before deploying private content.')
const bindings = deploymentConfig?.env_vars
for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ACCESS_EMAILS']) {
  if (!bindings?.[key])
    throw new Error(`Pages ${pr ? 'preview' : 'production'} is missing ${key}; refusing to deploy.`)
}
const command = spawnSync(
  process.execPath,
  [
    'x',
    '--no-install',
    'wrangler',
    'pages',
    'deploy',
    'dist-preview',
    '--project-name',
    project,
    '--branch',
    branch,
    '--commit-hash',
    sha,
    '--commit-dirty=true'
  ],
  { stdio: 'inherit', env: process.env }
)
if (command.error) throw command.error
if (command.status !== 0) process.exit(command.status || 1)
const all = await deployments()
const deployed = all.find(
  (item) =>
    item.deployment_trigger?.metadata?.branch === branch &&
    item.deployment_trigger?.metadata?.commit_hash === sha &&
    item.latest_stage?.status === 'success'
)
if (!deployed) throw new Error('No successful Pages deployment found for this commit.')
const url = deployed.url
if (!new URL(url).hostname.endsWith(`.${project}.pages.dev`))
  throw new Error('Unexpected deployment URL.')

// Check actual anonymous requests, rather than treating deployment success as proof of privacy.
for (const path of ['/', '/about', '/uploads/xha-signature.svg', '/sitemap-index.xml']) {
  const response = await fetch(new URL(path, url), {
    redirect: 'manual',
    signal: AbortSignal.timeout(30000)
  })
  const accessRedirect =
    response.status === 302 &&
    /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//.test(response.headers.get('location') || '')
  if (![401, 403].includes(response.status) && !accessRedirect) {
    throw new Error(`Private preview verification failed on ${path} (${response.status}).`)
  }
  await response.body?.cancel()
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`)
console.log('Preview deployed and anonymous access denied.')

// Keep the current preview; remove older snapshots of this PR to limit retained drafts.
if (pr)
  for (const item of all) {
    if (
      item.id !== deployed.id &&
      item.environment === 'preview' &&
      item.deployment_trigger?.metadata?.branch === branch
    ) {
      await pagesApi(`/deployments/${item.id}?force=true`, { method: 'DELETE' })
    }
  }
