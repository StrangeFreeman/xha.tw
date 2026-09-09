export function settings(env = process.env) {
  const account = env.CLOUDFLARE_ACCOUNT_ID
  const project = env.CLOUDFLARE_PAGES_PROJECT
  if (
    !/^[a-f0-9]{32}$/.test(account || '') ||
    !/^[a-z0-9][a-z0-9-]*$/.test(project || '') ||
    !env.CLOUDFLARE_API_TOKEN
  ) {
    throw new Error(
      'Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT and CLOUDFLARE_API_TOKEN in the preview environment.'
    )
  }
  return { account, project }
}

export async function pagesApi(path = '', options = {}) {
  const { account, project } = settings()
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    }
  )
  const data = await response.json()
  if (!response.ok || !data.success)
    throw new Error(
      `Pages request failed (${response.status}): ${data.errors?.map((error) => error.message).join('; ')}`
    )
  return data.result
}

export async function deployments() {
  const results = []
  for (let page = 1; ; page++) {
    const batch = await pagesApi(`/deployments?per_page=25&page=${page}`)
    results.push(...batch)
    if (batch.length < 25) return results
  }
}

export function previewBranch(pr) {
  if (!/^[1-9][0-9]*$/.test(String(pr)))
    throw new Error('A positive pull request number is required.')
  return `cms-pr-${pr}`
}
