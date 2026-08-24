(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});
  const { hexToP3Str, hexToRgbStr } = Atlas.color;

  Atlas.createPopoverController = function createPopoverController() {
    const popover = document.getElementById("colorPopover");
    const cpPreview = document.getElementById("cpPreview");
    const cpHex = document.getElementById("cpHex");
    const cpRgb = document.getElementById("cpRgb");
    const cpP3 = document.getElementById("cpP3");
    const cpRole = document.getElementById("cpRole");
    let activeSwatch = null;
    let lastFocus = null;

    function position(swatchEl) {
      const rect = swatchEl.getBoundingClientRect();
      const pw = popover.offsetWidth;
      const ph = popover.offsetHeight;
      let left = Math.max(10, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 10));
      let top = rect.top - ph - 10;
      if (top < 10) top = rect.bottom + 10;
      popover.style.left = left + "px";
      popover.style.top = top + "px";
    }

    function close() {
      if (!popover.classList.contains("visible")) return;
      popover.classList.remove("visible");
      popover.setAttribute("aria-hidden", "true");
      if (activeSwatch) {
        activeSwatch.classList.remove("active");
        activeSwatch.setAttribute("aria-expanded", "false");
      }
      activeSwatch = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
    }

    function open(swatchEl, hex, papel) {
      lastFocus = swatchEl;
      document.querySelectorAll(".swatch.active").forEach(function (s) {
        s.classList.remove("active");
        s.setAttribute("aria-expanded", "false");
      });
      swatchEl.classList.add("active");
      swatchEl.setAttribute("aria-expanded", "true");
      activeSwatch = swatchEl;
      cpPreview.style.background = hex;
      cpRole.textContent = papel || "Cor";
      cpHex.textContent = hex.toUpperCase();
      cpRgb.textContent = hexToRgbStr(hex);
      cpP3.textContent = hexToP3Str(hex);
      popover.querySelectorAll(".cp-row").forEach(function (r) { r.classList.remove("copied"); });
      popover.classList.add("visible");
      popover.setAttribute("aria-hidden", "false");
      position(swatchEl);
      const first = popover.querySelector(".cp-row");
      if (first) first.focus();
    }

    function toggle(swatchEl, hex, papel) {
      if (activeSwatch === swatchEl && popover.classList.contains("visible")) {
        close();
        return;
      }
      open(swatchEl, hex, papel);
    }

    popover.querySelectorAll(".cp-row").forEach(function (row) {
      row.addEventListener("click", function () {
        const text = row.querySelector(".cp-value").textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function () {});
        }
        popover.querySelectorAll(".cp-row").forEach(function (r) { r.classList.remove("copied"); });
        row.classList.add("copied");
      });
    });

    document.addEventListener("click", function (e) {
      if (!popover.contains(e.target) && !e.target.closest(".swatch")) close();
    });
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    popover.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      const focusable = Array.prototype.slice.call(popover.querySelectorAll(".cp-row"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    return { toggle: toggle, close: close };
  };
})(window);
