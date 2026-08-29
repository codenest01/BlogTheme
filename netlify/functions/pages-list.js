/* Lists every HTML file the admin panel's raw-HTML editor is allowed to
 * touch: index.html plus everything in pages/ (blog posts and the static
 * pages like about/contact/privacy/terms). */

const { listDir, checkPassword, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const pageFiles = await listDir("pages");
    const paths = ["index.html"].concat(
      pageFiles
        .filter((f) => f.name.toLowerCase().endsWith(".html"))
        .map((f) => f.path)
        .sort()
    );

    return json(200, { ok: true, paths });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
