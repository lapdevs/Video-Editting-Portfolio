/* =========================================================================
   Dark studio portfolio — interactions
   1. Sticky header state
   2. Mobile navigation
   3. Smooth in-page scrolling
   4. Hero timeline timecode
   5. Work lightbox ("Preview" window)
   6. Clipboard + Discord handle
   7. Contact form
   8. Work thumbnail fallback
   ========================================================================= */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const header = document.getElementById("site-header");
  const nav = document.getElementById("site-nav");
  const navToggle = document.querySelector(".nav-toggle");

  /* 1. Sticky header ------------------------------------------------------ */

  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  /* 2. Mobile navigation -------------------------------------------------- */

  const setNav = (open) => {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setNav(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      setNav(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 640) setNav(false);
    });
  }

  /* 3. Smooth in-page scrolling ------------------------------------------- */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");

      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      setNav(false);

      const offset = header ? header.offsetHeight + 8 : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  /* 4. Hero timeline timecode --------------------------------------------- */

  const timecode = document.getElementById("timecode");

  if (timecode && !prefersReducedMotion) {
    const FPS = 24;
    const pad = (value) => String(value).padStart(2, "0");
    let frames = 14 * FPS + 8;

    const renderTimecode = () => {
      const f = frames % FPS;
      const totalSeconds = Math.floor(frames / FPS);
      const s = totalSeconds % 60;
      const m = Math.floor(totalSeconds / 60) % 60;
      const h = Math.floor(totalSeconds / 3600) % 24;

      timecode.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    };

    renderTimecode();

    window.setInterval(() => {
      frames += 2;
      renderTimecode();
    }, 1000 / 12);
  }

  /* 5. Work lightbox ------------------------------------------------------ */

  const lightbox = document.getElementById("lightbox");
  const player = document.getElementById("lightbox-player");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxMeta = document.getElementById("lightbox-meta");
  const lightboxLink = document.getElementById("lightbox-link");
  const closeButton = lightbox
    ? lightbox.querySelector(".lightbox__close")
    : null;

  let lastFocused = null;

  const closeLightbox = () => {
    if (!lightbox || lightbox.hidden) return;

    lightbox.hidden = true;
    document.body.classList.remove("is-locked");

    if (player) player.innerHTML = "";
    if (lastFocused instanceof HTMLElement) lastFocused.focus();

    lastFocused = null;
  };

  const openLightbox = (card) => {
    if (!lightbox || !player) return;

    const videoId = card.dataset.video;
    if (!videoId) return;

    const title = card.dataset.title || "Project";
    const meta = card.dataset.meta || "Preview";

    if (lightboxTitle) lightboxTitle.textContent = `Preview — ${title}`;
    if (lightboxMeta) lightboxMeta.textContent = meta;

    // Direct fallback if the embed is blocked (e.g. opened from file://,
    // which strips the referrer and can trigger YouTube error 153).
    if (lightboxLink) {
      lightboxLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(
        videoId
      )}`;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        videoId
      )}?autoplay=1&rel=0&playsinline=1`
    );
    iframe.setAttribute("title", `${title} — video preview`);
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    player.innerHTML = "";
    player.appendChild(iframe);

    lastFocused = document.activeElement;
    lightbox.hidden = false;
    document.body.classList.add("is-locked");

    if (closeButton) closeButton.focus();
  };

  document.querySelectorAll(".work-card[data-video]").forEach((card) => {
    card.addEventListener("click", () => openLightbox(card));
  });

  if (lightbox) {
    lightbox.querySelectorAll("[data-lightbox-close]").forEach((el) => {
      el.addEventListener("click", closeLightbox);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (!lightbox.hidden) {
        closeLightbox();
      } else {
        setNav(false);
      }
    });

    lightbox.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;

      const focusable = lightbox.querySelectorAll(
        'button, [href], iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* 6. Clipboard + Discord handle ----------------------------------------- */

  const OWNER = "1nder";
  const DISCORD_URL = "https://discord.com/app"; // EDIT: your Discord profile or server invite

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      /* fall through to the legacy path below */
    }

    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.opacity = "0";

      document.body.appendChild(area);
      area.select();

      const copied = document.execCommand("copy");
      document.body.removeChild(area);

      return copied;
    } catch (error) {
      return false;
    }
  };

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const hint = button.querySelector(".copy-btn__hint");
    let timer = null;

    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      const copied = await copyToClipboard(value);

      if (hint) hint.textContent = copied ? "Copied!" : "Copy failed";
      button.classList.toggle("is-copied", copied);

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (hint) hint.textContent = "Copy";
        button.classList.remove("is-copied");
      }, 1800);
    });
  });

  /* 7. Contact form -------------------------------------------------------- */

  const form = document.getElementById("contact-form");
  const success = document.getElementById("form-success");

  if (form) {
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    const errorFor = (field) =>
      form.querySelector('[data-error-for="' + field.name + '"]');

    const validate = (field) => {
      const value = field.value.trim();
      let message = "";

      if (!value) {
        message = "This field is required";
      } else if (field.name === "message" && value.length < 12) {
        message = "Add a little more detail (12+ characters)";
      }

      const error = errorFor(field);

      if (message) {
        field.setAttribute("aria-invalid", "true");
        if (error) {
          error.textContent = message;
          error.hidden = false;
        }
        return false;
      }

      field.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }

      return true;
    };

    fields.forEach((field) => {
      field.addEventListener("blur", () => {
        if (field.value.trim()) validate(field);
      });

      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });

      field.addEventListener("change", () => {
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (success) {
        success.hidden = true;
        success.textContent = "";
      }

      let firstInvalid = null;

      fields.forEach((field) => {
        if (!validate(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const nameField = form.querySelector("#name");
      const messageField = form.querySelector("#message");
      const name = nameField ? nameField.value.trim() : "";
      const message = messageField ? messageField.value.trim() : "";

      const payload = `New project enquiry — ${OWNER}\n\nName: ${name}\n\n${message}`;
      const copied = await copyToClipboard(payload);

      if (!success) return;

      if (!copied) {
        success.textContent =
          "Couldn’t reach your clipboard — copy your message manually and send it on Discord.";
        success.hidden = false;
        return;
      }

      success.textContent = "Message copied! Paste it to me on Discord. ";

      const discordLink = document.createElement("a");
      discordLink.className = "form__success-link";
      discordLink.href = DISCORD_URL;
      discordLink.target = "_blank";
      discordLink.rel = "noopener noreferrer";
      discordLink.textContent = "Open Discord";

      success.appendChild(discordLink);
      success.hidden = false;

      form.reset();
      fields.forEach((field) => field.removeAttribute("aria-invalid"));
    });
  }

  /* 8. Work thumbnail fallback -------------------------------------------- */

  document.querySelectorAll(".work-card__img").forEach((img) => {
    const applyFallback = () => {
      if (img.dataset.fallbackApplied) return;

      const match = img.src.match(/\/vi\/([^/]+)\/maxresdefault\.jpg$/);
      if (!match) return;

      img.dataset.fallbackApplied = "true";
      img.src = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    };

    img.addEventListener("error", applyFallback);

    // Catch thumbnails that failed before this script ran.
    if (img.complete && img.naturalWidth === 0) applyFallback();
  });
})();
