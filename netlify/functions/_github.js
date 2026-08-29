/* Shared helper used by all admin functions.
 * Reads/writes files in the GitHub repo via the GitHub Contents API.
 * This is what makes "no backend" possible: every admin action is just
 * a git commit. Netlify picks it up and redeploys automatically.
 *
 * Required environment variables (set these in Netlify:
 * Site settings -> Environment variables):
 *   GH_TOKEN    - a GitHub Personal Access Token with "repo" scope
 *   GH_REPO     - "owner/repo", e.g. "codenest01/BlogTheme"
 *   GH_BRANCH   - branch to commit to, e.g. "main"
 *   ADMIN_PASSWORD - the password the admin panel checks against
 */

const API = "https://api.github.com";

function repoInfo() {
  const repo = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || "main";
  const token = process.env.GH_TOKEN;
  if (!repo || !token) {
    throw new Error("Server is missing GH_REPO or GH_TOKEN environment variables.");
  }
  return { repo, branch, token };
}

function authHeaders() {
  const { token } = repoInfo();
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "signal-admin-panel"
  };
}

/** Fetch a file's content + sha. Returns null if the file doesn't exist. */
async function getFile(path) {
  const { repo, branch } = repoInfo();
  const url = `${API}/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { content, sha: json.sha };
}

/** List the files directly inside a repo directory. Returns [] if the
 *  directory doesn't exist. Ignores subdirectories. */
async function listDir(path) {
  const { repo, branch } = repoInfo();
  const url = `${API}/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json.filter((item) => item.type === "file").map((item) => ({ name: item.name, path: item.path, sha: item.sha }));
}

/** Create or update a file. Pass sha when updating an existing file. */
async function putFile(path, content, message, sha) {
  const { repo, branch } = repoInfo();
  const url = `${API}/repos/${repo}/contents/${encodeURI(path)}`;
  const body = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Delete a file. Requires its current sha. */
async function deleteFile(path, sha, message) {
  const { repo, branch } = repoInfo();
  const url = `${API}/repos/${repo}/contents/${encodeURI(path)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ message, sha, branch })
  });
  if (!res.ok) throw new Error(`GitHub DELETE ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function checkPassword(providedPassword) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("Server is missing the ADMIN_PASSWORD environment variable.");
  return typeof providedPassword === "string" && providedPassword.length > 0 && providedPassword === real;
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}

/** Only allow the raw-HTML editor to read/write index.html or files
 *  directly inside pages/ — never dotfiles, netlify/functions, node
 *  internals, or anything reached via "..". */
function isAllowedPagePath(path) {
  const p = String(path || "").trim();
  if (!p || p.includes("..") || p.startsWith("/")) return false;
  if (p === "index.html") return true;
  return /^pages\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.html$/.test(p);
}

module.exports = { getFile, putFile, deleteFile, listDir, checkPassword, isAllowedPagePath, json };
