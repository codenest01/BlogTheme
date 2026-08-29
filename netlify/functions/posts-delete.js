const { getFile, putFile, deleteFile, checkPassword, json } = require("./_github");
const { removeRedirect, removeSitemap } = require("./_template");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const slug = String(body.slug || "").trim();
    if (!slug) return json(400, { error: "Missing slug." });

    const postsFile = await getFile("assets/data/posts.json");
    const posts = postsFile ? JSON.parse(postsFile.content) : [];
    const filtered = posts.filter((p) => p.slug !== slug);
    if (filtered.length === posts.length) return json(404, { error: "Post not found." });

    await putFile(
      "assets/data/posts.json",
      JSON.stringify(filtered, null, 2) + "\n",
      "Delete post: " + slug,
      postsFile.sha
    );

    const pageFile = await getFile(`pages/${slug}.html`);
    if (pageFile) {
      await deleteFile(`pages/${slug}.html`, pageFile.sha, "Delete page: " + slug);
    }

    const redirectsFile = await getFile("_redirects");
    if (redirectsFile) {
      const updated = removeRedirect(redirectsFile.content, slug);
      await putFile("_redirects", updated, "Remove redirect for " + slug, redirectsFile.sha);
    }

    const sitemapFile = await getFile("sitemap.xml");
    if (sitemapFile) {
      const updatedXml = removeSitemap(sitemapFile.content, slug);
      await putFile("sitemap.xml", updatedXml, "Remove sitemap entry for " + slug, sitemapFile.sha);
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
