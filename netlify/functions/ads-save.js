/* Saves the site's ad slots (top, in_1, in_2, sidebar, sticky, bottom_1,
 * bottom_2, top_right) plus the article "continue" timer settings
 * (timer_url, timer_seconds) to assets/data/ads.json. That file is
 * public and read directly by assets/js/ads.js on every page, so no
 * matching "get" function is needed — reading ad codes doesn't require
 * a password, only writing them does. */

const { getFile, putFile, checkPassword, json } = require("./_github");

const SLOTS = ["top", "in_1", "in_2", "sidebar", "sticky", "bottom_1", "bottom_2", "top_right"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkPassword(body.password)) return json(401, { error: "Wrong password" });

    const input = body.ads || {};
    const ads = {};
    SLOTS.forEach((slot) => {
      ads[slot] = typeof input[slot] === "string" ? input[slot] : "";
    });
    ads.timer_url = typeof input.timer_url === "string" ? input.timer_url : "";
    const secs = parseInt(input.timer_seconds, 10);
    ads.timer_seconds = Number.isFinite(secs) && secs > 0 ? secs : 30;

    const existing = await getFile("assets/data/ads.json");
    await putFile(
      "assets/data/ads.json",
      JSON.stringify(ads, null, 2) + "\n",
      "Update ad slots",
      existing ? existing.sha : undefined
    );

    return json(200, { ok: true, ads });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
