/* ==========================================================================
   SIGNAL — shared site behaviour.
   Header/footer/sidebar are injected client-side so every page stays in
   sync from one source (works reliably on static Netlify hosting, no
   server-side includes or build step required).
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Blog data ----------
     Posts now live in /assets/data/posts.json (not hardcoded here) so the
     admin panel can add/edit/delete posts by editing that one JSON file
     via a Netlify Function — no rebuild of this script required.
     SIGNAL.ready resolves once POSTS has been loaded, so any code that
     needs POSTS (this file's own init, or inline page scripts) should
     run inside SIGNAL.ready.then(...) rather than assuming it's
     populated immediately. */
  var POSTS = [];

  var CATEGORIES = [
    { name: "Technology", slug: "technology" },
    { name: "AI", slug: "ai" },
    { name: "Blogging", slug: "blogging" },
    { name: "Web Development", slug: "web-development" },
    { name: "Tutorials", slug: "tutorials" },
    { name: "Digital Marketing", slug: "digital-marketing" },
    { name: "News", slug: "news" }
  ];

  window.SIGNAL = { POSTS: POSTS, CATEGORIES: CATEGORIES };

  /* Figure out the right path to posts.json regardless of whether this
     page lives at the site root or one level down in /pages/ or /admin/. */
  var scriptEl = document.currentScript;
  var dataRoot = "./";
  if (scriptEl) {
    var src = scriptEl.getAttribute("src") || "";
    dataRoot = src.replace(/assets\/js\/script\.js.*$/, "");
  }

  window.SIGNAL.ready = fetch(dataRoot + "assets/data/posts.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load posts.json (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      POSTS.length = 0;
      Array.prototype.push.apply(POSTS, data);
      return POSTS;
    })
    .catch(function (err) {
      console.error("SIGNAL: failed to load posts.json", err);
      return POSTS;
    });

  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  window.SIGNAL.fmtDate = fmtDate;

  /* ---------- Theme ---------- */
  var THEME_KEY = "signal-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "light";
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  }

  /* Apply theme immediately (before paint) to avoid a flash */
  initTheme();

  /* ---------- Header / Footer templates ---------- */
  function headerHTML(root, activePage) {
    function navLink(href, label, key) {
      var cls = activePage === key ? ' class="active"' : "";
      return '<a href="' + root + href + '"' + cls + '>' + label + "</a>";
    }
    var navItems =
      navLink("index.html", "Home", "home") +
      navLink("pages/rise-of-edge-computing.html", "Blog", "blog") +
      navLink("index.html#categories", "Categories", "categories") +
      navLink("pages/about.html", "About", "about") +
      navLink("pages/contact.html", "Contact", "contact");

    return (
      '<div class="header-inner container">' +
      '<a href="' + root + 'index.html" class="logo" aria-label="Signal home">Signal<span class="logo-dot">.</span></a>' +
      '<nav class="main-nav" aria-label="Primary"><ul>' + navItems + "</ul></nav>" +
      '<div class="header-actions">' +
      '<button class="btn-icon" id="search-open" aria-label="Open search" aria-haspopup="dialog">' + iconSearch() + "</button>" +
      '<button class="btn-icon theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">' + iconSun() + iconMoon() + "</button>" +
      '<button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' +
      "<span></span><span></span><span></span></button>" +
      "</div></div>" +
      '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile"><ul>' + navItems + "</ul></nav>" +
      '<div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search articles">' +
      '<div class="search-panel">' +
      '<div class="search-input-row">' + iconSearch() +
      '<input type="text" id="search-input" placeholder="Search articles, categories, tags\u2026" autocomplete="off">' +
      '<button class="btn-icon" id="search-close" aria-label="Close search">' + iconClose() + "</button>" +
      "</div>" +
      '<div class="search-results" id="search-results"></div>' +
      "</div></div>"
    );
  }

  function footerHTML(root) {
    var catLinks = CATEGORIES.map(function (c) {
      return '<li><a href="' + root + "index.html#categories" + '">' + c.name + "</a></li>";
    }).join("");
    var popular = POSTS.filter(function (p) { return p.popular; }).slice(0, 3).map(function (p) {
      return '<li><a href="' + root + "pages/" + p.slug + '.html">' + p.title + "</a></li>";
    }).join("");

    return (
      '<div class="container">' +
      '<div class="footer-top">' +
      '<div class="footer-col">' +
      '<a href="' + root + 'index.html" class="logo" style="margin-bottom:14px;display:inline-flex;">Signal<span class="logo-dot">.</span></a>' +
      "<p>Field notes on technology, AI, and the web \u2014 written for people who read past the headline. No hype, no filler, updated every week.</p>" +
      '<div class="footer-social">' + socialIcons() + "</div>" +
      "</div>" +
      '<div class="footer-col"><h4>Quick Links</h4><ul>' +
      '<li><a href="' + root + 'index.html">Home</a></li>' +
      '<li><a href="' + root + 'pages/rise-of-edge-computing.html">Blog</a></li>' +
      '<li><a href="' + root + 'index.html#categories">Categories</a></li>' +
      '<li><a href="' + root + 'pages/about.html">About</a></li>' +
      '<li><a href="' + root + 'pages/contact.html">Contact</a></li>' +
      "</ul></div>" +
      '<div class="footer-col"><h4>Categories</h4><ul>' + catLinks + "</ul></div>" +
      '<div class="footer-col"><h4>Popular Posts</h4><ul>' + popular + "</ul></div>" +
      "</div>" +
      '<div class="footer-bottom">' +
      "<span>\u00A9 " + new Date().getFullYear() + ' Signal. All rights reserved.</span>' +
      '<div class="legal-links">' +
      '<a href="' + root + 'pages/privacy.html">Privacy Policy</a>' +
      '<a href="' + root + 'pages/terms.html">Terms of Service</a>' +
      '<a href="' + root + 'pages/sitemap.html">Sitemap</a>' +
      "</div></div></div>"
    );
  }

  function sidebarHTML(root, excludeSlug) {
    var popular = POSTS.filter(function (p) { return p.popular && p.slug !== excludeSlug; }).slice(0, 4);
    var recent = POSTS.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
      .filter(function (p) { return p.slug !== excludeSlug; }).slice(0, 4);
    var tagSet = {};
    POSTS.forEach(function (p) { p.tags.forEach(function (t) { tagSet[t] = true; }); });

    function listItem(p) {
      return '<li><a href="' + root + "pages/" + p.slug + '.html" style="display:flex;gap:12px;">' +
        '<img src="' + p.image + '" alt="" loading="lazy" width="56" height="56">' +
        '<span><span class="wl-title">' + p.title + '</span><span class="wl-meta">' + fmtDate(p.date) + " \u00B7 " + p.readTime + "</span></span></a></li>";
    }

    return (
      '<aside class="sidebar" aria-label="Sidebar">' +
      '<div id="ad-slot-sidebar-holder"></div>' +
      '<div class="widget widget-search"><form class="widget-search" role="search" onsubmit="return false;" id="sidebar-search-form">' +
      '<input type="text" id="sidebar-search-input" placeholder="Search the blog\u2026" aria-label="Search the blog">' +
      '<button class="btn-icon" type="submit" aria-label="Search">' + iconSearch() + "</button>" +
      "</form></div>" +

      '<div class="widget widget-about"><h3>About Signal</h3>' +
      "<p>Signal is an independent publication covering technology, AI, and the craft of building for the web. Founded in 2022, written by working engineers.</p>" +
      '<a class="btn btn-outline btn-sm" href="' + root + 'pages/about.html">Read our story</a></div>' +

      '<div class="widget widget-popular"><h3>Popular Posts</h3><ul class="widget-list numbered">' +
      popular.map(listItem).join("") + "</ul></div>" +

      '<div class="widget widget-recent"><h3>Recent Posts</h3><ul class="widget-list">' +
      recent.map(listItem).join("") + "</ul></div>" +

      '<div class="widget widget-categories"><h3>Categories</h3><div class="widget-cats">' +
      CATEGORIES.map(function (c) {
        var count = POSTS.filter(function (p) { return p.category === c.name; }).length;
        return '<a href="' + root + "index.html#categories" + '" data-cat-filter="' + c.name + '">' + c.name + '<span class="count">' + count + "</span></a>";
      }).join("") + "</div></div>" +

      '<div class="widget widget-tags"><h3>Tags</h3><div class="widget-tags">' +
      Object.keys(tagSet).map(function (t) {
        return '<a href="' + root + "index.html" + '">#' + t + "</a>";
      }).join("") + "</div></div>" +

      '<div class="widget widget-newsletter"><h3>Newsletter</h3>' +
      "<p>One email a week. No fluff, unsubscribe anytime.</p>" +
      '<form class="nl-form" onsubmit="return false;">' +
      '<input type="email" placeholder="you@example.com" required aria-label="Email address">' +
      '<button type="submit" class="btn btn-primary btn-sm">Subscribe</button>' +
      '<span class="form-success">Thanks \u2014 check your inbox to confirm.</span>' +
      "</form></div>" +

      '<div class="widget widget-social"><h3>Follow</h3><div class="social-row">' + socialIcons() + "</div></div>" +
      "</aside>"
    );
  }

  /* ---------- Icons (inline SVG, no icon font/CDN needed) ---------- */
  function iconSearch() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'; }
  function iconClose() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'; }
  function iconSun() { return '<svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"></line><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"></line><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"></line></svg>'; }
  function iconMoon() { return '<svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path></svg>'; }
  function socialIcons() {
    var items = [
      { label: "X", path: "M4 4l16 16M20 4L4 20" },
      { label: "GitHub", path: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.1 3.1 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5 5 0 0 0-1.3-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.6 1.3a12.3 12.3 0 0 0-6.6 0C7.1 1.5 6 1.8 6 1.8a4.7 4.7 0 0 0-.1 3.5A5 5 0 0 0 4.6 8.8c0 5 3 6.3 6 6.6a3.1 3.1 0 0 0-.9 2.4V22" },
      { label: "LinkedIn", path: "M4 4h16v16H4zM8 10v6M8 7v.01M12 16v-3.5a2.5 2.5 0 0 1 5 0V16M12 10v6" },
      { label: "RSS", path: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M5 19a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" }
    ];
    return items.map(function (i) {
      return '<a class="btn-icon" href="#" aria-label="Signal on ' + i.label + '" onclick="return false;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + i.path + '"></path></svg></a>';
    }).join("");
  }

  /* ---------- Card builder (used for injected grids: latest, related, search) ---------- */
  function cardHTML(p, root) {
    return (
      '<article class="card" data-cat="' + p.category + '" data-category="' + p.category + '">' +
      '<a class="card-media" href="' + root + "pages/" + p.slug + '.html" tabindex="-1" aria-hidden="true">' +
      '<img src="' + p.image + '" alt="" loading="lazy" width="480" height="300">' +
      '<span class="card-cat-badge">' + p.category + "</span></a>" +
      '<div class="card-body">' +
      '<div class="dispatch"><span class="dot"></span><span>' + p.readTime + "</span><span class=\"sep\">\u00B7</span><span>" + fmtDate(p.date) + "</span></div>" +
      '<h3><a href="' + root + "pages/" + p.slug + '.html">' + p.title + "</a></h3>" +
      '<p class="card-excerpt">' + p.excerpt + "</p>" +
      '<div class="card-foot"><div class="card-author"><img src="https://i.pravatar.cc/48?u=' + encodeURIComponent(p.author) + '" alt="" loading="lazy" width="24" height="24">' + p.author + "</div>" +
      '<a class="btn-text" href="' + root + "pages/" + p.slug + '.html">Read</a></div>' +
      "</div></article>"
    );
  }
  window.SIGNAL.cardHTML = cardHTML;

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    window.SIGNAL.ready.then(initPage);
  });

  function initPage() {
    var body = document.body;
    var root = body.getAttribute("data-root") || "./";
    var activePage = body.getAttribute("data-page") || "";
    var excludeSlug = body.getAttribute("data-slug") || "";

    var headerEl = document.getElementById("site-header");
    var footerEl = document.getElementById("site-footer");
    var sidebarEl = document.getElementById("site-sidebar");

    if (headerEl) headerEl.innerHTML = headerHTML(root, activePage);
    if (footerEl) footerEl.innerHTML = footerHTML(root);
    if (sidebarEl) sidebarEl.innerHTML = sidebarHTML(root, excludeSlug);

    /* Theme toggle */
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    /* Mobile menu */
    var hamburger = document.getElementById("hamburger");
    var mobileNav = document.getElementById("mobile-nav");
    if (hamburger && mobileNav) {
      hamburger.addEventListener("click", function () {
        var open = mobileNav.classList.toggle("open");
        hamburger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    /* Search overlay */
    var searchOpenBtn = document.getElementById("search-open");
    var searchCloseBtn = document.getElementById("search-close");
    var searchOverlay = document.getElementById("search-overlay");
    var searchInput = document.getElementById("search-input");
    var searchResults = document.getElementById("search-results");

    function runSearch(query) {
      query = query.trim().toLowerCase();
      if (!query) { searchResults.innerHTML = ""; return; }
      var matches = POSTS.filter(function (p) {
        var hay = (p.title + " " + p.excerpt + " " + p.category + " " + p.tags.join(" ")).toLowerCase();
        return hay.indexOf(query) !== -1;
      });
      if (!matches.length) {
        searchResults.innerHTML = '<div class="search-empty">No articles match \u201C' + query + '\u201D. Try a different keyword.</div>';
        return;
      }
      searchResults.innerHTML = matches.map(function (p) {
        return '<a class="search-result-item" href="' + root + "pages/" + p.slug + '.html">' +
          '<img src="' + p.image + '" alt="" loading="lazy" width="56" height="56">' +
          '<span><span class="srt">' + p.title + '</span><span class="src">' + p.category + " \u00B7 " + p.readTime + "</span></span></a>";
      }).join("");
    }

    if (searchOpenBtn && searchOverlay) {
      searchOpenBtn.addEventListener("click", function () {
        searchOverlay.classList.add("open");
        setTimeout(function () { searchInput.focus(); }, 50);
      });
    }
    if (searchCloseBtn && searchOverlay) {
      searchCloseBtn.addEventListener("click", function () { searchOverlay.classList.remove("open"); });
    }
    if (searchOverlay) {
      searchOverlay.addEventListener("click", function (e) {
        if (e.target === searchOverlay) searchOverlay.classList.remove("open");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") searchOverlay.classList.remove("open");
      });
    }
    if (searchInput) searchInput.addEventListener("input", function () { runSearch(searchInput.value); });

    /* Sidebar quick search: routes to homepage search overlay via query param */
    var sidebarForm = document.getElementById("sidebar-search-form");
    if (sidebarForm) {
      sidebarForm.addEventListener("submit", function () {
        var val = document.getElementById("sidebar-search-input").value;
        window.location.href = root + "index.html?q=" + encodeURIComponent(val) + "#latest";
      });
    }

    /* If arriving with ?q= param, open search overlay pre-filled */
    var params = new URLSearchParams(window.location.search);
    if (params.get("q") && searchOverlay && searchInput) {
      searchInput.value = params.get("q");
      searchOverlay.classList.add("open");
      runSearch(params.get("q"));
    }

    /* Category filter chips (homepage) */
    var filterBar = document.querySelector(".filter-bar");
    var postGrid = document.querySelector("[data-filter-target]");
    if (filterBar && postGrid) {
      filterBar.addEventListener("click", function (e) {
        var chip = e.target.closest(".filter-chip");
        if (!chip) return;
        filterBar.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var cat = chip.getAttribute("data-filter");
        var cards = postGrid.querySelectorAll(".card");
        var visibleCount = 0;
        cards.forEach(function (card) {
          var show = cat === "All" || card.getAttribute("data-category") === cat;
          card.style.display = show ? "" : "none";
          if (show) visibleCount++;
        });
        var emptyState = document.getElementById("filter-empty");
        if (emptyState) emptyState.style.display = visibleCount === 0 ? "block" : "none";
      });
    }

    /* Newsletter fake-submit success states */
    document.querySelectorAll(".nl-form, .newsletter-form-row, .footer-newsletter").forEach(function (form) {
      if (form.tagName !== "FORM") return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var successEl = form.querySelector(".form-success");
        if (successEl) { successEl.classList.add("show"); }
        else {
          var input = form.querySelector('input[type="email"]');
          if (input) input.value = "";
          form.setAttribute("data-submitted", "true");
        }
        form.reset();
      });
    });

    /* Contact form fake-submit */
    var contactForm = document.getElementById("contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var status = document.getElementById("contact-status");
        if (status) { status.textContent = "Thanks for reaching out \u2014 we\u2019ll reply within two business days."; status.style.color = "var(--success)"; }
        contactForm.reset();
      });
    }

    /* Populate any data-inject grids (used on index.html for latest/featured/popular/related) */
    document.querySelectorAll("[data-inject]").forEach(function (el) {
      var mode = el.getAttribute("data-inject");
      var list = [];
      if (mode === "latest") {
        list = POSTS.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      } else if (mode === "popular") {
        list = POSTS.filter(function (p) { return p.popular; });
      } else if (mode === "featured") {
        list = POSTS.filter(function (p) { return p.featured; });
      } else if (mode === "related") {
        var relCat = el.getAttribute("data-category") || (body.getAttribute("data-category") || "");
        list = POSTS.filter(function (p) { return p.category === relCat && p.slug !== excludeSlug; });
        if (!list.length) {
          list = POSTS.filter(function (p) { return p.slug !== excludeSlug; })
            .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        }
      }
      var limit = parseInt(el.getAttribute("data-limit") || "100", 10);
      el.innerHTML = list.slice(0, limit).map(function (p) { return cardHTML(p, root); }).join("");
    });
  }
})();
