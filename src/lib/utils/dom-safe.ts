/**
 * Safe DOM manipulation utilities to prevent XSS
 * Use these instead of innerHTML for dynamic content
 */

/**
 * Safely create a DOM element with styles
 */
export function createStyledElement(
  tag: string,
  styles: Record<string, string>,
  children?: (HTMLElement | string)[]
): HTMLElement {
  const element = document.createElement(tag)
  
  // Apply styles safely
  Object.entries(styles).forEach(([key, value]) => {
    element.style.setProperty(key, value)
  })
  
  // Append children safely
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child))
      } else {
        element.appendChild(child)
      }
    })
  }
  
  return element
}

/**
 * Safely set text content (prevents XSS)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text
}

/**
 * Safely create SVG element
 */
export function createSVG(
  viewBox: string,
  attributes: Record<string, string>,
  children: string
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', viewBox)
  
  Object.entries(attributes).forEach(([key, value]) => {
    svg.setAttribute(key, value)
  })
  
  // Parse SVG children safely (for simple SVG markup)
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<svg>${children}</svg>`, 'image/svg+xml')
  const svgChildren = doc.documentElement.children
  
  for (let i = 0; i < svgChildren.length; i++) {
    const child = svgChildren[i]
    if (child) {
      svg.appendChild(child.cloneNode(true))
    }
  }
  
  return svg
}

/**
 * Safely create a style element with keyframes
 */
export function createStyleElement(keyframes: Record<string, Record<string, string>>): HTMLStyleElement {
  const style = document.createElement('style')
  let css = ''
  
  Object.entries(keyframes).forEach(([name, frames]) => {
    css += `@keyframes ${name} {\n`
    Object.entries(frames).forEach(([percentage, properties]) => {
      css += `  ${percentage} {\n`
      Object.entries(properties).forEach(([prop, value]) => {
        const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        css += `    ${camelProp}: ${value};\n`
      })
      css += `  }\n`
    })
    css += `}\n`
  })
  
  style.textContent = css
  return style
}
