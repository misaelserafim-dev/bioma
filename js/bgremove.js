(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});
  const LIB_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";
  let sessionPromise = null;

  function pct(p) {
    if (p.progress != null) return Math.round(p.progress) + "%";
    if (p.total) return Math.round(((p.loaded || 0) / p.total) * 100) + "%";
    return "";
  }

  function loadSession(onStatus) {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async function () {
      onStatus && onStatus("Preparando modelo de IA (download único de ~45 MB)…");
      const mod = await import(LIB_URL);
      const { AutoModel, AutoProcessor, env } = mod;
      env.allowLocalModels = false;
      if (global.location && global.location.protocol === "file:") {
        env.useBrowserCache = false;
      }
      const report = function (p) {
        if (!onStatus || !p) return;
        if (p.status === "progress") {
          const label = pct(p);
          if (label) onStatus("Baixando modelo de IA: " + label);
        }
      };
      const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
        config: { model_type: "custom" },
        progress_callback: report,
      });
      const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          image_std: [1, 1, 1],
          feature_extractor_type: "ImageFeatureExtractor",
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        },
      });
      return { mod: mod, model: model, processor: processor };
    })().catch(function (err) {
      sessionPromise = null;
      throw err;
    });
    return sessionPromise;
  }

  function compositeForeground(imgEl, mask) {
    const w = imgEl.naturalWidth || imgEl.width;
    const h = imgEl.naturalHeight || imgEl.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, w, h);

    const mc = document.createElement("canvas");
    mc.width = w;
    mc.height = h;
    const mctx = mc.getContext("2d");
    const md = mctx.createImageData(w, h);
    const src = mask.data;
    for (let i = 0; i < w * h; i++) {
      md.data[i * 4] = 255;
      md.data[i * 4 + 1] = 255;
      md.data[i * 4 + 2] = 255;
      md.data[i * 4 + 3] = src[i];
    }
    mctx.putImageData(md, 0, 0);

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mc, 0, 0);
    return out;
  }

  Atlas.removeBackgroundFromFile = async function removeBackgroundFromFile(file, imgEl, onStatus) {
    const s = await loadSession(onStatus);
    onStatus && onStatus("Separando o sujeito do fundo…");
    const image = await s.mod.RawImage.fromBlob(file);
    const { pixel_values } = await s.processor(image);
    const { output } = await s.model({ input: pixel_values });
    const mask = await s.mod.RawImage.fromTensor(output[0].mul(255).to("uint8"))
      .resize(image.width, image.height);
    return compositeForeground(imgEl, mask);
  };
})(window);
