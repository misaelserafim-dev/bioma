(function (global) {
  const Atlas = (global.Atlas = global.Atlas || {});

  function hexToRgbTuple(hex) {
    const c = hex.replace("#", "");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }

  function hexToRgbStr(hex) {
    const [r, g, b] = hexToRgbTuple(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgba(hex, a) {
    const [r, g, b] = hexToRgbTuple(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  function srgbToLinear(val) {
    const v = val / 255;
    const abs = Math.abs(v);
    if (abs <= 0.04045) return v / 12.92;
    return Math.sign(v) * Math.pow((abs + 0.055) / 1.055, 2.4);
  }

  function linearToGamma(v) {
    const abs = Math.abs(v);
    if (abs > 0.0031308) return Math.sign(v) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    return 12.92 * v;
  }

  function hexToP3Str(hex) {
    const [r255, g255, b255] = hexToRgbTuple(hex);
    const lr = srgbToLinear(r255);
    const lg = srgbToLinear(g255);
    const lb = srgbToLinear(b255);
    const pr = 0.8224621 * lr + 0.177538 * lg;
    const pg = 0.0331941 * lr + 0.9668058 * lg;
    const pb = 0.0170827 * lr + 0.0723974 * lg + 0.9105199 * lb;
    const gr = Math.min(Math.max(linearToGamma(pr), 0), 1);
    const gg = Math.min(Math.max(linearToGamma(pg), 0), 1);
    const gb = Math.min(Math.max(linearToGamma(pb), 0), 1);
    return `color(display-p3 ${gr.toFixed(3)} ${gg.toFixed(3)} ${gb.toFixed(3)})`;
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
      if (h < 0) h += 1;
    }
    return [h, max === 0 ? 0 : d / max, max];
  }

  function rgbToHex(r, g, b) {
    const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function rgbDist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  function relLum(rgb) {
    const lin = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }

  function contrastRatio(a, b) {
    const L1 = relLum(a) + 0.05;
    const L2 = relLum(b) + 0.05;
    return Math.max(L1, L2) / Math.min(L1, L2);
  }

  function hueDiff(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 1 - d);
  }

  Atlas.color = {
    hexToRgbTuple,
    hexToRgbStr,
    hexToRgba,
    hexToP3Str,
    rgbToHsv,
    rgbToHex,
    rgbDist,
    relLum,
    contrastRatio,
    hueDiff,
  };
})(window);
