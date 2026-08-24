(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});
  const { contrastRatio, hueDiff } = Atlas.color;

  function harmonyName(chroma) {
    if (!chroma.length) return "Neutra";
    if (chroma.length === 1) return "Monocromática";
    const diffs = [];
    for (let i = 0; i < chroma.length; i++) {
      for (let j = i + 1; j < chroma.length; j++) {
        diffs.push(hueDiff(chroma[i].hsv[0], chroma[j].hsv[0]) * 360);
      }
    }
    const max = Math.max.apply(null, diffs);
    if (max < 35) return "Monocromática";
    if (max < 80) return "Análoga";
    if (diffs.some((d) => d > 150 && d < 210)) return "Complementar";
    if (diffs.filter((d) => d > 100 && d < 150).length >= 2) return "Triádica";
    return "Diversa";
  }

  Atlas.classifyPalette = function classifyPalette(items) {
    const list = items.map((c) => ({
      rgb: c.rgb,
      hex: c.hex,
      sat: c.sat,
      w: c.w,
      hsv: c.hsv,
      L: 0.299 * c.rgb[0] + 0.587 * c.rgb[1] + 0.114 * c.rgb[2],
    }));
    const isNeutral = (c) => c.hsv[1] < 0.18 || c.L < 22 || (c.L > 232 && c.hsv[1] < 0.25);
    let neutrals = list.filter(isNeutral);
    let chroma = list.filter((c) => !isNeutral(c));
    if (!chroma.length) chroma = list.slice().sort((a, b) => b.hsv[1] - a.hsv[1]).slice(0, 3);
    if (!neutrals.length) {
      const byL = list.slice().sort((a, b) => a.L - b.L);
      neutrals = [byL[0], byL[byL.length - 1]].filter(Boolean);
    }

    chroma.sort((a, b) => b.w * (1 + b.hsv[1] * 1.4) - a.w * (1 + a.hsv[1] * 1.4));
    const primary = chroma[0];
    const rest = chroma.filter((c) => c !== primary);
    rest.sort((a, b) => hueDiff(a.hsv[0], primary.hsv[0]) - hueDiff(b.hsv[0], primary.hsv[0]));
    const secondary = rest[0] || primary;
    const accentPool = rest.filter((c) => c !== secondary);
    accentPool.sort((a, b) => {
      const score = (c) => c.hsv[1] * 2 + hueDiff(c.hsv[0], primary.hsv[0]);
      return score(b) - score(a);
    });
    const accent = accentPool[0] || secondary;
    neutrals.sort((a, b) => a.L - b.L);
    const texto = neutrals[0];
    const fundo = neutrals[neutrals.length - 1];
    const used = new Set([primary, secondary, accent, texto, fundo]);

    const roles = [
      { papel: "Primária", hint: "60% identidade", hex: primary.hex },
      { papel: "Secundária", hint: "30% apoio", hex: secondary.hex },
      { papel: "Destaque", hint: "10% ênfase", hex: accent.hex },
      { papel: "Texto", hint: "neutro escuro", hex: texto.hex },
      { papel: "Fundo", hint: "neutro claro", hex: fundo.hex },
    ];
    neutrals.forEach((n) => {
      if (!used.has(n)) roles.push({ papel: "Neutro", hint: "equilíbrio", hex: n.hex });
    });
    rest.forEach((c) => {
      if (!used.has(c)) roles.push({ papel: "Apoio", hint: "detalhe", hex: c.hex });
    });

    const unique = [];
    const seen = new Set();
    roles.forEach((r) => {
      if (seen.has(r.hex)) return;
      seen.add(r.hex);
      unique.push(r);
    });

    const ratio = contrastRatio(texto.rgb, fundo.rgb);
    return {
      cores: unique.slice(0, 10).map((r) => r.hex),
      roles: unique.slice(0, 10),
      primary: primary.hex,
      secondary: secondary.hex,
      accent: accent.hex,
      harmony: harmonyName(chroma),
      contrast: ratio,
      contrastOk: ratio >= 4.5,
    };
  };
})(window);
