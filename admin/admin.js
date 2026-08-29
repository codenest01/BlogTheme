(function () {
  "use strict";

  var FN = "/.netlify/functions/";
  var PW_KEY = "signal_admin_pw";
  var state = { posts: [], bulkCount: 0, rawPaths: [], rawActivePath: "" };

  /* ---------- Session persistence ----------
     Stored in localStorage (not sessionStorage) so signing in once keeps
     you signed in on this device/browser across tabs and after closing
     the browser — you won't be asked to log in again until you use the
     Log out button. The password is still checked against the server on
     every admin request; only where it's cached client-side has changed. */
  function pw() {
    try { return localStorage.getItem(PW_KEY) || ""; } catch (e) { return ""; }
  }
  function setPw(value) {
    try { localStorage.setItem(PW_KEY, value); } catch (e) {}
  }
  function clearPw() {
    try { localStorage.removeItem(PW_KEY); } catch (e) {}
  }

  async function api(name, payload) {
    var res = await fetch(FN + name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ password: pw() }, payload || {}))
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, data: data };
  }

  function statusHTML(type, msg) {
    return '<div class="admin-status ' + type + '">' + msg + "</div>";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function el(id) { return document.getElementById(id); }

  function showDashboard() {
    el("admin-login-view").classList.add("hidden");
    el("admin-dashboard-view").classList.remove("hidden");
    loadPosts();
    loadAds();
    loadRawPageList();
  }

  function showLogin(message) {
    el("admin-dashboard-view").classList.add("hidden");
    el("admin-login-view").classList.remove("hidden");
    el("login-status").innerHTML = message ? statusHTML("error", message) : "";
  }

  function handleAuthExpired() {
    clearPw();
    showLogin("Session expired — sign in again.");
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    var buttons = document.querySelectorAll(".admin-tab-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".admin-tab-panel").forEach(function (panel) {
          panel.classList.add("hidden");
        });
        el("tab-" + btn.getAttribute("data-tab")).classList.remove("hidden");
      });
    });
  }

  /* =========================================================
     TAB: Posts (single create/edit — unchanged behaviour)
     ========================================================= */
  async function loadPosts() {
    el("posts-list").innerHTML = '<div class="admin-empty">Loading…</div>';
    var r = await api("posts-list");
    if (r.status === 401) { handleAuthExpired(); return; }
    if (!r.data.ok) { el("posts-list").innerHTML = statusHTML("error", r.data.error || "Failed to load posts."); return; }
    state.posts = r.data.posts || [];
    renderPosts();
  }

  function renderPosts() {
    var sorted = state.posts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!sorted.length) {
      el("posts-list").innerHTML = '<div class="admin-empty">No posts yet — click "New post" to add one.</div>';
      return;
    }
    el("posts-list").innerHTML = sorted.map(function (p) {
      return (
        '<div class="admin-post-item">' +
        '<img src="' + esc(p.image) + '" alt="">' +
        '<div class="api-body"><div class="api-title">' + esc(p.title) + '</div>' +
        '<div class="api-meta">' + esc(p.category) + " · " + esc(p.date) + " · /" + esc(p.slug) + "</div></div>" +
        '<div class="admin-post-actions">' +
        '<button class="btn btn-outline btn-sm" data-edit="' + esc(p.slug) + '">Edit</button>' +
        '<button class="btn btn-outline btn-sm" data-delete="' + esc(p.slug) + '">Delete</button>' +
        '<a class="btn btn-text btn-sm" href="../pages/' + esc(p.slug) + '.html" target="_blank" rel="noopener">View</a>' +
        "</div></div>"
      );
    }).join("");
  }

  function resetForm() {
    el("f-original-slug").value = "";
    el("f-title").value = "";
    el("f-slug").value = "";
    el("f-category").value = "Technology";
    el("f-author").value = "Staff Writer";
    el("f-date").value = new Date().toISOString().slice(0, 10);
    el("f-excerpt").value = "";
    el("f-tags").value = "";
    el("f-image").value = "";
    el("f-featured").checked = false;
    el("f-popular").checked = false;
    el("f-content").value = "";
    el("form-status").innerHTML = "";
  }

  function openFormForNew() {
    resetForm();
    el("form-heading").textContent = "New post";
    el("post-form-card").style.display = "block";
    el("post-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function openFormForEdit(slug) {
    var p = state.posts.find(function (x) { return x.slug === slug; });
    if (!p) return;
    resetForm();
    el("form-heading").textContent = "Edit post";
    el("f-original-slug").value = p.slug;
    el("f-title").value = p.title;
    el("f-slug").value = p.slug;
    el("f-category").value = p.category;
    el("f-author").value = p.author;
    el("f-date").value = p.date;
    el("f-excerpt").value = p.excerpt;
    el("f-tags").value = (p.tags || []).join(", ");
    el("f-image").value = p.image;
    el("f-featured").checked = !!p.featured;
    el("f-popular").checked = !!p.popular;
    el("post-form-card").style.display = "block";
    el("form-status").innerHTML = statusHTML("info", "Loading article content…");
    el("post-form-card").scrollIntoView({ behavior: "smooth", block: "start" });

    var r = await api("post-get-content", { slug: slug });
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("f-content").value = r.data.content;
      el("form-status").innerHTML = "";
    } else {
      el("form-status").innerHTML = statusHTML("error", r.data.error || "Could not load article content.");
    }
  }

  async function handleDelete(slug) {
    if (!confirm('Delete "' + slug + '"? This removes the page and cannot be undone.')) return;
    el("dashboard-status").innerHTML = statusHTML("info", "Deleting…");
    var r = await api("posts-delete", { slug: slug });
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("dashboard-status").innerHTML = statusHTML("success", "Deleted. It may take up to a minute to disappear from the live site while Netlify redeploys.");
      loadPosts();
    } else {
      el("dashboard-status").innerHTML = statusHTML("error", r.data.error || "Delete failed.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    var originalSlug = el("f-original-slug").value;
    var mode = originalSlug ? "update" : "create";
    var payload = {
      mode: mode,
      original_slug: originalSlug,
      post: {
        title: el("f-title").value.trim(),
        slug: el("f-slug").value.trim(),
        category: el("f-category").value,
        author: el("f-author").value.trim(),
        date: el("f-date").value,
        excerpt: el("f-excerpt").value.trim(),
        tags: el("f-tags").value,
        image: el("f-image").value.trim(),
        featured: el("f-featured").checked,
        popular: el("f-popular").checked
      },
      content: el("f-content").value
    };
    el("save-btn").disabled = true;
    el("form-status").innerHTML = statusHTML("info", "Saving…");
    var r = await api("posts-save", payload);
    el("save-btn").disabled = false;
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("post-form-card").style.display = "none";
      el("dashboard-status").innerHTML = statusHTML(
        "success",
        'Saved "' + esc(r.data.post.title) + '". It will appear at /' + esc(r.data.slug) + ' and /pages/' + esc(r.data.slug) + '.html within a minute, once Netlify finishes redeploying.'
      );
      loadPosts();
    } else {
      el("form-status").innerHTML = statusHTML("error", r.data.error || "Save failed.");
    }
  }

  /* =========================================================
     TAB: Bulk add (up to 10 posts in one request)
     ========================================================= */
  var BULK_MAX = 10;

  function bulkItemHTML(n) {
    var today = new Date().toISOString().slice(0, 10);
    return (
      '<div class="bulk-item" data-bulk-index="' + n + '">' +
      '<div class="bulk-item-head"><h3>Post ' + (n + 1) + '</h3>' +
      '<button type="button" class="bulk-item-remove" data-bulk-remove="' + n + '">Remove</button></div>' +
      '<div class="admin-field"><label>Title</label><input type="text" data-bf="title"></div>' +
      '<div class="admin-row">' +
      '<div class="admin-field"><label>URL slug (optional)</label><input type="text" data-bf="slug" placeholder="auto-generated from title"></div>' +
      '<div class="admin-field"><label>Category</label><select data-bf="category">' +
      ["Technology", "AI", "Blogging", "Web Development", "Tutorials", "Digital Marketing", "News"]
        .map(function (c) { return "<option>" + c + "</option>"; }).join("") +
      "</select></div></div>" +
      '<div class="admin-row">' +
      '<div class="admin-field"><label>Author</label><input type="text" data-bf="author" value="Staff Writer"></div>' +
      '<div class="admin-field"><label>Published date</label><input type="date" data-bf="date" value="' + today + '"></div>' +
      "</div>" +
      '<div class="admin-field"><label>Excerpt / meta description</label><textarea data-bf="excerpt" style="min-height:50px;"></textarea></div>' +
      '<div class="admin-row">' +
      '<div class="admin-field"><label>Tags (comma separated)</label><input type="text" data-bf="tags"></div>' +
      '<div class="admin-field"><label>Cover image URL</label><input type="url" data-bf="image" placeholder="https://..."></div>' +
      "</div>" +
      '<div class="admin-field"><label>Article content (HTML)</label><textarea data-bf="content" class="admin-content" style="min-height:180px;"></textarea></div>' +
      "</div>"
    );
  }

  function bulkAddItem() {
    if (state.bulkCount >= BULK_MAX) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = bulkItemHTML(state.bulkCount);
    el("bulk-items").appendChild(wrap.firstChild);
    state.bulkCount += 1;
    el("bulk-add-item-btn").disabled = state.bulkCount >= BULK_MAX;
  }

  function bulkRemoveItem(index) {
    var item = document.querySelector('.bulk-item[data-bulk-index="' + index + '"]');
    if (item) item.remove();
    el("bulk-add-item-btn").disabled = false;
  }

  function bulkCollectItems() {
    var items = [];
    document.querySelectorAll(".bulk-item").forEach(function (block) {
      var get = function (name) {
        var f = block.querySelector('[data-bf="' + name + '"]');
        return f ? f.value.trim() : "";
      };
      var title = get("title");
      var content = get("content");
      if (!title && !content) return; // skip fully-empty blocks
      items.push({
        title: title,
        slug: get("slug"),
        category: get("category") || "Technology",
        author: get("author") || "Staff Writer",
        date: get("date"),
        excerpt: get("excerpt"),
        tags: get("tags"),
        image: get("image"),
        content: content
      });
    });
    return items;
  }

  async function bulkSave() {
    var items = bulkCollectItems();
    if (!items.length) {
      el("bulk-status").innerHTML = statusHTML("error", "Add at least one post with a title and content.");
      return;
    }
    if (items.length > BULK_MAX) {
      el("bulk-status").innerHTML = statusHTML("error", "You can save at most " + BULK_MAX + " posts at once.");
      return;
    }
    el("bulk-save-btn").disabled = true;
    el("bulk-status").innerHTML = statusHTML("info", "Saving " + items.length + " post(s)…");
    el("bulk-results").innerHTML = "";

    var r = await api("posts-bulk-save", { posts: items });
    el("bulk-save-btn").disabled = false;

    if (r.status === 401) { handleAuthExpired(); return; }

    if (r.data && r.data.results) {
      el("bulk-results").innerHTML = '<ul class="bulk-result-list">' +
        r.data.results.map(function (res) {
          if (res.ok) return '<li class="ok">"' + esc(res.title) + '" saved as /' + esc(res.slug) + "</li>";
          return '<li class="fail">Post ' + (res.index + 1) + ": " + esc(res.error) + "</li>";
        }).join("") + "</ul>";
    }

    if (r.data && r.data.ok) {
      el("bulk-status").innerHTML = statusHTML("success", "Saved " + r.data.created + " post(s). They'll be live within a minute once Netlify redeploys.");
      el("bulk-items").innerHTML = "";
      state.bulkCount = 0;
      bulkAddItem(); bulkAddItem(); bulkAddItem();
      el("bulk-add-item-btn").disabled = false;
      loadPosts();
    } else if (r.data) {
      el("bulk-status").innerHTML = statusHTML("error", r.data.error || "Bulk save failed.");
    }
  }

  /* =========================================================
     TAB: Ads
     ========================================================= */
  async function loadAds() {
    try {
      var res = await fetch("../assets/data/ads.json", { cache: "no-store" });
      var ads = res.ok ? await res.json() : {};
      el("ad-top").value = ads.top || "";
      el("ad-in1").value = ads.in_1 || "";
      el("ad-in2").value = ads.in_2 || "";
      el("ad-sidebar").value = ads.sidebar || "";
      el("ad-sticky").value = ads.sticky || "";
      el("ad-bottom1").value = ads.bottom_1 || "";
      el("ad-bottom2").value = ads.bottom_2 || "";
      el("ad-topright").value = ads.top_right || "";
      el("timer-url").value = ads.timer_url || "";
      el("timer-seconds").value = ads.timer_seconds || 30;
    } catch (e) {
      el("ads-status").innerHTML = statusHTML("error", "Could not load current ad codes.");
    }
  }

  async function saveAds(e) {
    e.preventDefault();
    var payload = {
      ads: {
        top: el("ad-top").value,
        in_1: el("ad-in1").value,
        in_2: el("ad-in2").value,
        sidebar: el("ad-sidebar").value,
        sticky: el("ad-sticky").value,
        bottom_1: el("ad-bottom1").value,
        bottom_2: el("ad-bottom2").value,
        top_right: el("ad-topright").value,
        timer_url: el("timer-url").value,
        timer_seconds: parseInt(el("timer-seconds").value, 10) || 30
      }
    };
    el("ads-save-btn").disabled = true;
    el("ads-status").innerHTML = statusHTML("info", "Saving ad slots…");
    var r = await api("ads-save", payload);
    el("ads-save-btn").disabled = false;
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("ads-status").innerHTML = statusHTML("success", "Ad slots saved. They'll appear on every page within a minute once Netlify redeploys.");
    } else {
      el("ads-status").innerHTML = statusHTML("error", r.data.error || "Save failed.");
    }
  }

  /* =========================================================
     TAB: Raw HTML page editor
     ========================================================= */
  async function loadRawPageList() {
    el("raw-page-list").innerHTML = '<div class="admin-empty">Loading…</div>';
    var r = await api("pages-list");
    if (r.status === 401) { handleAuthExpired(); return; }
    if (!r.data.ok) {
      el("raw-page-list").innerHTML = statusHTML("error", r.data.error || "Could not list pages.");
      return;
    }
    state.rawPaths = r.data.paths || [];
    renderRawPageList();
  }

  function renderRawPageList() {
    if (!state.rawPaths.length) {
      el("raw-page-list").innerHTML = '<div class="admin-empty">No pages found.</div>';
      return;
    }
    el("raw-page-list").innerHTML = state.rawPaths.map(function (p) {
      var active = p === state.rawActivePath ? " active" : "";
      return '<button type="button" class="raw-page-chip' + active + '" data-raw-path="' + esc(p) + '">' + esc(p) + "</button>";
    }).join("");
  }

  async function rawLoadPage(path) {
    path = (path || "").trim();
    if (!path) {
      el("raw-status").innerHTML = statusHTML("error", "Enter a page path first.");
      return;
    }
    el("raw-status").innerHTML = statusHTML("info", "Loading " + esc(path) + "…");
    var r = await api("page-get-raw", { path: path });
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("raw-html").value = r.data.html;
      el("raw-path").value = path;
      state.rawActivePath = path;
      renderRawPageList();
      el("raw-status").innerHTML = statusHTML("success", "Loaded " + esc(path) + ".");
    } else {
      el("raw-status").innerHTML = statusHTML("error", r.data.error || "Could not load that page.");
    }
  }

  async function rawSavePage() {
    var path = el("raw-path").value.trim();
    var html = el("raw-html").value;
    if (!path) { el("raw-status").innerHTML = statusHTML("error", "Enter a page path first."); return; }
    if (!html.trim()) { el("raw-status").innerHTML = statusHTML("error", "Page content can't be empty."); return; }
    if (!confirm('Overwrite "' + path + '" with this HTML? This replaces the whole file and cannot be undone.')) return;

    el("raw-save-btn").disabled = true;
    el("raw-status").innerHTML = statusHTML("info", "Saving " + esc(path) + "…");
    var r = await api("page-save-raw", { path: path, html: html });
    el("raw-save-btn").disabled = false;
    if (r.status === 401) { handleAuthExpired(); return; }
    if (r.data.ok) {
      el("raw-status").innerHTML = statusHTML("success", (r.data.created ? "Created " : "Saved ") + esc(path) + ". It will be live within a minute once Netlify redeploys.");
      state.rawActivePath = path;
      loadRawPageList();
    } else {
      el("raw-status").innerHTML = statusHTML("error", r.data.error || "Save failed.");
    }
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTabs();

    if (pw()) {
      showDashboard();
    }

    el("login-btn").addEventListener("click", async function () {
      var value = el("login-password").value;
      el("login-status").innerHTML = statusHTML("info", "Checking…");
      var r = await api("admin-login", { password: value });
      if (r.data.ok) {
        setPw(value);
        showDashboard();
      } else {
        showLogin(r.data.error || "Wrong password.");
      }
    });

    el("login-password").addEventListener("keydown", function (e) {
      if (e.key === "Enter") el("login-btn").click();
    });

    el("logout-btn").addEventListener("click", function () {
      clearPw();
      showLogin();
    });

    // Posts tab
    el("new-post-btn").addEventListener("click", openFormForNew);
    el("cancel-form-btn").addEventListener("click", function () { el("post-form-card").style.display = "none"; });
    el("post-form").addEventListener("submit", handleSubmit);
    el("posts-list").addEventListener("click", function (e) {
      var editSlug = e.target.getAttribute("data-edit");
      var delSlug = e.target.getAttribute("data-delete");
      if (editSlug) openFormForEdit(editSlug);
      if (delSlug) handleDelete(delSlug);
    });

    // Bulk add tab
    bulkAddItem(); bulkAddItem(); bulkAddItem();
    el("bulk-add-item-btn").addEventListener("click", bulkAddItem);
    el("bulk-save-btn").addEventListener("click", bulkSave);
    el("bulk-items").addEventListener("click", function (e) {
      var idx = e.target.getAttribute("data-bulk-remove");
      if (idx !== null) bulkRemoveItem(idx);
    });

    // Ads tab
    el("ads-form").addEventListener("submit", saveAds);

    // Raw HTML tab
    el("raw-load-btn").addEventListener("click", function () { rawLoadPage(el("raw-path").value); });
    el("raw-save-btn").addEventListener("click", rawSavePage);
    el("raw-page-list").addEventListener("click", function (e) {
      var path = e.target.getAttribute("data-raw-path");
      if (path) rawLoadPage(path);
    });
  });
})();
