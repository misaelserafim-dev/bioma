(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});
  const { rgbDist, rgbToHex, rgbToHsv } = Atlas.color;

  function extractPaletteLocal(imgEl, n) {
    const MAX = 160;
    const ratio = Math.min(1, MAX / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
    const w = Math.max(1, Math.round(imgEl.naturalWidth * ratio));
    const h = Math.max(1, Math.round(imgEl.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imgEl, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
    const marginX = Math.max(2, Math.round(w * 0.08));
    const marginY = Math.max(2, Math.round(h * 0.08));
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const onEdge = x < marginX || x >= w - marginX || y < marginY || y >= h - marginY;
        if (!onEdge) continue;
        const i = (y * w + x) * 4;
        if (data[i + 3] < 200) continue;
        bgR += data[i];
        bgG += data[i + 1];
        bgB += data[i + 2];
        bgN++;
      }
    }
    const bg = bgN ? [bgR / bgN, bgG / bgN, bgB / bgN] : [128, 128, 128];
    const buckets = new Map();
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const [hue, sat, val] = rgbToHsv(r, g, b);
        const nx = (x - cx) / w, ny = (y - cy) / h;
        const centerW = Math.exp(-(nx * nx + ny * ny) * 6);
        const edge = x < marginX || x >= w - marginX || y < marginY || y >= h - marginY;
        const nearBg = rgbDist([r, g, b], bg) < 48;
        if (edge && sat < 0.28) continue;
        if (nearBg && sat < 0.22 && centerW < 0.45) continue;
        const weight = centerW * (0.25 + sat * 2.4) * (nearBg ? 0.15 : 1);
        const key = sat > 0.32
          ? "h" + Math.round(hue * 24) + "-s" + Math.round(sat * 4) + "-v" + Math.round(val * 4)
          : "g" + Math.round(r / 18) + "-" + Math.round(g / 18) + "-" + Math.round(b / 18);
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { r: 0, g: 0, b: 0, w: 0, sat: 0 };
          buckets.set(key, bucket);
        }
        bucket.r += r * weight;
        bucket.g += g * weight;
        bucket.b += b * weight;
        bucket.sat += sat * weight;
        bucket.w += weight;
      }
    }

    const candidates = [...buckets.values()]
      .filter((c) => c.w > 0)
      .map((c) => ({
        rgb: [Math.round(c.r / c.w), Math.round(c.g / c.w), Math.round(c.b / c.w)],
        w: c.w,
        sat: c.sat / c.w,
      }))
      .sort((a, b) => b.w * (1 + b.sat * 1.6) - a.w * (1 + a.sat * 1.6));

    if (!candidates.length) throw new Error("NO_PIXELS");

    const picked = [];
    const tryPick = (item, minDist) => {
      if (picked.some((p) => rgbDist(p.rgb, item.rgb) < minDist)) return false;
      picked.push(item);
      return true;
    };

    const mostSat = [...candidates].sort((a, b) => b.sat - a.sat)[0];
    const lum = (c) => 0.299 * c.rgb[0] + 0.587 * c.rgb[1] + 0.114 * c.rgb[2];
    const darkest = [...candidates].sort((a, b) => lum(a) - lum(b))[0];
    const lightest = [...candidates].sort((a, b) => lum(b) - lum(a))[0];
    if (mostSat && mostSat.sat > 0.28) tryPick(mostSat, 36);
    tryPick(darkest, 36);
    tryPick(lightest, 36);
    for (const item of candidates) {
      if (picked.length >= n) break;
      tryPick(item, 44);
    }
    for (const item of candidates) {
      if (picked.length >= n) break;
      tryPick(item, 22);
    }

    return picked.slice(0, n).map((p) => {
      const [r, g, b] = p.rgb;
      return { rgb: p.rgb, hex: rgbToHex(r, g, b), sat: p.sat, w: p.w, hsv: rgbToHsv(r, g, b) };
    });
  }

  function itemsFromRgbList(list) {
    return list.map(([r, g, b], i) => {
      const hsv = rgbToHsv(r, g, b);
      return { rgb: [r, g, b], hex: rgbToHex(r, g, b), sat: hsv[1], w: list.length - i, hsv };
    });
  }

  Atlas.extractPalette = async function extractPalette(imgEl, n) {
    n = n || 10;
    if (global.ColorThief && imgEl) {
      try {
        const thief = new global.ColorThief();
        const palette = thief.getPalette(imgEl, Math.max(8, n), 4);
        if (palette && palette.length >= 4) return itemsFromRgbList(palette.slice(0, n));
      } catch (_) {}
    }
    return extractPaletteLocal(imgEl, n);
  };
})(window);
