# xha.tw deployment

The same static Astro build is published to two destinations:

- `https://xha.tw`: Caddy on the VPS, serving `/srv/xha.tw`
- `https://blog.xha.tw`: GitHub Pages backup
- `https://go.xha.tw`: Shlink on the VPS
- `https://xha.tw/admin/`: Decap CMS, writing content back to GitHub

## GitHub Pages

In repository settings, select **Pages → Source → GitHub Actions**, set the custom domain to
`blog.xha.tw`, and enable HTTPS. Configure DNS as follows:

```text
CNAME  blog  StrangeFreeman.github.io
```

The workflow builds once and deploys the same `dist/` artifact independently to GitHub Pages and
the VPS.

## GitHub production environment

Create a `production` environment with:

- Secret `VPS_HOST`: VPS IP address or SSH hostname
- Secret `VPS_USER`: dedicated unprivileged deployment user
- Secret `VPS_SSH_KEY`: private Ed25519 deployment key
- Secret `VPS_KNOWN_HOSTS`: verified SSH host-key line for the VPS

The deployment user must be able to write to `/srv/xha.tw`. Do not use `root` for CI deployment.

## VPS preparation

For a small VPS, do not clone or build the Astro project on the server. Build in GitHub Actions or
locally and transfer only `dist/` plus the files under `deploy/`. Docker logs are rotated at 10 MB
with three files per service to prevent unbounded disk growth.

Copy the `deploy/` directory to `/opt/xha-stack`. The main static website can be started without
Shlink:

```sh
cd /opt/xha-stack
docker compose up -d caddy
```

`https://xha.tw` and the `www` redirect will work immediately. `https://go.xha.tw` remains
unavailable until the Shlink profile is enabled.

To enable Shlink later, create the runtime files:

```sh
cd /opt/xha-stack
cp .env.example .env
install -d -m 700 secrets
mkdir -p /srv/xha.tw
openssl rand -base64 36 > secrets/postgres_password.txt
chmod 600 .env
chmod 644 secrets/postgres_password.txt
docker compose --profile shlink up -d
```

The `secrets` directory remains accessible only to root on the VPS. The password file itself must be
readable by the non-root users inside both the Shlink and PostgreSQL containers when Compose bind-mounts it.

Before starting the stack, edit `.env` and provide a MaxMind GeoLite2 license key. DNS records for
`xha.tw`, `www.xha.tw`, and `go.xha.tw` must point to the VPS. Only ports 22, 80, and 443 need to be
publicly reachable. Shlink is pinned to version 5.1.5 so upgrades and database migrations can be
reviewed before changing versions.

Generate the first Shlink API key after the services are healthy:

```sh
docker compose exec shlink shlink api-key:generate --name=web-client
```

Store the generated key in a password manager. It must never be committed to this repository.
Manage the server from `https://app.shlink.io/`, using `https://go.xha.tw` as the server URL. The
hosted client runs in the browser, and the Shlink API only allows that origin through CORS.

## Local checks

```sh
bun install --frozen-lockfile
bun run build
```

The output must contain `dist/index.html`, `dist/blog/index.html`, `dist/admin/index.html`, and
`dist/admin/config.yml`.

## Decap CMS

The CMS is a static admin application at `https://xha.tw/admin/`. It manages regular Markdown
entries in `src/content/blog/`. New entries use an `index.md` file with images stored beside it.
MDX files containing Astro or Pure component imports remain code-managed; do not convert them
through the CMS Markdown editor.

The CMS uses GitHub's editorial workflow. Saving a draft creates a CMS branch and pull request;
publishing merges it into `main`, which triggers the same GitHub Actions deployment for the VPS and
GitHub Pages.

### GitHub OAuth

The repository intentionally contains no OAuth client secret. Create a GitHub OAuth App with:

```text
Homepage URL:               https://xha.tw/admin/
Authorization callback URL: https://auth.xha.tw/callback
```

The OAuth proxy is in `auth-worker/`. Deploy it with Wrangler after authenticating to Cloudflare:

```sh
bunx wrangler@4 secret put GITHUB_OAUTH_ID --config auth-worker/wrangler.toml
bunx wrangler@4 secret put GITHUB_OAUTH_SECRET --config auth-worker/wrangler.toml
bunx wrangler@4 deploy --config auth-worker/wrangler.toml
```

Enter the GitHub OAuth client ID and secret only when Wrangler prompts. They are encrypted Worker
secrets and must never be committed. The Worker maps itself to `auth.xha.tw`, requests only the
`public_repo` scope, and returns credentials only to `https://xha.tw` or `https://blog.xha.tw`.
Decap documents the required `/auth` and `/callback` protocol here:

- https://decapcms.org/docs/backends-overview/#using-github-with-an-oauth-proxy
- https://decapcms.org/docs/external-oauth-clients/

Using an edge worker for `auth.xha.tw` is preferred because CMS authentication remains independent
of the VPS. Published pages never depend on the CMS or OAuth proxy at request time.

After deployment, `https://auth.xha.tw/` should say that the OAuth Worker is ready. Visiting
`https://auth.xha.tw/auth?provider=github` should redirect to GitHub. Do not create a separate DNS
record for `auth.xha.tw`; Wrangler configures it as the Worker's Cloudflare custom domain. It must
not point at the VPS unless the OAuth proxy is intentionally moved there.

The CMS manages page JSON and Blog/Docs MDX, including encoded `CmsBlock` components.
Site-wide TypeScript settings in `src/site.config.ts` remain code-managed.

For local-only CMS testing, run Decap's local proxy and open `/admin/`; `local_backend` is already
enabled in `public/admin/config.yml`.

## Private CMS previews

Previews use the separate Cloudflare Pages project `xha-preview`, not VPS storage.
`preview.xha.tw` is the main preview, with a proxied CNAME to `xha-preview.pages.dev`.
CMS pull requests use `cms-pr-<number>` branches and immutable deployment URLs.

Configure one Cloudflare Access self-hosted application covering **all three** destinations:

- `preview.xha.tw`
- `xha-preview.pages.dev`
- `*.xha-preview.pages.dev`

Use one Allow policy with exact administrator email addresses, one-time PIN login, and no
Everyone, Bypass, or Service Auth rules. Hide the application from the launcher and enable
HttpOnly cookies. Keep email addresses out of the repository. DNS and certificate records are
public; Access prevents visitors from viewing the site, rather than hiding the hostname itself.

In **both** Pages production and preview runtime environments configure:

| Binding              | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| `ACCESS_TEAM_DOMAIN` | The HTTPS Cloudflare Access team domain                   |
| `ACCESS_AUD`         | The Access application's audience tag                     |
| `ACCESS_EMAILS`      | Secret containing comma-separated allowed email addresses |

Set Pages Functions failure mode to **fail closed** (`fail_open: false`). The request handler
verifies signed Access JWTs, issuer, audience, expiry, and exact email before serving any HTML
or asset. Missing configuration, missing/invalid tokens, and unavailable signing keys deny
access. `_routes.json` includes every route without exclusions. `/admin` is unavailable on
preview deployments. Responses use no-store and noindex headers; those headers supplement
authentication and are not the access control themselves.

The zone's managed robots feature may answer `/robots.txt` at Cloudflare's edge before the
application runs. Its public generic crawler policy contains no preview content; the deployment
privacy check uses the sitemap as well as pages and assets, which must all require Access.

Create a GitHub environment named `preview` with:

| Kind     | Name                       | Value                                           |
| -------- | -------------------------- | ----------------------------------------------- |
| Variable | `CLOUDFLARE_ACCOUNT_ID`    | Pages account ID                                |
| Variable | `CLOUDFLARE_PAGES_PROJECT` | `xha-preview`                                   |
| Secret   | `CLOUDFLARE_API_TOKEN`     | Account-scoped token with Cloudflare Pages Edit |

Use a dedicated scoped API token; never put a Wrangler OAuth token into GitHub or commit any
credential. Environment branch rules must permit main and same-repository CMS pull requests.
The workflow must be present on main before CMS draft deployment can use its trusted scripts.

`.github/workflows/preview.yml` builds without deployment credentials, then a separate job
checks out the trusted base revision and replaces the artifact's worker and routing files.
Deployment credentials are available only to the deploy step. Fork pull requests are excluded.
The workflow publishes the `deploy-preview` commit status consumed by Decap, checks anonymous
access before marking success, skips obsolete drafts, removes previous PR snapshots after
successful updates, and removes all PR snapshots when the PR closes. Build artifacts expire
after one day. Repository branches and Actions artifacts retain the repository's own visibility;
Access only protects the hosted preview. Do not store secrets in CMS content.

Validation: run `bun run test:cms`, `bun run build`, and `bun run build:preview`. Anonymous
requests to the custom domain, project root, deployment URLs, pages, and assets must return
403 or redirect to Access. Sign in as an allowed administrator to verify full page rendering.
When locally deleting the last temporary content fixture, Astro may retain its content cache;
remove `node_modules/.astro/data-store.json` before rebuilding if that deleted entry persists.
