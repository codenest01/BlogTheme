/* Creates several posts (up to 10) from one admin submission. Used by the
 * "Bulk add" tab in /admin. Each item goes through the same metadata /
 * full-SEO template as a single post (posts-save.js), but posts.json,
 * _redirects, and sitemap.xml are each only read and committed once. */

const { getFile, putFile, json, checkPassword } = require("./_github");
const { slugify, estimateReadTime, buildPageHTML, upsertRedirect, upsertSitemap } = require("./_template");

const MAX_ITEMS = 10;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueSlug(base, takenSet) {
  let slug = base;
  let n = 2;
  while (takenSet.has(slug)) {
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

    const items = Array.isArray(body.posts) ? body.posts : [];
    if (!items.length) return json(400, { error: "No posts were provided." });
    if (items.length > MAX_ITEMS) {
      return json(400, { error: `You can add at most ${MAX_ITEMS} posts at once.` });
    }

    const postsFile = await getFile("assets/data/posts.json");
    const posts = postsFile ? JSON.parse(postsFile.content) : [];
    const takenSlugs = new Set(posts.map((p) => p.slug));

    const results = [];
    const newMetas = [];
    const newPages = []; // { path, html }

    for (let i = 0; i < items.length; i++) {
      const input = items[i] || {};
      const content = String(input.content || "").trim();
      const title = String(input.title || "").trim();

      if (!title || !content) {
        results.push({ index: i, ok: false, error: "Title and article content are required." });
        continue;
      }

      let slug = slugify(input.slug || title);
      if (!slug) {
        results.push({ index: i, ok: false, error: "Could not build a URL slug from that title." });
        continue;
      }
      slug = uniqueSlug(slug, takenSlugs);
      takenSlugs.add(slug);

      const tags = Array.isArray(input.tags)
        ? input.tags
        : String(input.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

      const meta = {
        slug,
        title,
        category: input.category || "Technology",
        excerpt: String(input.excerpt || "").trim() || title,
        author: String(input.author || "Staff Writer").trim(),
        date: input.date || todayISO(),
        updated: todayISO(),
        readTime: input.readTime && String(input.readTime).trim() ? String(input.readTime).trim() : estimateReadTime(content),
        tags,
        image: input.image || "https://picsum.photos/seed/" + slug + "/900/560",
        featured: !!input.featured,
        popular: !!input.popular
      };

      newMetas.push(meta);
      newPages.push({ path: `pages/${slug}.html`, html: buildPageHTML(meta, content) });
      results.push({ index: i, ok: true, slug, title });
    }

    if (!newMetas.length) {
      return json(400, { error: "None of the submitted posts were valid.", results });
    }

    // Newest-first, keeping the submitted order among the new batch.
    const updatedPosts = newMetas.slice().reverse().concat(posts);

    // 1) commit posts.json once
    await putFile(
      "assets/data/posts.json",
      JSON.stringify(updatedPosts, null, 2) + "\n",
      `Bulk add ${newMetas.length} post(s)`,
      postsFile ? postsFile.sha : undefined
    );

    // 2) commit each new page file
    for (const page of newPages) {
      await putFile(page.path, page.html, "Add page: " + page.path, undefined);
    }

    // 3) update _redirects for all new slugs
    const redirectsFile = await getFile("_redirects");
    let redirectsText = redirectsFile ? redirectsFile.content : "";
    for (const meta of newMetas) redirectsText = upsertRedirect(redirectsText, meta.slug);
    await putFile("_redirects", redirectsText, `Add redirects for ${newMetas.length} post(s)`, redirectsFile ? redirectsFile.sha : undefined);

    // 4) update sitemap.xml for all new slugs
    const sitemapFile = await getFile("sitemap.xml");
    let sitemapXml = sitemapFile ? sitemapFile.content : "";
    for (const meta of newMetas) sitemapXml = upsertSitemap(sitemapXml, meta.slug, meta.updated);
    await putFile("sitemap.xml", sitemapXml, `Update sitemap for ${newMetas.length} post(s)`, sitemapFile ? sitemapFile.sha : undefined);

    return json(200, { ok: true, created: newMetas.length, results });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
