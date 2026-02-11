// Color utility functions for dynamic color manipulation

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., '#6B8A99' or '6B8A99')
 * @returns {{ r: number, g: number, b: number }}
 */
export const hexToRgb = (hex) => {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

/**
 * Convert RGB to hex color string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string with #
 */
export const rgbToHex = (r, g, b) => {
  const toHex = (n) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{ h: number, s: number, l: number }} HSL values (h: 0-360, s: 0-100, l: 0-100)
 */
export const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {{ r: number, g: number, b: number }}
 */
export const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 * Calculate relative luminance of a color (for contrast calculations)
 * @param {string} hex - Hex color string
 * @returns {number} Luminance value (0-1)
 */
export const getLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
export const getContrastRatio = (hex1, hex2) => {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if white text has good contrast on the given background
 * @param {string} hex - Background color
 * @returns {boolean} True if contrast is acceptable (>= 3:1 for large text, >= 4.5:1 for normal)
 */
export const hasGoodContrastWithWhite = (hex) => {
  return getContrastRatio(hex, '#FFFFFF') >= 3;
};

/**
 * Check if black text has good contrast on the given background
 * @param {string} hex - Background color
 * @returns {boolean}
 */
export const hasGoodContrastWithBlack = (hex) => {
  return getContrastRatio(hex, '#000000') >= 3;
};

/**
 * Determine if text should be white or dark on a given background
 * @param {string} hex - Background color
 * @returns {'white' | 'dark'} Recommended text color type
 */
export const getTextColorType = (hex) => {
  const luminance = getLuminance(hex);
  return luminance > 0.4 ? 'dark' : 'white';
};

/**
 * Generate a light variant of a color (for backgrounds)
 * Aims for ~90-95% lightness while preserving hue
 * @param {string} hex - Base hex color
 * @returns {string} Light variant hex color
 */
export const generateLightVariant = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);

  // Target lightness around 92-95% with reduced saturation
  const newL = 92;
  const newS = Math.max(s * 0.4, 10); // Reduce saturation but keep some color

  const newRgb = hslToRgb(h, newS, newL);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Generate a dark variant of a color (for text on light backgrounds)
 * Aims for ~25-35% lightness while preserving hue
 * @param {string} hex - Base hex color
 * @returns {string} Dark variant hex color
 */
export const generateDarkVariant = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);

  // Target lightness around 25-30% with boosted saturation
  const newL = 28;
  const newS = Math.min(s * 1.2, 80); // Boost saturation slightly

  const newRgb = hslToRgb(h, newS, newL);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Get all color variants for a given base color
 * @param {string} hex - Base hex color
 * @returns {{ base: string, light: string, dark: string }}
 */
export const getColorVariants = (hex) => {
  // Ensure hex is uppercase and has #
  const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;

  return {
    base: normalizedHex,
    light: generateLightVariant(normalizedHex),
    dark: generateDarkVariant(normalizedHex),
  };
};

/**
 * Generate a hex color with alpha (8-digit hex)
 * @param {string} hex - Base hex color (6 digits)
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} 8-digit hex color with alpha
 */
export const hexWithAlpha = (hex, alpha) => {
  const cleanHex = hex.replace('#', '').toUpperCase();
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${cleanHex}${alphaHex}`;
};

/**
 * Preset colors with their pre-calculated variants (for quick selection)
 * These are carefully curated to look good across the app
 */
export const presetColors = [
  '#6B8A99', // Slate blue
  '#9C8B7E', // Warm taupe
  '#F8796D', // Coral red
  '#FFA07A', // Light salmon
  '#E5C730', // Golden yellow
  '#A8A356', // Olive green
  '#7CB342', // Leaf green
  '#6EE7B7', // Mint green
  '#22D3EE', // Cyan
  '#6366F1', // Indigo
  '#A78BFA', // Purple
  '#E879F9', // Pink
  '#FB7185', // Rose
  '#9CA3A8', // Gray
];

/**
 * Validate if a string is a valid hex color
 * @param {string} color - Color string to validate
 * @returns {boolean}
 */
export const isValidHexColor = (color) => {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Normalize a hex color to uppercase with #
 * @param {string} hex - Hex color string
 * @returns {string} Normalized hex color
 */
export const normalizeHex = (hex) => {
  let clean = hex.replace('#', '');
  // Expand 3-digit hex to 6-digit
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  return `#${clean.toUpperCase()}`;
};
