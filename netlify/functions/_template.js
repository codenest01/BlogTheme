/* Builds the standalone HTML page for a post, and small text-file helpers
 * (the _redirects file) used by posts-save.js / posts-delete.js. */

const SITE_NAME = "Signal";
const SITE_URL = "https://your-domain.example"; // update to your real domain once you have one

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function estimateReadTime(html) {
  const text = String(html || "").replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return minutes + " min read";
}

function buildPageHTML(meta, contentHtml) {
  const {
    slug, title, category, excerpt, author, date, updated, readTime, tags, image, authorBio
  } = meta;

  const tagMeta = (tags || []).map((t) => `<meta property="article:tag" content="${escapeHtml(t)}">`).join("");
  const tagLinks = (tags || []).map((t) => `<a class="tag" href="../index.html">#${escapeHtml(t)}</a>`).join("");
  const bio = authorBio || `${escapeHtml(author)} writes for ${SITE_NAME}.`;
  const keywords = (tags || []).concat([category]).filter(Boolean).join(", ");
  const imageAlt = `${title} — ${category}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} | ${SITE_NAME}</title>
<meta name="description" content="${escapeHtml(excerpt)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="${escapeHtml(author)}">
<link rel="canonical" href="${SITE_URL}/pages/${slug}.html">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(excerpt)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${SITE_URL}/pages/${slug}.html">
<meta property="article:published_time" content="${escapeHtml(date)}">
<meta property="article:modified_time" content="${escapeHtml(updated)}">
<meta property="article:author" content="${escapeHtml(author)}">
<meta property="article:section" content="${escapeHtml(category)}">
${tagMeta}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(excerpt)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#128225;</text></svg>">
<link rel="stylesheet" href="../assets/css/style.css">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(title)},
  "description": ${JSON.stringify(excerpt)},
  "image": [${JSON.stringify(image)}],
  "author": {"@type": "Person", "name": ${JSON.stringify(author)}},
  "publisher": {"@type": "Organization", "name": "${SITE_NAME}"},
  "datePublished": ${JSON.stringify(date)},
  "dateModified": ${JSON.stringify(updated)},
  "mainEntityOfPage": ${JSON.stringify(SITE_URL + "/pages/" + slug + ".html")}
}
</script>
</head>
<body data-root="../" data-page="article" data-slug="${escapeHtml(slug)}" data-category="${escapeHtml(category)}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" id="site-header"></header>

<main id="main">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a><span class="sep">/</span>
      <a href="../index.html#categories">${escapeHtml(category)}</a><span class="sep">/</span>
      <span aria-current="page">${escapeHtml(title)}</span>
    </nav>
  </div>

  <div class="container content-layout">
    <article>
      <div class="article-head">
        <div class="dispatch" data-cat="${escapeHtml(category)}"><span class="dot"></span><span class="cat-label">${escapeHtml(category)}</span><span class="sep">·</span><span>${escapeHtml(readTime)}</span></div>
        <h1>${escapeHtml(title)}</h1>
        <p class="article-lede">${escapeHtml(excerpt)}</p>
        <div class="article-byline">
          <img src="https://i.pravatar.cc/88?u=${encodeURIComponent(author)}" alt="${escapeHtml(author)}" width="44" height="44" loading="lazy">
          <div><div class="ab-name">${escapeHtml(author)}</div></div>
        </div>
      </div>

      <div class="article-feature-img">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" loading="lazy">
      </div>

      <div class="article-body">
<!-- ARTICLE_CONTENT_START -->
${contentHtml}
<!-- ARTICLE_CONTENT_END -->
      </div>

      <div class="tag-row">
        ${tagLinks}
      </div>

      <div class="author-card">
        <img src="https://i.pravatar.cc/128?u=${encodeURIComponent(author)}" alt="${escapeHtml(author)}" width="64" height="64" loading="lazy">
        <div>
          <h4>${escapeHtml(author)}</h4>
          <p>${escapeHtml(bio)}</p>
        </div>
      </div>

      <div class="section-head">
        <div><span class="section-kicker">Keep reading</span><h2>Related posts</h2></div>
      </div>
      <div class="related-grid post-grid" data-inject="related" data-limit="3"></div>
    </article>

    <div id="site-sidebar"></div>
  </div>
</main>

<footer class="site-footer" id="site-footer"></footer>
<script src="../assets/js/script.js"></script>
<script src="../assets/js/ads.js"></script>
</body>
</html>
`;
}

/** Ensure a clean-URL redirect ("/slug" -> "/pages/slug.html") exists. */
function upsertRedirect(existingText, slug) {
  const line = `/${slug}  /pages/${slug}.html  200`;
  const lines = (existingText || "").split("\n").filter((l) => l.trim().length > 0);
  const filtered = lines.filter((l) => !l.trim().startsWith(`/${slug} `) && !l.trim().startsWith(`/${slug}\t`));
  filtered.push(line);
  return filtered.join("\n") + "\n";
}

function removeRedirect(existingText, slug) {
  const lines = (existingText || "").split("\n").filter((l) => l.trim().length > 0);
  const filtered = lines.filter((l) => !l.trim().startsWith(`/${slug} `) && !l.trim().startsWith(`/${slug}\t`));
  return filtered.join("\n") + (filtered.length ? "\n" : "");
}

/** Add/refresh a <url> entry for a post's clean URL in sitemap.xml. */
function upsertSitemap(existingXml, slug, updated) {
  const loc = `${SITE_URL}/${slug}`;
  const lastmod = updated || new Date().toISOString().slice(0, 10);
  const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;

  let xml = (existingXml || "").trim();
  if (!xml) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
  }

  // Strip any existing entry for this slug (match by its <loc>) so re-saving doesn't duplicate it.
  const urlBlockRe = /<url>\s*<loc>([^<]*)<\/loc>[\s\S]*?<\/url>/g;
  const kept = [];
  let m;
  while ((m = urlBlockRe.exec(xml)) !== null) {
    if (m[1] !== loc) kept.push(m[0]);
  }
  kept.push(entry);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${kept.join("\n")}\n</urlset>\n`;
}

/** Remove a post's <url> entry from sitemap.xml (used on delete). */
function removeSitemap(existingXml, slug) {
  const loc = `${SITE_URL}/${slug}`;
  const xml = (existingXml || "").trim();
  if (!xml) return xml;

  const urlBlockRe = /<url>\s*<loc>([^<]*)<\/loc>[\s\S]*?<\/url>/g;
  const kept = [];
  let m;
  while ((m = urlBlockRe.exec(xml)) !== null) {
    if (m[1] !== loc) kept.push(m[0]);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${kept.join("\n")}\n</urlset>\n`;
}

module.exports = {
  slugify,
  estimateReadTime,
  buildPageHTML,
  upsertRedirect,
  removeRedirect,
  upsertSitemap,
  removeSitemap,
  escapeHtml,
  SITE_URL
};
