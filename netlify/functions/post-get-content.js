const { getFile, checkPassword, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const slug = String(body.slug || "").trim();
    if (!slug) return json(400, { error: "Missing slug." });

    const page = await getFile(`pages/${slug}.html`);
    if (!page) return json(404, { error: "Page file not found." });

    const match = page.content.match(/<!-- ARTICLE_CONTENT_START -->([\s\S]*?)<!-- ARTICLE_CONTENT_END -->/);
    const content = match ? match[1].trim() : "";

    return json(200, { ok: true, content });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
