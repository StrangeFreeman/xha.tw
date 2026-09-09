import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
if (!process.argv.includes('--protect-only')) {
  const result = spawnSync(process.execPath, ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CMS_PREVIEW: 'true' }
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

const outdir = resolve(root, 'dist-preview')
await mkdir(outdir, { recursive: true })
// Only trusted code from this checkout can become the Pages request handler.
for (const name of ['_worker.js', '_routes.json', '_redirects', '_headers']) {
  await rm(resolve(outdir, name), { force: true, recursive: true })
}
const result = await Bun.build({
  entrypoints: [resolve(root, 'preview/access-worker.mjs')],
  target: 'browser',
  format: 'esm',
  minify: true
})
if (!result.success) throw new AggregateError(result.logs, 'Preview protection build failed')
await writeFile(resolve(outdir, '_worker.js'), await result.outputs[0].text())
await writeFile(
  resolve(outdir, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/*'], exclude: [] })
)
await writeFile(resolve(outdir, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
console.log('Private Pages preview prepared; every asset requires a verified Access identity.')
