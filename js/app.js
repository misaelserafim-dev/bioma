(function () {
  const popover = Atlas.createPopoverController();
  const ui = Atlas.createUi(popover);

  let currentPage = 1;
  let totalPages = 1;
  let loading = false;
  let searchMode = false;
  let loadGen = 0;
  let abortController = null;

  function isCurrent(gen) {
    return gen === loadGen;
  }

  function cancelInFlight() {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    return abortController.signal;
  }

  function renderPager() {
    ui.renderPager({
      currentPage: currentPage,
      totalPages: totalPages,
      loading: loading,
      onPage: loadPage,
    });
  }

  async function loadPage(page) {
    const gen = ++loadGen;
    const signal = cancelInFlight();
    loading = true;
    searchMode = false;
    currentPage = page;
    ui.pagerEl.style.display = "";
    renderPager();
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const json = await Atlas.api.fetchTaxa(page, signal);
      if (!isCurrent(gen)) return;
      const totalResults = json.total_results || 0;
      totalPages = Math.max(1, Math.ceil(totalResults / Atlas.PAGE_SIZE));
      renderPager();
      await ui.processTaxaProgressive(json.results || [], gen, isCurrent);
      if (!isCurrent(gen)) return;
      if (!ui.pageAnimals.length) {
        ui.showMessage("Não consegui extrair paletas nessa página. Tenta a próxima.");
      }
    } catch (err) {
      if (err.name === "AbortError" || !isCurrent(gen)) return;
      console.error(err);
      ui.showMessage("Erro ao consultar a iNaturalist. Recarrega a página.");
    } finally {
      if (isCurrent(gen)) {
        loading = false;
        renderPager();
      }
    }
  }

  document.getElementById("searchPanel").addEventListener("submit", async function (e) {
    e.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    if (!q) {
      loadPage(currentPage || 1);
      return;
    }
    const btn = document.getElementById("searchBtn");
    btn.disabled = true;
    ui.setStatus("Buscando na iNaturalist…");
    try {
      const gen = ++loadGen;
      const signal = cancelInFlight();
      searchMode = true;
      loading = true;
      const json = await Atlas.api.searchTaxa(q, signal);
      if (!isCurrent(gen)) return;
      const taxa = (json.results || []).filter(function (t) {
        return t.rank === "species" && Atlas.api.taxonPhoto(t);
      });
      if (!taxa.length) {
        ui.setStatus("Nenhum animal com foto encontrado. Tenta outro nome.", "error");
        return;
      }
      ui.setStatus("Carregando paletas de " + taxa.length + " espécies…");
      ui.pagerEl.style.display = "none";
      await ui.processTaxaProgressive(taxa, gen, isCurrent);
      if (!isCurrent(gen)) return;
      ui.pagerInfo.textContent = ui.pageAnimals.length
        ? ui.pageAnimals.length + " espécies relacionadas a “" + q + "”"
        : "";
      if (!ui.pageAnimals.length) {
        ui.setStatus("Achei nomes parecidos, mas as fotos não liberaram as cores.", "error");
        return;
      }
      ui.setStatus(ui.pageAnimals.length + " paletas para “" + q + "”. Limpa o campo para voltar à lista.", "ok");
    } catch (err) {
      if (err.name === "AbortError") return;
      ui.setStatus("Erro ao buscar. Tenta de novo.", "error");
    } finally {
      btn.disabled = false;
      loading = false;
    }
  });

  let searchDebounce = 0;
  document.getElementById("searchInput").addEventListener("input", function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      if (document.getElementById("searchInput").value.trim()) return;
      if (!searchMode) return;
      searchMode = false;
      ui.setStatus("");
      loadPage(currentPage || 1);
    }, 200);
  });

  loadPage(1);
})();
