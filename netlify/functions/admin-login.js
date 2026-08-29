const { checkPassword, json } = require("./_github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (checkPassword(body.password)) return json(200, { ok: true });
    return json(401, { ok: false, error: "Wrong password" });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
