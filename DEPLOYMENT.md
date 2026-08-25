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
the VPS. The VPS deployment is skipped until both `VPS_HOST` and `VPS_USER` repository environment
variables exist.

## GitHub production environment

Create a `production` environment with:

- Variable `VPS_HOST`: VPS IP address or SSH hostname
- Variable `VPS_USER`: dedicated unprivileged deployment user
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
mkdir -p secrets /srv/xha.tw
openssl rand -base64 36 > secrets/postgres_password.txt
chmod 600 .env secrets/postgres_password.txt
docker compose --profile shlink up -d
```

Before starting the stack, edit `.env` and provide a MaxMind GeoLite2 license key. DNS records for
`xha.tw`, `www.xha.tw`, and `go.xha.tw` must point to the VPS. Only ports 22, 80, and 443 need to be
publicly reachable.

Generate the first Shlink API key after the services are healthy:

```sh
docker compose exec shlink shlink api-key:generate --name=web-client
```

Store the generated key in a password manager. It must never be committed to this repository.

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

Deploy a Decap-compatible OAuth proxy at `auth.xha.tw`, then store the GitHub OAuth client ID and
client secret in that platform's encrypted secret storage. The proxy must allow both
`https://xha.tw` and `https://blog.xha.tw` as browser origins. Decap documents the required `/auth`
and `/callback` endpoints and links to compatible edge-worker implementations:

- https://decapcms.org/docs/backends-overview/#using-github-with-an-oauth-proxy
- https://decapcms.org/docs/external-oauth-clients/

Using an edge worker for `auth.xha.tw` is preferred because CMS authentication remains independent
of the VPS. Published pages never depend on the CMS or OAuth proxy at request time.

Map `auth.xha.tw` to the worker as a custom domain. It must not point at the VPS unless the OAuth
proxy is intentionally moved there.

The first CMS version manages regular `.md` content only. Site-wide TypeScript settings in
`src/site.config.ts` and advanced `.mdx` entries remain code-managed so the CMS cannot accidentally
remove imports or Pure component markup.

For local-only CMS testing, run Decap's local proxy and open `/admin/`; `local_backend` is already
enabled in `public/admin/config.yml`.
