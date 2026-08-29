/* Lets the admin panel replace a page's ENTIRE file — HTML, embedded
 * <style>, embedded <script>, everything — with whatever markup they
 * paste in. This bypasses the posts.json / template system completely;
 * it's a direct commit of the raw file content, for full "code view"
 * editing of any page (or creating a brand-new custom page at a new
 * pages/<name>.html path). */

const { getFile, putFile, checkPassword, isAllowedPagePath, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const path = String(body.path || "").trim();
    if (!isAllowedPagePath(path)) return json(400, { error: "That path can't be edited here." });

    const html = String(body.html || "");
    if (!html.trim()) return json(400, { error: "Page content can't be empty." });

    const existing = await getFile(path);
    await putFile(path, html, "Edit raw HTML: " + path, existing ? existing.sha : undefined);

    return json(200, { ok: true, path, created: !existing });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
