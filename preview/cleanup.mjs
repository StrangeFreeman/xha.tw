import { deployments, pagesApi, previewBranch } from './pages-api.mjs'

const branch = previewBranch(process.env.PREVIEW_PR)
for (const deployment of await deployments()) {
  if (
    deployment.environment === 'preview' &&
    deployment.deployment_trigger?.metadata?.branch === branch
  ) {
    await pagesApi(`/deployments/${deployment.id}?force=true`, { method: 'DELETE' })
  }
}
console.log('Closed PR previews removed.')
