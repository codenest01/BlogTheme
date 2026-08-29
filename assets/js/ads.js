/* ==========================================================================
   SIGNAL — ad slot injector.
   Ad codes (raw HTML/JS snippets, e.g. AdSense or any network's <script>
   embed tag) live in /assets/data/ads.json and are edited from /admin
   (Ads tab). This file reads that JSON and drops each snippet into a
   labeled slot on every page:

     top       -> directly above the page's <h1> (top of title)
     in_1      -> inside the article body, about a third of the way down
     in_2      -> inside the article body, about two thirds of the way down
     sidebar   -> inside the sidebar widgets column
     sticky    -> fixed bar pinned to the bottom of the viewport (all pages)
     bottom_1  -> article only: first ad at the bottom of the article
     bottom_2  -> article only: second ad at the bottom, fixed/pinned so it
                  stays visible while the page is scrolled up or down
     top_right -> fixed ad pinned to the top-right corner of every page

   Between bottom_1 and bottom_2, every article also gets an automatic
   "continue" countdown timer (see buildContinueTimer below). Its target
   link and countdown length are set from the admin Ads tab (timer_url /
   timer_seconds in ads.json) — nothing is hardcoded per article.

   No slot renders if its code is empty, so you can turn any slot off just
   by clearing that field in the admin panel. This runs on every page
   except /admin itself.
   ========================================================================== */

(function () {
  "use strict";

  var scriptEl = document.currentScript;
  var dataRoot = "./";
  if (scriptEl) {
    var src = scriptEl.getAttribute("src") || "";
    dataRoot = src.replace(/assets\/js\/ads\.js.*$/, "");
  }

  /* Assigning raw markup via innerHTML does not execute <script> tags.
     Rebuild and re-insert each script node so ad network embed codes
     (which are almost always a <script> tag) actually run. */
  function injectAdHTML(container, rawHtml) {
    if (!container || !rawHtml) return;
    container.innerHTML = rawHtml;
    var scripts = Array.prototype.slice.call(container.querySelectorAll("script"));
    scripts.forEach(function (oldScript) {
      var newScript = document.createElement("script");
      Array.prototype.forEach.call(oldScript.attributes, function (attr) {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.text = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  function makeSlot(id) {
    var wrap = document.createElement("div");
    wrap.className = "ad-slot ad-slot-" + id;
    wrap.setAttribute("data-ad-slot", id);
    wrap.innerHTML = '<span class="ad-slot-label">Advertisement</span><div class="ad-slot-body"></div>';
    return wrap;
  }

  function placeTopAd(code) {
    if (!code) return;
    var main = document.getElementById("main");
    if (!main) return;
    var h1 = main.querySelector("h1");
    var target = h1 ? h1.closest(".container") || h1 : main.querySelector(".container") || main.firstElementChild;
    if (!target || !target.parentNode) return;
    var slot = makeSlot("top");
    target.parentNode.insertBefore(slot, target);
    injectAdHTML(slot.querySelector(".ad-slot-body"), code);
  }

  function placeInContentAds(code1, code2) {
    var body = document.querySelector(".article-body");
    if (!body) return;
    var children = Array.prototype.filter.call(body.children, function (el) {
      return el.tagName !== "SCRIPT";
    });
    if (!children.length) return;

    var jobs = [];
    if (code1) jobs.push({ frac: 1 / 3, code: code1, id: "in-1" });
    if (code2) jobs.push({ frac: 2 / 3, code: code2, id: "in-2" });
    /* Insert the later slot first so earlier indices stay valid. */
    jobs.sort(function (a, b) { return b.frac - a.frac; });

    jobs.forEach(function (job) {
      var idx = Math.min(children.length - 1, Math.max(0, Math.floor(children.length * job.frac)));
      var refNode = children[idx];
      var slot = makeSlot(job.id);
      refNode.parentNode.insertBefore(slot, refNode.nextSibling);
      injectAdHTML(slot.querySelector(".ad-slot-body"), job.code);
    });
  }

  function placeSidebarAd(code) {
    if (!code) return;
    var slot = makeSlot("sidebar");
    slot.classList.add("ad-slot-fixed-right");
    document.body.appendChild(slot);
    injectAdHTML(slot.querySelector(".ad-slot-body"), code);
  }
function placeStickyAd(code) {
    if (!code) return;
    var bar = document.createElement("div");
    bar.className = "ad-slot ad-slot-fixed-bottom";
    bar.innerHTML =
      '<span class="ad-slot-label">Advertisement</span>' +
      '<div class="ad-slot-body"></div>';
    document.body.appendChild(bar);
    injectAdHTML(bar.querySelector(".ad-slot-body"), code);
  }

  /* ------------------------------------------------------------------
     NEW: "Continue" countdown timer (extracted from the download-gate
     widget that used to be hand-pasted into a single article, now
     generalized so every article gets one automatically). Redirect URL
     and countdown length come from ads.json (set in /admin -> Ads).
     Namespaced ids/classes (sig-*) so this never collides with any
     older, manually-pasted copy of the widget still living in an
     individual article's own content.
     ------------------------------------------------------------------ */
  function buildContinueTimer(url, seconds) {
    var totalTime = parseInt(seconds, 10);
    if (!totalTime || totalTime < 1) totalTime = 30;
    var targetUrl = url && String(url).trim() ? String(url).trim() : (dataRoot + "index.html");

    var wrap = document.createElement("section");
    wrap.className = "sig-download-gate";
    wrap.setAttribute("id", "sig-download-gate");
    wrap.innerHTML =
      '<div class="sig-download-gate-inner">' +
        '<div class="sig-download-icon" aria-hidden="true">\u2193</div>' +
        '<h2>Continue to the next page</h2>' +
        '<p class="sig-download-message">Please wait while we prepare your next page.</p>' +
        '<div class="sig-download-timer" aria-live="polite"><span id="sig-download-countdown">' + totalTime + '</span></div>' +
        '<p class="sig-timer-label">Please wait for the timer to finish to continue.</p>' +
        '<div class="sig-download-progress"><span id="sig-download-progress-bar"></span></div>' +
        '<button id="sig-continue-download" class="sig-continue-button" type="button" disabled aria-disabled="true">Continue</button>' +
        '<p class="sig-download-note">Your next page will open automatically when you click Continue.</p>' +
      '</div>';

    var countdown = wrap.querySelector("#sig-download-countdown");
    var progress = wrap.querySelector("#sig-download-progress-bar");
    var button = wrap.querySelector("#sig-continue-download");

    var remaining = totalTime;
    var timer = setInterval(function () {
      remaining--;
      countdown.textContent = remaining;
      var completed = ((totalTime - remaining) / totalTime) * 100;
      progress.style.width = completed + "%";

      if (remaining <= 0) {
        clearInterval(timer);
        countdown.textContent = "\u2713";
        progress.style.width = "100%";
        button.disabled = false;
        button.setAttribute("aria-disabled", "false");
        button.onclick = function () {
          window.location.href = targetUrl;
        };
      }
    }, 1000);

    return wrap;
  }

  /* Article only: ad, timer, ad — stacked at the bottom of the article
     body. The second ad is pinned (position: fixed) so it stays on
     screen no matter how far the page is scrolled. */
  function placeBottomAdsAndTimer(code1, code2, timerUrl, timerSeconds) {
    if (document.body.getAttribute("data-page") !== "article") return;
    var articleBody = document.querySelector(".article-body");
    if (!articleBody || !articleBody.parentNode) return;

    var group = document.createElement("div");
    group.className = "ad-article-bottom-group";

    if (code1) {
      var slot1 = makeSlot("bottom-1");
      group.appendChild(slot1);
    }

    group.appendChild(buildContinueTimer(timerUrl, timerSeconds));
    articleBody.parentNode.insertBefore(group, articleBody.nextSibling);

    if (code1) {
      injectAdHTML(group.querySelector('[data-ad-slot="bottom-1"] .ad-slot-body'), code1);
    }

    if (code2) {
      var slot2 = makeSlot("bottom-2");
      slot2.classList.add("ad-slot-fixed-bottom", "ad-slot-article-bottom-fixed");
      document.body.appendChild(slot2);
      injectAdHTML(slot2.querySelector(".ad-slot-body"), code2);
      document.body.classList.add("has-article-bottom-fixed-ad");

      /* If the site-wide sticky bottom bar is also showing, stack this
         one directly above it instead of covering it. */
      requestAnimationFrame(function () {
        var globalSticky = document.querySelector(".ad-slot-fixed-bottom:not(.ad-slot-article-bottom-fixed)");
        var offset = globalSticky ? globalSticky.getBoundingClientRect().height : 0;
        slot2.style.setProperty("--sig-bottom-offset", offset + "px");
        document.body.style.paddingBottom = (offset + slot2.getBoundingClientRect().height) + "px";
      });
    }
  }

  /* New: sticky ad pinned to the top-right corner, every page. */
  function placeTopRightAd(code) {
    if (!code) return;
    var slot = makeSlot("top-right");
    slot.classList.add("ad-slot-fixed-top-right");
    document.body.appendChild(slot);
    injectAdHTML(slot.querySelector(".ad-slot-body"), code);
  }

  function run(data) {
    data = data || {};
    placeTopAd(data.top);
    placeInContentAds(data.in_1, data.in_2);
    placeSidebarAd(data.sidebar);
    placeStickyAd(data.sticky);
    placeBottomAdsAndTimer(data.bottom_1, data.bottom_2, data.timer_url, data.timer_seconds);
    placeTopRightAd(data.top_right);
  }

  function init() {
    if (document.body.getAttribute("data-page") === "admin") return;
    fetch(dataRoot + "assets/data/ads.json", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : {}; })
      .catch(function () { return {}; })
      .then(run);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
