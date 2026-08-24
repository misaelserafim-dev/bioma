(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});
  const memoryCache = new Map();

  function corsImg(url) {
    return Atlas.IMAGE_PROXY + encodeURIComponent(url) + "&w=900&output=jpg";
  }

  function taxonPhoto(taxon) {
    const p = taxon.default_photo || (taxon.taxon_photos && taxon.taxon_photos[0] && taxon.taxon_photos[0].photo);
    if (!p) return null;
    return p.medium_url || p.square_url || p.url || null;
  }

  function cacheKey(id) {
    return Atlas.CACHE_PREFIX + id;
  }

  function readCache(id) {
    if (memoryCache.has(id)) return memoryCache.get(id);
    try {
      const raw = sessionStorage.getItem(cacheKey(id));
      if (!raw) return null;
      const data = JSON.parse(raw);
      memoryCache.set(id, data);
      return data;
    } catch (_) {
      return null;
    }
  }

  function writeCache(id, data) {
    memoryCache.set(id, data);
    try {
      sessionStorage.setItem(cacheKey(id), JSON.stringify(data));
    } catch (_) {}
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.decoding = "async";
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("IMG_LOAD_FAILED")); };
      img.src = src;
    });
  }

  async function processTaxon(taxon) {
    if (!taxon || taxon.rank !== "species") return null;
    const cached = readCache(taxon.id);
    if (cached) return cached;
    const raw = taxonPhoto(taxon);
    if (!raw) return null;
    const imgUrl = corsImg(raw);
    try {
      const img = await loadImage(imgUrl);
      const items = await Atlas.extractPalette(img, 10);
      const paleta = Atlas.classifyPalette(items);
      const animal = {
        id: taxon.id,
        nome: taxon.preferred_common_name || taxon.name,
        latim: taxon.name,
        imgUrl: imgUrl,
        cores: paleta.cores,
        roles: paleta.roles,
        primary: paleta.primary,
        secondary: paleta.secondary,
        accent: paleta.accent,
        harmony: paleta.harmony,
        contrast: paleta.contrast,
        contrastOk: paleta.contrastOk,
      };
      writeCache(taxon.id, animal);
      return animal;
    } catch (_) {
      return null;
    }
  }

  async function fetchTaxa(page, signal) {
    const params = new URLSearchParams({
      taxon_id: "1",
      rank: "species",
      per_page: String(Atlas.PAGE_SIZE),
      page: String(page),
      order_by: "observations_count",
      order: "desc",
      locale: "pt",
    });
    const res = await fetch(Atlas.API + "?" + params, { signal: signal });
    if (!res.ok) throw new Error("API_ERROR");
    return res.json();
  }

  async function searchTaxa(q, signal) {
    const params = new URLSearchParams({
      q: q,
      rank: "species",
      per_page: "12",
      locale: "pt",
      is_active: "true",
    });
    const res = await fetch(Atlas.API + "?" + params, { signal: signal });
    if (!res.ok) throw new Error("API_ERROR");
    return res.json();
  }

  Atlas.api = { corsImg, taxonPhoto, processTaxon, fetchTaxa, searchTaxa };
})(window);
