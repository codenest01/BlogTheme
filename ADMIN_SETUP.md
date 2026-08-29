# Admin panel setup

This adds a password-protected `/admin` page to your Signal blog where you can
add, edit, and delete posts — no database, no traditional server. Every action
just makes a commit to your GitHub repo through a small Netlify Function, and
Netlify redeploys automatically (usually live within ~30–60 seconds).

## What changed

- `assets/data/posts.json` — your 8 existing posts, moved out of `script.js`
  into their own JSON file (so the admin panel can safely add/edit/remove
  entries without touching code).
- `assets/js/script.js` — now loads posts from that JSON file instead of a
  hardcoded array. Everything else (homepage cards, search, sidebar, category
  counts) works exactly as before.
- `admin/index.html` + `admin/admin.js` + `assets/css/admin.css` — the admin
  panel itself.
- `netlify/functions/*.js` — the serverless functions that do the actual work
  (auth check, list/create/update/delete posts, fetch a post's content for
  editing).
- `_redirects` — new posts get a clean URL like `/my-post-slug` automatically
  added here (in addition to `/pages/my-post-slug.html`).
- `netlify.toml` / `robots.txt` — small additions so `/admin` isn't indexed by
  search engines and Netlify knows where the functions live.

Nothing about your existing pages' look or URLs changed.

## 1. Create a GitHub token

The functions commit files to your repo on your behalf, so they need a token:

1. GitHub → Settings → Developer settings → **Personal access tokens** →
   Fine-grained tokens → Generate new token.
2. Repository access: only `codenest01/BlogTheme`.
3. Permissions: **Contents: Read and write**.
4. Generate, and copy the token — you won't see it again.

(A classic token with the `repo` scope also works if you prefer.)

## 2. Add environment variables in Netlify

Site settings → **Environment variables** → add:

| Key | Value |
|---|---|
| `ADMIN_PASSWORD` | a strong password you choose — this logs into `/admin` |
| `GH_TOKEN` | the token from step 1 |
| `GH_REPO` | `codenest01/BlogTheme` |
| `GH_BRANCH` | the branch Netlify deploys from, e.g. `main` |

Redeploy the site after adding these (Netlify → Deploys → Trigger deploy)
so the functions pick them up.

## 3. Merge these files into your repo

Copy everything in this zip into your repo root (it includes your existing
files plus the additions above), commit, and push. Netlify will deploy as
usual — no build command needed, same as today.

## 4. Use it

- Visit `https://your-site.netlify.app/admin`
- Sign in with `ADMIN_PASSWORD` — you'll stay signed in on that device
  until you click **Log out**, no need to log in again each visit.
- **Posts tab** — same single-post form as before: fill it in, save, it
  commits `assets/data/posts.json` + `pages/<slug>.html` + `_redirects` +
  `sitemap.xml`, and appears on the homepage, in search, in "recent
  posts", and at both `/pages/<slug>.html` and `/<slug>` once Netlify
  finishes redeploying. **Edit** pulls the live content back into the
  form; **Delete** removes the post, its page, its redirect, and its
  sitemap entry.
- **Bulk add tab** — add up to 10 posts in one submission. Each gets the
  exact same full-SEO template (meta description, keywords, robots tag,
  canonical URL, Open Graph, Twitter card, schema.org JSON-LD article
  data, real image alt text, sitemap entry, clean-URL redirect) as a
  single post.
- **Ads tab** — paste any ad network's raw embed/script code into up to
  5 slots: top of page (above the title), two in-article slots (roughly
  a third and two-thirds of the way through the body), the sidebar, and
  a dismissible sticky bar pinned to the bottom of the screen. Leave any
  field blank to turn that slot off. These slots render on **every**
  page of the site — the homepage, every post (old and new), and every
  static page — via `assets/js/ads.js`, which reads `assets/data/ads.json`.
- **Pages (raw HTML) tab** — pick any existing page (or type a new path
  under `pages/`) and replace its *entire* file — HTML, embedded
  `<style>`, embedded `<script>` — with whatever you paste in. This
  bypasses the templating system completely, so use it when you want
  full control over one page's markup, or to hand-build a new page from
  scratch. For safety this only works on `index.html` or files directly
  inside `pages/` (no other paths, no `..`).

## Notes and limits

- Auth is a single shared password (checked server-side on every
  request) — fine for one admin, not built for multiple accounts/roles.
  The password itself is cached in this browser's `localStorage` so you
  aren't asked for it again; anyone with access to that browser profile
  can reach `/admin` without the password until you log out, so treat
  this like you would any saved browser password.
- There's a short delay (usually under a minute) between saving in
  `/admin` and the change going live, since it's a real Netlify deploy,
  not an instant database write. Bulk-adding 10 posts still triggers
  several small commits (posts.json, each page, redirects, sitemap), so
  it can take a little longer to fully redeploy than a single post.
- Ad codes are stored in `assets/data/ads.json`, a plain public file (no
  password needed to read it, same as `posts.json`) — only *saving* new
  ad codes from `/admin` requires the password. Don't put anything
  secret in an ad slot.
- The raw HTML editor gives whole-file control on purpose — there's no
  undo beyond re-pasting the previous version, so keep a copy of
  anything important before overwriting it.
- The GitHub token has write access to your repo — keep it only in
  Netlify's environment variables, never in the code or in a commit.
