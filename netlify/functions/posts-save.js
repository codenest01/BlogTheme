const { getFile, putFile, deleteFile, checkPassword, json } = require("./_github");
const { slugify, estimateReadTime, buildPageHTML, upsertRedirect, removeRedirect, upsertSitemap, removeSitemap } = require("./_template");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueSlug(base, posts, ignoreSlug) {
  let slug = base;
  let n = 2;
  const taken = new Set(posts.filter((p) => p.slug !== ignoreSlug).map((p) => p.slug));
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const mode = body.mode === "update" ? "update" : "create";
    const input = body.post || {};
    const content = String(body.content || "").trim();

    if (!input.title || !content) {
      return json(400, { error: "Title and article content are required." });
    }

    const postsFile = await getFile("assets/data/posts.json");
    const posts = postsFile ? JSON.parse(postsFile.content) : [];

    let slug = slugify(input.slug || input.title);
    if (!slug) return json(400, { error: "Could not build a URL slug from that title." });

    const originalSlug = mode === "update" ? slugify(body.original_slug || "") : null;
    let existingIndex = -1;
    if (mode === "update") {
      existingIndex = posts.findIndex((p) => p.slug === originalSlug);
      if (existingIndex === -1) return json(404, { error: "Original post not found." });
    }

    slug = uniqueSlug(slug, posts, mode === "update" ? originalSlug : null);
    const slugChanged = mode === "update" && slug !== originalSlug;

    const tags = Array.isArray(input.tags)
      ? input.tags
      : String(input.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    const meta = {
      slug,
      title: String(input.title).trim(),
      category: input.category || "Technology",
      excerpt: String(input.excerpt || "").trim() || String(input.title).trim(),
      author: String(input.author || "Staff Writer").trim(),
      date: mode === "create" ? (input.date || todayISO()) : (input.date || posts[existingIndex].date || todayISO()),
      updated: todayISO(),
      readTime: input.readTime && String(input.readTime).trim() ? String(input.readTime).trim() : estimateReadTime(content),
      tags,
      image: input.image || "https://picsum.photos/seed/" + slug + "/900/560",
      featured: !!input.featured,
      popular: !!input.popular
    };

    if (mode === "create") {
      posts.unshift(meta);
    } else {
      posts[existingIndex] = meta;
    }

    // 1) commit updated posts.json
    await putFile(
      "assets/data/posts.json",
      JSON.stringify(posts, null, 2) + "\n",
      (mode === "create" ? "Add post: " : "Update post: ") + meta.title,
      postsFile ? postsFile.sha : undefined
    );

    // 2) commit the page HTML
    const pageHtml = buildPageHTML(meta, content);
    const pagePath = `pages/${slug}.html`;
    let pageSha;
    if (mode === "update" && !slugChanged) {
      const existingPage = await getFile(pagePath);
      pageSha = existingPage ? existingPage.sha : undefined;
    }
    await putFile(pagePath, pageHtml, (mode === "create" ? "Add page: " : "Update page: ") + pagePath, pageSha);

    // 3) if slug changed on update, remove the old page file
    if (slugChanged) {
      const oldPage = await getFile(`pages/${originalSlug}.html`);
      if (oldPage) {
        await deleteFile(`pages/${originalSlug}.html`, oldPage.sha, "Remove old page after slug change: " + originalSlug);
      }
    }

    // 4) maintain the /slug clean-URL redirect
    const redirectsFile = await getFile("_redirects");
    let redirectsText = redirectsFile ? redirectsFile.content : "";
    if (slugChanged) redirectsText = removeRedirect(redirectsText, originalSlug);
    redirectsText = upsertRedirect(redirectsText, slug);
    await putFile("_redirects", redirectsText, "Update redirects for " + slug, redirectsFile ? redirectsFile.sha : undefined);

    // 5) keep sitemap.xml current for search engines
    const sitemapFile = await getFile("sitemap.xml");
    let sitemapXml = sitemapFile ? sitemapFile.content : "";
    if (slugChanged) sitemapXml = removeSitemap(sitemapXml, originalSlug);
    sitemapXml = upsertSitemap(sitemapXml, slug, meta.updated);
    await putFile("sitemap.xml", sitemapXml, "Update sitemap for " + slug, sitemapFile ? sitemapFile.sha : undefined);

    return json(200, { ok: true, slug, post: meta });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
