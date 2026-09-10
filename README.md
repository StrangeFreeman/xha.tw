# xha.tw

The source for [xhA's personal website](https://xha.tw): a place for notes on cybersecurity, self-hosting, homelabs, and things learned along the way.

Maintained by [xhA / StrangeFreeman](https://github.com/StrangeFreeman). The site brings together a blog, project portfolio, friend links, and an About page, with a Git-backed editing and publishing workflow.

[Website](https://xha.tw) · [Backup site](https://blog.xha.tw) · [RSS](https://xha.tw/rss.xml)

## What is in this repository?

- Configurable pages and navigation, with reusable content blocks for Markdown, cards, tabs, steps, timelines, tools, projects, and friend links.
- Blog and documentation content in Markdown/MDX, including CMS-editable embedded blocks.
- Decap CMS with GitHub authentication, editorial drafts, and immediate editor previews.
- Private draft websites on Cloudflare Pages, protected by Cloudflare Access and server-side identity verification.
- A timeline that follows the editor's saved order, with new events inserted at the top, plus an animated SVG signature.
- Search, tags, archives, RSS, a sitemap, and optional Waline comments and view counts.
- Automated static deployment to the main VPS and a GitHub Pages backup, plus infrastructure configuration for the Shlink URL shortener.

## Local development

Use Bun and Node.js 22.12.0 or newer. Dependencies are pinned in `bun.lock`.

```sh
git clone https://github.com/StrangeFreeman/xha.tw.git
cd xha.tw
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:4321`. Site identity is stored in `src/data/site.json`; page content and navigation live in `src/data/pages/`. Advanced site settings are in `src/site.config.ts`.

| Command                 | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `bun run dev`           | Start the local development server                                     |
| `bun run check`         | Check Astro and TypeScript diagnostics                                 |
| `bun run test:cms`      | Test CMS previews and preview access controls                          |
| `bun run build`         | Check and build the production website into `dist/`                    |
| `bun run preview`       | Serve the production build locally                                     |
| `bun run build:preview` | Build drafts and prepare the protected Pages output in `dist-preview/` |

## Editing and publishing

The CMS is available at [xha.tw/admin](https://xha.tw/admin/). It manages site settings, pages and navigation, blog posts, and documentation.

1. Edit content and inspect the immediate preview in the editor.
2. Save a draft to GitHub.
3. Wait for the private preview build, then use **Check for Preview** to retrieve its link. This button checks deployment status; it does not start a build.
4. Review the draft website after signing in through Cloudflare Access.
5. Publish when ready. Changes merged into `main` trigger production deployment.

New timeline entries are added above existing entries. Dragging changes their saved display order; date labels are not automatically sorted.

See [CMS.md](CMS.md) for the editor guide in Traditional Chinese and [DEPLOYMENT.md](DEPLOYMENT.md) for deployment and authentication setup.

## Repository layout

| Path                         | Contents                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| `src/data/`                  | Site identity, page settings, and structured content           |
| `src/content/`               | Blog and documentation entries                                 |
| `src/components/`            | Site components and CMS content-block rendering                |
| `src/layouts/`, `src/pages/` | Page layouts, routes, and feeds                                |
| `public/admin/`              | Decap configuration, editor components, and immediate previews |
| `public/uploads/`            | Media uploaded through the CMS                                 |
| `auth-worker/`               | Cloudflare Worker for GitHub OAuth authentication              |
| `preview/`                   | Private preview authentication, deployment, and cleanup        |
| `tests/`                     | CMS and preview access-control tests                           |
| `deploy/`                    | VPS configuration for Caddy, Shlink, and PostgreSQL            |
| `.github/workflows/`         | Production and private-preview automation                      |
| `packages/pure/`, `preset/`  | Retained upstream integration source and development resources |

## Hosting

Production is built in GitHub Actions. The same static output is deployed independently to Caddy on the VPS at `xha.tw` and to GitHub Pages at `blog.xha.tw`. The VPS does not need to build or store a checkout of this repository.

Draft previews run on a separate Cloudflare Pages project. Custom, project, and per-deployment preview hostnames require Access authentication. The preview handler verifies the signed identity before serving pages or assets, and denies access when configuration or authentication is missing. Preview builds include drafts and disabled pages, and disable comments and view counting.

Access protects the hosted preview, not this repository's branches or Actions artifacts. Do not put secrets in content or committed files. Deployment credentials belong in GitHub environment secrets and Cloudflare runtime secrets. See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete setup.

## Origin and acknowledgments

This repository was originally cloned from [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure), created by [cworld1](https://github.com/cworld1). Its original source and design provided the starting point for this website.

Since then, the repository has been customized for xhA's content, identity, modular page editing, CMS workflow, private previews, and hosting infrastructure. Upstream components and the `astro-pure` integration remain part of the implementation. Credit and thanks go to the original author and contributors for that foundation.

## License

The repository retains the upstream [Apache License 2.0](LICENSE). Preserve applicable license and attribution notices when reusing its code. Third-party dependencies retain their respective licenses.
