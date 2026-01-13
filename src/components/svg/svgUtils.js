// src/components/svg/svgUtils.js

export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function hexToRgb(hex) {
  const s = String(hex).replace("#", "");
  const full = s.length === 3 ? s.split("").map((ch) => ch + ch).join("") : s;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => {
        const s = v.toString(16);
        return s.length === 1 ? "0" + s : s;
      })
      .join("")
  );
}

export function lerpColorHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const tt = clamp01(t);
  const r = Math.round(ca.r + (cb.r - ca.r) * tt);
  const g = Math.round(ca.g + (cb.g - ca.g) * tt);
  const bb = Math.round(ca.b + (cb.b - ca.b) * tt);
  return rgbToHex(r, g, bb);
}

export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const tt = clamp01(t);
  const r = Math.round(ca.r + (cb.r - ca.r) * tt);
  const g = Math.round(ca.g + (cb.g - ca.g) * tt);
  const bb = Math.round(ca.b + (cb.b - ca.b) * tt);
  return rgbToHex(r, g, bb);
}

export function shadeHex(hex, percent) {
  const c = hexToRgb(hex);
  const p = clamp(percent, -100, 100) / 100;
  const r = Math.round(c.r + (p < 0 ? c.r : (255 - c.r)) * p);
  const g = Math.round(c.g + (p < 0 ? c.g : (255 - c.g)) * p);
  const b = Math.round(c.b + (p < 0 ? c.b : (255 - c.b)) * p);
  return rgbToHex(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
}

// deterministic RNG
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
