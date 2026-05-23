# Not All Order — Deployment Guide

Static site built with [11ty](https://www.11ty.dev/), content managed via [Sveltia CMS](https://github.com/sveltia/sveltia-cms), hosted on [Cloudflare Pages](https://pages.cloudflare.com/).

---

## Local development

```bash
npm install
npm start        # serves at http://localhost:8080
```

To test the CMS locally without GitHub auth, uncomment `local_backend: true` in `src/admin/config.yml`, then run:

```bash
npx @11ty/eleventy --serve &
npx @sveltia/cms-backend-proxy   # in a second terminal
```

---

## Deployment steps

### 1. Create a GitHub repository

Push this folder to a new GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/notallorder.git
git push -u origin main
```

### 2. Create a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:

| Field | Value |
|---|---|
| Application name | Not All Order CMS |
| Homepage URL | `https://notallorder.pages.dev` (or your domain) |
| Authorization callback URL | `https://notallorder-auth.YOUR_WORKERS_SUBDOMAIN.workers.dev/callback` |

Save the **Client ID** and generate a **Client Secret**.

### 3. Deploy the OAuth Worker

```bash
cd worker
npm install -g wrangler      # if not already installed
wrangler login
wrangler deploy

# Store the secrets (paste values when prompted):
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

Note the Worker URL — it will be `https://notallorder-auth.YOUR_SUBDOMAIN.workers.dev`.

### 4. Update CMS config

Edit `src/admin/config.yml` and replace the two placeholder values:

```yaml
backend:
  repo: YOUR_GITHUB_USERNAME/notallorder
  base_url: https://notallorder-auth.YOUR_SUBDOMAIN.workers.dev
```

Commit and push.

### 5. Connect Cloudflare Pages

1. Log into the [Cloudflare dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Select your GitHub repository
4. Set build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `_site`
5. Deploy

Your site will be live at `https://notallorder.pages.dev`.
The CMS will be at `https://notallorder.pages.dev/admin/`.

---

## Editing content

1. Go to `https://your-domain/admin/`
2. Click **Login with GitHub**
3. Edit any text in the **Home Page** section
4. Click **Publish** — this commits the change to GitHub, which triggers a new Cloudflare Pages build

---

## Project structure

```
notallorder/
├── src/
│   ├── _data/
│   │   └── site.json        ← all editable copy lives here
│   ├── admin/
│   │   ├── index.html       ← Sveltia CMS UI
│   │   └── config.yml       ← CMS field definitions
│   └── index.njk            ← page template
├── public/
│   └── assets/
│       └── logo.png         ← site logo
├── worker/
│   ├── index.js             ← GitHub OAuth proxy
│   └── wrangler.toml
├── .eleventy.js
└── package.json
```
