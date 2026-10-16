/**
 * WCAG 2.1 AA Relative Luminance & Contrast Ratio Engine
 * Authoritative mathematical implementation based on W3C specifications:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

export interface HSLColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
}

export interface RGBColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

/**
 * Parses HSL string formatted as "h s% l%" or "h, s%, l%" or "hsl(h s% l%)"
 * e.g., "240 10% 3.9%" -> { h: 240, s: 10, l: 3.9 }
 */
export function parseHslString(hslStr: string): HSLColor {
  const cleaned = hslStr
    .replace(/^hsl\(/i, "")
    .replace(/\)$/, "")
    .replace(/,/g, " ")
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    throw new Error(`Invalid HSL format: "${hslStr}"`);
  }

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", ""));
  const l = parseFloat(parts[2].replace("%", ""));

  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) {
    throw new Error(`Failed to parse numerical values from HSL: "${hslStr}"`);
  }

  return { h, s, l };
}

/**
 * Converts HSL color values to sRGB [0-255]
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, hsl.s)) / 100;
  const l = Math.max(0, Math.min(100, hsl.l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/**
 * Calculates W3C WCAG 2.1 Relative Luminance (L) for an sRGB color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where each channel is linearized.
 */
export function getRelativeLuminance(rgb: RGBColor): number {
  const linearize = (val: number): number => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const rLinear = linearize(rgb.r);
  const gLinear = linearize(rgb.g);
  const bLinear = linearize(rgb.b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates WCAG 2.1 Contrast Ratio between two colors:
 * CR = (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter color luminance and L2 is the darker color luminance.
 * Returns a value between 1.0 and 21.0.
 */
export function getContrastRatio(
  colorA: RGBColor | HSLColor | string,
  colorB: RGBColor | HSLColor | string,
): number {
  const toRgb = (c: RGBColor | HSLColor | string): RGBColor => {
    if (typeof c === "string") {
      return hslToRgb(parseHslString(c));
    }
    if ("h" in c) {
      return hslToRgb(c);
    }
    return c;
  };

  const rgbA = toRgb(colorA);
  const rgbB = toRgb(colorB);

  const l1 = getRelativeLuminance(rgbA);
  const l2 = getRelativeLuminance(rgbB);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates whether a color contrast meets WCAG AA criteria:
 * - Normal Text: >= 4.5:1
 * - Large Text / UI Components & Borders: >= 3.0:1
 */
export function verifyWcagCompliance(
  foreground: string,
  background: string,
  level: "normal-text" | "large-text-or-ui" = "normal-text",
): {
  ratio: number;
  threshold: number;
  passed: boolean;
  message: string;
} {
  const ratio = getContrastRatio(foreground, background);
  const threshold = level === "normal-text" ? 4.5 : 3.0;
  const passed = ratio >= threshold;

  return {
    ratio,
    threshold,
    passed,
    message: passed
      ? `WCAG AA passed: ${ratio}:1 >= ${threshold}:1`
      : `WCAG AA violation: ${ratio}:1 < ${threshold}:1 (required: ${threshold}:1)`,
  };
}
