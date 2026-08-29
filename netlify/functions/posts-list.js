const { getFile, checkPassword, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const file = await getFile("assets/data/posts.json");
    const posts = file ? JSON.parse(file.content) : [];
    return json(200, { ok: true, posts });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
