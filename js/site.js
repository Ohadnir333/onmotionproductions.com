/* ON Motion Productions — site behaviour (no dependencies) */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var ICONS = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>'
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- starting muted videos ---------- */

  // iPhones in Low Power Mode (and some browsers) refuse to start videos on their own;
  // those wait here and start on the visitor's next tap
  var blocked = [];
  function tryPlay(v) {
    var p = v.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err && err.name === "NotAllowedError" && blocked.indexOf(v) < 0) blocked.push(v);
      });
    }
  }
  function unblock() {
    var list = blocked;
    blocked = [];
    list.forEach(function (v) { if (v.dataset.want !== "0") tryPlay(v); });
  }
  function want(v, on) {
    v.dataset.want = on ? "1" : "0";
    if (on) tryPlay(v); else v.pause();
  }
  document.addEventListener("touchend", unblock, { passive: true });
  document.addEventListener("click", unblock, true);

  function youtubeSrc(id) {
    return "https://www.youtube.com/embed/" + encodeURIComponent(id) +
      "?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white&origin=" +
      encodeURIComponent(window.location.origin);
  }

  /* ---------- header ---------- */

  var header = $("[data-header]");
  if (header) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      // full stacked logo at the top of the page, compact bar with just the mark once scrolling
      header.classList.toggle("is-compact", y > 40);
      var hide = y > lastY && y > 500 && !doc.classList.contains("menu-open");
      header.classList.toggle("is-hidden", hide);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var toggle = $(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = !doc.classList.contains("menu-open");
      doc.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { doc.classList.remove("menu-open"); });
    });
  }

  /* ---------- hero: category words swap the background film ---------- */

  var hero = $("[data-hero]");
  if (hero) {
    var videos = {};
    $$("[data-hero-video]", hero).forEach(function (v) { videos[v.dataset.heroVideo] = v; });
    var current = "reel";
    var main = videos.reel;

    if (reduceMotion && main) {
      main.removeAttribute("autoplay");
      main.pause();
    } else if (main) {
      tryPlay(main);
    }

    // a hero item is one film, or (social) a row of vertical clips
    var clipsOf = function (el) { return el.tagName === "VIDEO" ? [el] : $$("video", el); };
    var show = function (key) {
      if (!videos[key] || key === current || reduceMotion || paused) return;
      var next = videos[key];
      clipsOf(next).forEach(function (v) {
        if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
        v.currentTime = 0;
        tryPlay(v);
      });
      next.classList.add("is-active");
      var prev = videos[current];
      prev.classList.remove("is-active");
      if (current !== "reel") setTimeout(function () { clipsOf(prev).forEach(function (v) { v.pause(); }); }, 700);
      current = key;
    };

    var pauseBtn = $("[data-hero-pause]", hero);
    var paused = reduceMotion;
    var setPaused = function (p) {
      paused = p;
      pauseBtn.setAttribute("aria-pressed", String(p));
      pauseBtn.setAttribute("aria-label", p ? "Play background video" : "Pause background video");
      if (!videos[current]) return;
      clipsOf(videos[current]).forEach(function (v) { if (p) v.pause(); else tryPlay(v); });
    };
    if (pauseBtn) {
      if (paused) pauseBtn.setAttribute("aria-pressed", "true");
      pauseBtn.addEventListener("click", function () { setPaused(!paused); });
    }

    if (finePointer) {
      // the category links live in the header (wide screens) and in the hero bar (smaller screens)
      $$("[data-hero-target]").forEach(function (a) {
        a.addEventListener("mouseenter", function () { if (window.scrollY < window.innerHeight * 0.6) show(a.dataset.heroTarget); });
        a.addEventListener("focus", function () { if (window.scrollY < window.innerHeight * 0.6) show(a.dataset.heroTarget); });
      });
      $$(".header-cats, .hero-cats").forEach(function (list) {
        list.addEventListener("mouseleave", function () { show("reel"); });
      });
    }
  }

  /* ---------- work grid: filter tabs + hover previews ---------- */

  $$("[data-filter]").forEach(function (tabs) {
    var grid = document.getElementById(tabs.dataset.filter);
    if (!grid) return;
    var cards = $$(".card", grid);
    $$("[data-filter-btn]", tabs).forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var cat = btn.dataset.filterBtn;
        $$("[data-filter-btn]", tabs).forEach(function (b) { b.setAttribute("aria-current", String(b === btn)); });
        $$(".index-row", grid.parentNode).forEach(function (row) {
          row.hidden = !(cat === "all" || row.dataset.cat === cat);
        });
        cards.forEach(function (card) {
          var match = cat === "all" || card.dataset.cat === cat;
          if (match) {
            card.hidden = false;
            void card.offsetWidth; // apply the hidden state first so the fade-in runs
            card.classList.remove("is-leaving");
          } else {
            card.classList.add("is-leaving");
            card.hidden = true;
          }
        });
      });
    });
  });

  if (finePointer && !reduceMotion) {
    $$(".card[data-preview]").forEach(function (card) {
      var media = $(".card-media", card);
      var video = null;
      var link = $("a", card);
      link.addEventListener("mouseenter", function () {
        if (!video) {
          video = document.createElement("video");
          video.muted = true; video.loop = true; video.playsInline = true;
          video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
          video.preload = "auto";
          video.src = card.dataset.preview;
          media.appendChild(video);
        }
        var p = video.play();
        if (p && p.then) p.then(function () { card.classList.add("is-previewing"); }).catch(function () {});
      });
      link.addEventListener("mouseleave", function () {
        card.classList.remove("is-previewing");
        if (video) setTimeout(function () { if (!card.classList.contains("is-previewing")) video.pause(); }, 400);
      });
    });
  }

  if (!finePointer && !reduceMotion && "IntersectionObserver" in window && $$(".card[data-preview]").length) {
    var seen = new Map();
    var liveCard = null;
    var cardVideo = function (card) {
      var box = $(".card-media", card);
      var v = $("video", box);
      if (!v) {
        v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
        v.preload = "auto";
        v.addEventListener("playing", function () { if (liveCard === card) card.classList.add("is-previewing"); });
        v.src = card.dataset.preview;
        box.appendChild(v);
      }
      return v;
    };
    var pickCard = function () {
      var best = null, bestD = Infinity, mid = window.innerHeight / 2;
      seen.forEach(function (ratio, card) {
        if (ratio < 0.7 || card.hidden || !card.offsetParent) return;
        var b = card.getBoundingClientRect();
        var d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestD) { bestD = d; best = card; }
      });
      if (best === liveCard) return;
      if (liveCard) {
        liveCard.classList.remove("is-previewing");
        var old = $("video", liveCard);
        if (old) want(old, false);
      }
      liveCard = best;
      if (best) want(cardVideo(best), true);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen.set(en.target, en.intersectionRatio); });
      pickCard();
    }, { threshold: [0, 0.35, 0.7, 1] });
    $$(".card[data-preview]").forEach(function (c) { cio.observe(c); });
    var settle = 0;
    window.addEventListener("scroll", function () { clearTimeout(settle); settle = setTimeout(pickCard, 120); }, { passive: true });
  }

  /* ---------- hover-to-play: category tiles and "behind the shot" pairs ---------- */

  var diptychs = $$("[data-hover-play]");
  if (diptychs.length && !reduceMotion) {
    var startPair = function (fig) {
      $$("video", fig).forEach(function (v) {
        if (!v.getAttribute("src")) {
          v.muted = true;
          v.addEventListener("playing", function () { v.classList.add("is-ready"); });
          v.src = v.dataset.src;
        }
        want(v, true);
      });
      fig.classList.add("is-playing");
    };
    var stopPair = function (fig) {
      fig.classList.remove("is-playing");
      $$("video", fig).forEach(function (v) { want(v, false); });
    };
    if (finePointer) {
      diptychs.forEach(function (fig) {
        fig.addEventListener("mouseenter", function () { startPair(fig); });
        fig.addEventListener("mouseleave", function () { stopPair(fig); });
      });
    } else if ("IntersectionObserver" in window) {
      // phones have no hover: a pair plays while at least half of it is on screen
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.intersectionRatio >= 0.5) startPair(en.target); else stopPair(en.target); });
      }, { threshold: [0, 0.5, 1] });
      diptychs.forEach(function (fig) { pio.observe(fig); });
    }
  }

  /* ---------- "watch next" scroller ---------- */

  $$("[data-scroller]").forEach(function (sc) {
    var section = sc.closest("section");
    var buttons = $$("[data-scroll]", section);
    var update = function () {
      var max = sc.scrollWidth - sc.clientWidth - 2;
      buttons.forEach(function (b) {
        var dir = Number(b.dataset.scroll);
        b.disabled = dir < 0 ? sc.scrollLeft <= 2 : sc.scrollLeft >= max;
      });
    };
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        sc.scrollBy({ left: Number(b.dataset.scroll) * sc.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
    sc.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---------- players ---------- */

  $$("[data-player]").forEach(function (player) {
    var btn = $(".player-btn", player);
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (player.dataset.youtube) {
        var iframe = document.createElement("iframe");
        iframe.src = youtubeSrc(player.dataset.youtube);
        iframe.title = player.dataset.title || "Video";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        player.appendChild(iframe);
      } else if (player.dataset.video) {
        var v = document.createElement("video");
        v.src = player.dataset.video;
        v.controls = true; v.playsInline = true; v.autoplay = true;
        player.appendChild(v);
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
      player.classList.add("is-playing");
      $$("video.player-loop", player).forEach(function (v) { v.pause(); });
    });
  });

  var reels = $$("[data-reel]");
  var loud = null;
  var quiet = function (reel) {
    var v = $("video", reel);
    v.muted = true; v.loop = true;
    reel.classList.remove("is-playing");
  };
  reels.forEach(function (reel) {
    var v = $("video", reel);
    var btn = $(".reel-btn", reel);
    btn.addEventListener("click", function () {
      if (loud === reel && !v.paused) {
        quiet(reel); loud = null;
        if (reduceMotion) v.pause();
        return;
      }
      if (loud && loud !== reel) { quiet(loud); if (reduceMotion) $("video", loud).pause(); }
      loud = reel;
      v.loop = false; v.muted = false; v.currentTime = 0;
      v.play();
      reel.classList.add("is-playing");
    });
    v.addEventListener("ended", function () { quiet(reel); loud = null; if (!reduceMotion) tryPlay(v); });
  });
  if (reels.length && !reduceMotion && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var reel = en.target, v = $("video", reel);
        if (reel === loud) return;
        if (en.intersectionRatio >= 0.5) want(v, true); else want(v, false);
      });
    }, { threshold: [0, 0.5, 1] });
    reels.forEach(function (r) { rio.observe(r); });
  }

  /* ---------- overlay (lightbox + video modal) ---------- */

  var overlay = null;
  var stage, counter, nav, items = [], index = 0, lastFocus = null;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Viewer");
    overlay.innerHTML =
      '<div class="overlay-bar"><span class="overlay-count"></span>' +
      '<button class="overlay-close" type="button" aria-label="Close">' + ICONS.close + "</button></div>" +
      '<div class="overlay-stage"></div>' +
      '<div class="overlay-nav"><button type="button" data-dir="-1" aria-label="Previous">' + ICONS.prev +
      '</button><button type="button" data-dir="1" aria-label="Next">' + ICONS.next + "</button></div>";
    document.body.appendChild(overlay);
    stage = $(".overlay-stage", overlay);
    counter = $(".overlay-count", overlay);
    nav = $(".overlay-nav", overlay);
    $(".overlay-close", overlay).addEventListener("click", closeOverlay);
    $$(".overlay-nav button", overlay).forEach(function (b) {
      b.addEventListener("click", function () { step(Number(b.dataset.dir)); });
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === stage) closeOverlay();
    });
    var x0 = null;
    stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") closeOverlay();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
  }

  function openOverlay() {
    if (!overlay) buildOverlay();
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    doc.style.overflow = "hidden";
    $(".overlay-close", overlay).focus();
  }

  function closeOverlay() {
    overlay.classList.remove("is-open");
    doc.style.overflow = "";
    stage.innerHTML = "";
    if (lastFocus) lastFocus.focus();
  }

  function render() {
    var it = items[index];
    stage.innerHTML = "";
    var img = new Image();
    img.src = it.src;
    img.alt = it.alt || "";
    stage.appendChild(img);
    counter.textContent = (index + 1) + " / " + items.length;
    nav.style.display = items.length > 1 ? "" : "none";
    var nxt = items[(index + 1) % items.length];
    if (nxt) { var pre = new Image(); pre.src = nxt.src; }
  }

  function step(dir) {
    if (!items.length) return;
    index = (index + dir + items.length) % items.length;
    render();
  }

  $$("[data-gallery]").forEach(function (gallery) {
    var buttons = $$("[data-full]", gallery);
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () {
        items = buttons.map(function (x) { return { src: x.dataset.full, alt: $("img", x).alt }; });
        index = i;
        openOverlay();
        render();
      });
    });
  });

  $$("[data-video-modal]").forEach(function (b) {
    b.addEventListener("click", function () {
      openOverlay();
      items = [];
      nav.style.display = "none";
      counter.textContent = b.dataset.title || "";
      stage.innerHTML = '<div class="modal-video"><iframe title="' + (b.dataset.title || "Video") +
        '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" src="' +
        youtubeSrc(b.dataset.videoModal) + '"></iframe></div>';
    });
  });

  /* ---------- contact form ---------- */

  var form = $("[data-contact-form]");
  if (form) {
    var status = $(".form-status", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector('[name="_gotcha"]').value) return;
      var data = new FormData(form);
      var endpoint = form.getAttribute("action");
      var to = form.dataset.mailto;
      if (!endpoint || endpoint === "#") {
        var body = "Name: " + data.get("name") + "\nEmail: " + data.get("email") +
          "\nCompany: " + (data.get("company") || "-") + "\nProject: " + data.get("type") +
          "\n\n" + data.get("message");
        window.location.href = "mailto:" + to + "?subject=" +
          encodeURIComponent("New project — " + data.get("name")) + "&body=" + encodeURIComponent(body);
        status.textContent = "Opening your email app…";
        return;
      }
      status.textContent = "Sending…";
      status.classList.remove("is-ok");
      fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          form.reset();
          status.textContent = "Thank you — we'll get back to you within a day or two.";
          status.classList.add("is-ok");
        })
        .catch(function () {
          status.textContent = "Something went wrong. Please email us directly at " + to + ".";
        });
    });
  }

  /* ---------- grid / index views ---------- */

  $$("[data-view-root]").forEach(function (root) {
    var section = root.closest("section");
    var gridEl = $(".grid", root);
    var indexEl = $("[data-index]", root);
    var btns = $$("[data-view]", section);
    var setView = function (v) {
      gridEl.hidden = v === "index";
      indexEl.hidden = v !== "index";
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === v)); });
      try { localStorage.setItem("onm-view", v); } catch (e) {}
    };
    btns.forEach(function (b) { b.addEventListener("click", function () { setView(b.dataset.view); }); });
    var saved = null;
    try { saved = localStorage.getItem("onm-view"); } catch (e) {}
    if (saved === "index") setView("index");
  });

  // in the index, a preview of the film follows the cursor (under the type)
  if (finePointer && $$(".index-row").length) {
    var pv = document.createElement("div");
    pv.className = "ix-preview";
    pv.innerHTML = '<img alt=""><video muted loop playsinline></video>';
    document.body.appendChild(pv);
    var pimg = $("img", pv), pvid = $("video", pv);
    pvid.muted = true;
    var tx = 0, ty = 0, px = 0, py = 0, running = false;
    var follow = function () {
      px += (tx - px) * 0.16; py += (ty - py) * 0.16;
      pv.style.left = px + "px"; pv.style.top = py + "px";
      if (running) requestAnimationFrame(follow);
    };
    var aim = function (e) {
      var w = pv.offsetWidth || 340;
      tx = Math.min(window.innerWidth - w / 2 - 16, e.clientX + w * 0.62);
      ty = e.clientY;
    };
    $$(".index-row").forEach(function (row) {
      var a = $("a", row);
      a.addEventListener("mouseenter", function (e) {
        pv.classList.toggle("is-vertical", row.classList.contains("is-vertical"));
        pimg.src = row.dataset.poster || "";
        if (row.dataset.preview && !reduceMotion) { pvid.src = row.dataset.preview; tryPlay(pvid); }
        else pvid.removeAttribute("src");
        aim(e);
        if (!running) { px = tx; py = ty; running = true; requestAnimationFrame(follow); }
        pv.classList.add("is-on");
      });
      a.addEventListener("mousemove", aim);
      a.addEventListener("mouseleave", function () { pv.classList.remove("is-on"); pvid.pause(); running = false; });
    });
  }

  /* ---------- films that loop on their own: category headers, project players ---------- */

  $$(".cat-hero-video, .cat-hero-strip video").forEach(function (v) {
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); } else tryPlay(v);
  });
  $$(".player-loop").forEach(function (v) {
    var player = v.closest(".player");
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.addEventListener("playing", function () { v.classList.add("is-ready"); });
    tryPlay(v);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (player.classList.contains("is-playing")) return;
          if (en.isIntersecting) tryPlay(v); else v.pause();
        });
      }).observe(player);
    }
  });

  // a skipped page transition (fast clicks, hidden tab) is not an error
  ["pageswap", "pagereveal"].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (e.viewTransition) {
        e.viewTransition.ready.catch(function () {});
        e.viewTransition.finished.catch(function () {});
      }
    });
  });

  /* ---------- reveal on scroll ---------- */

  var reveal = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveal.forEach(function (el) {
      // anything already on screen at load shows at once; only content below the fold animates
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) el.classList.remove("reveal");
      else io.observe(el);
    });
  } else {
    reveal.forEach(function (el) { el.classList.add("is-in"); });
  }
})();

/* phones only, once: "Made for the big screen" with a share button */
(function () {
  var bar = document.querySelector("[data-bigscreen]");
  if (!bar || !window.matchMedia("(max-width: 760px) and (pointer: coarse)").matches) return;
  var KEY = "onm-bigscreen";
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}
  var close = function () {
    bar.classList.remove("is-on");
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    setTimeout(function () { bar.hidden = true; }, 500);
  };
  bar.hidden = false;
  setTimeout(function () { bar.classList.add("is-on"); }, 2500);
  bar.querySelector("[data-bigscreen-close]").addEventListener("click", close);
  var share = bar.querySelector("[data-bigscreen-share]");
  share.addEventListener("click", function () {
    var url = location.origin + location.pathname;
    if (navigator.share) {
      navigator.share({ title: document.title, text: "Watch on a big screen", url: url }).then(close, function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { share.textContent = "Link copied"; setTimeout(close, 1400); });
    }
  });
})();
