(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});

  Atlas.createUi = function createUi(popover) {
    const grid = document.getElementById("grid");
    const pagerEl = document.getElementById("pager");
    const pagerInfo = document.getElementById("pagerInfo");
    const adderStatus = document.getElementById("adderStatus");
    let pageAnimals = [];

    function nextFrame() {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
    }

    function setBusy(busy) {
      grid.setAttribute("aria-busy", busy ? "true" : "false");
    }

    function buildCard(esp) {
      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("role", "listitem");
      const glow = esp.primary || esp.cores[1] || esp.cores[0];
      card.style.setProperty("--card-glow", "0 1px 2px rgba(0,0,0,0.04), 0 28px 60px -18px " + Atlas.color.hexToRgba(glow, 0.45));

      const frame = document.createElement("div");
      frame.className = "photo-frame";
      const img = document.createElement("img");
      img.src = esp.imgUrl;
      img.alt = esp.latim ? esp.nome + " (" + esp.latim + ")" : esp.nome;
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 900;
      img.height = 698;

      const chip = document.createElement("div");
      chip.className = "name-chip";
      const common = document.createElement("span");
      common.className = "common";
      common.textContent = esp.nome;
      chip.appendChild(common);
      if (esp.latim) {
        const latin = document.createElement("span");
        latin.className = "latin";
        latin.textContent = esp.latim;
        chip.appendChild(latin);
      }
      frame.appendChild(img);
      frame.appendChild(chip);

      const meta = document.createElement("div");
      meta.className = "palette-meta";
      const row = document.createElement("div");
      row.className = "role-grid";
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", "Paleta de " + esp.nome);

      const roles = esp.roles || esp.cores.map(function (hex) {
        return { papel: "Tom", hint: "", hex: hex };
      });
      roles.forEach(function (role) {
        const item = document.createElement("div");
        item.className = "role-item";
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "swatch";
        sw.style.background = role.hex;
        sw.setAttribute("aria-label", role.papel + ": " + role.hex + ". Abrir códigos da cor");
        sw.setAttribute("aria-haspopup", "dialog");
        sw.setAttribute("aria-expanded", "false");
        sw.setAttribute("aria-controls", "colorPopover");
        sw.addEventListener("click", function (e) {
          e.stopPropagation();
          popover.toggle(sw, role.hex, role.papel);
        });
        item.appendChild(sw);
        row.appendChild(item);
      });

      const notes = document.createElement("div");
      notes.className = "palette-notes";
      const n1 = document.createElement("span");
      n1.textContent = "60-30-10";
      const n2 = document.createElement("span");
      n2.textContent = esp.harmony || "Paleta";
      const n3 = document.createElement("span");
      n3.className = esp.contrastOk ? "ok" : "bad";
      n3.textContent = "Contraste " + (esp.contrast ? esp.contrast.toFixed(1) : "—") + " " + (esp.contrastOk ? "AA" : "baixo");
      notes.appendChild(n1);
      notes.appendChild(n2);
      notes.appendChild(n3);
      meta.appendChild(row);
      meta.appendChild(notes);
      card.appendChild(frame);
      card.appendChild(meta);
      return card;
    }

    const SKELETON_COUNT = 12;

    function buildSkeletonCard() {
      const sk = document.createElement("article");
      sk.className = "card card-skeleton";
      sk.setAttribute("aria-hidden", "true");

      const frame = document.createElement("div");
      frame.className = "photo-frame sk-block";

      const chip = document.createElement("div");
      chip.className = "name-chip";
      chip.appendChild(Object.assign(document.createElement("span"), { className: "sk-line" }));

      frame.appendChild(chip);

      const meta = document.createElement("div");
      meta.className = "palette-meta";
      const row = document.createElement("div");
      row.className = "role-grid";
      for (let i = 0; i < 5; i++) {
        row.appendChild(Object.assign(document.createElement("div"), { className: "sk-dot" }));
      }
      const notes = document.createElement("div");
      notes.className = "palette-notes";
      for (let i = 0; i < 3; i++) {
        notes.appendChild(Object.assign(document.createElement("span"), { className: "sk-line" }));
      }
      meta.appendChild(row);
      meta.appendChild(notes);

      sk.appendChild(frame);
      sk.appendChild(meta);
      return sk;
    }

    function beginProgressiveLoad() {
      grid.replaceChildren();
      pageAnimals = [];
      const frag = document.createDocumentFragment();
      for (let i = 0; i < SKELETON_COUNT; i++) frag.appendChild(buildSkeletonCard());
      grid.appendChild(frag);
      setBusy(true);
    }

    function removeOneSkeleton() {
      const sk = grid.querySelector(".card-skeleton");
      if (sk) sk.remove();
    }

    function prependAnimal(animal) {
      const card = buildCard(animal);
      card.classList.add("new-card");
      grid.insertBefore(card, grid.firstChild);
      return card;
    }

    function appendAnimalProgressive(animal) {
      pageAnimals.push(animal);
      const card = buildCard(animal);
      const sk = grid.querySelector(".card-skeleton");
      grid.insertBefore(card, sk || null);
      removeOneSkeleton();
    }

    function endProgressiveLoad() {
      grid.querySelectorAll(".card-skeleton").forEach(function (sk) { sk.remove(); });
      setBusy(false);
    }

    function showMessage(text) {
      const p = document.createElement("p");
      p.className = "adder-status error";
      p.textContent = text;
      grid.replaceChildren(p);
      setBusy(false);
    }

    async function processTaxaProgressive(taxa, gen, isCurrent) {
      beginProgressiveLoad();
      await nextFrame();
      if (!isCurrent(gen)) return;
      const concurrency = Math.min(Atlas.EXTRACT_CONCURRENCY, taxa.length);
      let index = 0;
      async function worker() {
        while (index < taxa.length) {
          if (!isCurrent(gen)) return;
          const taxon = taxa[index++];
          const animal = await Atlas.api.processTaxon(taxon);
          if (!isCurrent(gen)) return;
          if (!animal) continue;
          appendAnimalProgressive(animal);
        }
      }
      const workers = [];
      for (let i = 0; i < concurrency; i++) workers.push(worker());
      await Promise.all(workers);
      if (!isCurrent(gen)) return;
      endProgressiveLoad();
    }

    function renderPager(opts) {
      pagerEl.replaceChildren();
      const prev = document.createElement("button");
      prev.type = "button";
      prev.textContent = "Anterior";
      prev.setAttribute("aria-label", "Página anterior");
      prev.disabled = opts.currentPage <= 1 || opts.loading;
      prev.addEventListener("click", function () { opts.onPage(opts.currentPage - 1); });
      pagerEl.appendChild(prev);

      const start = Math.max(1, opts.currentPage - 2);
      const end = Math.min(opts.totalPages, start + 4);
      for (let p = start; p <= end; p++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(p);
        btn.setAttribute("aria-label", "Página " + p);
        if (p === opts.currentPage) btn.setAttribute("aria-current", "page");
        btn.disabled = opts.loading;
        btn.addEventListener("click", function (page) {
          return function () { opts.onPage(page); };
        }(p));
        pagerEl.appendChild(btn);
      }

      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "Próxima";
      next.setAttribute("aria-label", "Próxima página");
      next.disabled = opts.currentPage >= opts.totalPages || opts.loading;
      next.addEventListener("click", function () { opts.onPage(opts.currentPage + 1); });
      pagerEl.appendChild(next);
      pagerInfo.textContent = opts.totalPages
        ? "Página " + opts.currentPage + " de " + opts.totalPages.toLocaleString("pt-BR")
        : "";
    }

    function setStatus(msg, kind) {
      adderStatus.textContent = msg;
      adderStatus.className = "adder-status" + (kind ? " " + kind : "");
    }

    function initPhoto3d() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(hover: none)").matches) return;
      const max = 7, zoom = 1.06;
      let frame = null, raf = 0, nextX = 0, nextY = 0;
      grid.addEventListener("pointermove", function (e) {
        const next = e.target.closest(".photo-frame");
        if (!next || !grid.contains(next)) return;
        frame = next;
        const rect = next.getBoundingClientRect();
        nextX = (e.clientX - rect.left) / rect.width;
        nextY = (e.clientY - rect.top) / rect.height;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          if (!frame) return;
          frame.classList.add("is-active");
          frame.style.setProperty("--ry", ((nextX - 0.5) * max * 2).toFixed(2) + "deg");
          frame.style.setProperty("--rx", ((0.5 - nextY) * max * 2).toFixed(2) + "deg");
          frame.style.setProperty("--zoom", String(zoom));
        });
      }, { passive: true });
      grid.addEventListener("pointerout", function (e) {
        const el = e.target.closest(".photo-frame");
        if (!el) return;
        if (e.relatedTarget && el.contains(e.relatedTarget)) return;
        el.classList.remove("is-active");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--zoom", "1");
        if (frame === el) frame = null;
      }, true);
    }

    initPhoto3d();

    return {
      pagerEl: pagerEl,
      pagerInfo: pagerInfo,
      get pageAnimals() { return pageAnimals; },
      beginProgressiveLoad: beginProgressiveLoad,
      prependAnimal: prependAnimal,
      processTaxaProgressive: processTaxaProgressive,
      renderPager: renderPager,
      setStatus: setStatus,
      showMessage: showMessage,
    };
  };
})(window);
