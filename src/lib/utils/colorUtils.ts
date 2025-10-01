/**
 * Color utilities for THREE.js compatibility
 * Ensures colors are properly formatted and don't include alpha channels
 */

/**
 * Sanitizes a color string for THREE.js usage
 * Removes alpha channels and ensures proper hex format
 * @param color - Color in hex format (with or without alpha)
 * @returns Clean hex color without alpha channel
 */
export function sanitizeColorForThreeJS(color: string): string {
  // Remove any whitespace
  color = color.trim()

  // If it's already a 6-digit hex color, return as-is
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color
  }

  // If it's an 8-digit hex (with alpha), remove the alpha
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    return color.substring(0, 7) // Take only first 7 characters (#RRGGBB)
  }

  // If it's a 3-digit hex, expand it
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const hex = color.substring(1)
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }

  // Handle rgba/hsla colors by converting to hex (basic implementation)
  if (color.startsWith('rgba(') || color.startsWith('hsla(')) {
    console.warn(`Color format ${color} not fully supported, using fallback`)
    return '#ffffff' // Fallback to white
  }

  // If it's a named color or other format, return as-is and let THREE.js handle it
  return color
}

/**
 * Converts a hex color with opacity to a clean hex color and separate opacity value
 * @param colorWithAlpha - Color that might include alpha channel
 * @param defaultOpacity - Default opacity if none is found
 * @returns Object with clean color and opacity value
 */
export function separateColorAndOpacity(
  colorWithAlpha: string,
  defaultOpacity: number = 1.0
): { color: string; opacity: number } {
  const cleanColor = sanitizeColorForThreeJS(colorWithAlpha)

  // If original was 8-digit hex, extract alpha
  if (/^#[0-9a-fA-F]{8}$/.test(colorWithAlpha.trim())) {
    const alphaHex = colorWithAlpha.substring(7, 9)
    const opacity = parseInt(alphaHex, 16) / 255
    return { color: cleanColor, opacity }
  }

  return { color: cleanColor, opacity: defaultOpacity }
}

/**
 * Year-based color scheme with proper THREE.js compatible colors
 */
export const yearColorScheme = {
  2023: { primary: '#3b82f6', secondary: '#1d4ed8' }, // blue gradient
  2024: { primary: '#10b981', secondary: '#047857' }, // green gradient
  2025: { primary: '#f59e0b', secondary: '#d97706' }, // amber gradient
  2026: { primary: '#ef4444', secondary: '#dc2626' }, // red gradient
  2027: { primary: '#8b5cf6', secondary: '#7c3aed' }, // purple gradient
  2028: { primary: '#06b6d4', secondary: '#0891b2' }, // cyan gradient
  2029: { primary: '#f97316', secondary: '#ea580c' }, // orange gradient
} as const

/**
 * Get sanitized colors for a given year
 * @param year - The year to get colors for
 * @returns Object with sanitized primary and secondary colors
 */
export function getYearColors(year: number): { primary: string; secondary: string } {
  const colors = yearColorScheme[year as keyof typeof yearColorScheme] || yearColorScheme[2025]
  return {
    primary: sanitizeColorForThreeJS(colors.primary),
    secondary: sanitizeColorForThreeJS(colors.secondary)
  }
}

/**
 * Get a single year color (primary) that's safe for THREE.js
 * @param year - The year to get color for
 * @returns Sanitized hex color
 */
export function getYearColor(year: number): string {
  return getYearColors(year).primary
}