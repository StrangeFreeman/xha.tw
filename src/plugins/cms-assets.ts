import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import type { AstroIntegration } from 'astro'

// Public assets bypass Astro's bundler. Give the CMS and its preview renderer
// content-based URLs so cached scripts cannot lag behind a new block schema.
export default function cmsAssets(): AstroIntegration {
  return {
    name: 'cms-assets',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const assets = [
          'admin/config.yml',
          'admin/preview.css',
          'styles/resume-cards.css',
          'admin/blocks.js',
          'admin/preview.js'
        ]
        const replacements = new Map<string, string>()
        const replaceUrls = (source: string) => {
          for (const [original, versioned] of replacements) {
            source = source.replaceAll(original, versioned)
          }
          return source
        }
        for (const path of assets) {
          const source = replaceUrls(await readFile(new URL(path, dir), 'utf8'))
          const hash = createHash('sha256').update(source).digest('hex').slice(0, 16)
          const versioned = path.replace(/(\.[^.]+)$/, `.${hash}$1`)
          await writeFile(new URL(versioned, dir), source)
          replacements.set(`/${path}`, `/${versioned}`)
        }
        const entry = new URL('admin/index.html', dir)
        await writeFile(entry, replaceUrls(await readFile(entry, 'utf8')))
      }
    }
  }
}
