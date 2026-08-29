const { getFile, checkPassword, isAllowedPagePath, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const path = String(body.path || "").trim();
    if (!isAllowedPagePath(path)) return json(400, { error: "That path can't be edited here." });

    const file = await getFile(path);
    if (!file) return json(404, { error: "File not found." });

    return json(200, { ok: true, path, html: file.content });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
