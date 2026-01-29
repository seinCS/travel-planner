/**
 * Convert processed SVGs to duotone format.
 * Groups paths by color: dark colors → primary, gray colors → secondary
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PROCESSED_DIR = path.join(ROOT, 'docs/design/icon/processed')
const SVG_OUT_DIR = path.join(ROOT, 'docs/design/icon/svg')

// Icon to category mapping
const CATEGORY_MAP = {
  'restaurant': 'category',
  'cafe': 'category',
  'attraction': 'category',
  'shopping': 'category',
  'accommodation': 'category',
  'transport': 'category',
  'other': 'category',
  'add': 'action',
  'close': 'action',
  'collapse': 'action',
  'confirm': 'action',
  'delete': 'action',
  'expand': 'action',
  'external-link': 'action',
  'navigate-next': 'action',
  'search': 'action',
  'send': 'action',
  'star': 'action',
  'upload': 'action',
  'tab-image': 'nav',
  'tab-text': 'nav',
  'tab-url': 'nav',
  'tab-map': 'nav',
  'tab-places': 'nav',
  'tab-itinerary': 'nav',
  'tab-members': 'nav',
  'flight': 'travel',
  'hotel': 'travel',
  'check-in': 'travel',
  'check-out': 'travel',
  'stay': 'travel',
  'location-pin': 'travel',
  'location-pin-alt': 'travel',
  'globe': 'travel',
  'luggage': 'travel',
  'passport': 'travel',
  'passport-alt': 'travel',
  'route': 'travel',
  'ai-sparkle': 'feature',
  'loading': 'feature',
  'error': 'feature',
  'screenshot': 'feature',
  'gallery': 'feature',
  'phone': 'feature',
  'lightbulb': 'feature',
  'info': 'feature',
  'success': 'feature',
  'warning': 'feature',
  'share': 'feature',
  'chat-bubble': 'chat',
  'chat-reset': 'chat',
  'chat-refresh': 'chat',
  'chat-add-place': 'chat',
  'arrow-right': 'ui',
  'github': 'ui',
  'clock': 'ui',
  'chevrons-updown': 'ui',
  'checkbox-checked': 'ui',
  'checkbox-unchecked': 'ui',
}

function getColorBrightness(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return (r + g + b) / 3
}

function classifyColor(hex) {
  const brightness = getColorBrightness(hex)
  if (brightness > 240) return 'background'
  if (brightness > 100) return 'secondary'
  return 'primary'
}

function parseStyles(svgContent) {
  const styleMatch = svgContent.match(/<style>([\s\S]*?)<\/style>/)
  if (!styleMatch) return {}
  const styles = {}
  // Support both cls-N and stN class formats (Illustrator uses stN)
  const classRegex = /\.(cls-\d+|st\d+)\s*\{\s*fill:\s*(#[a-fA-F0-9]+)/g
  let match
  while ((match = classRegex.exec(styleMatch[1])) !== null) {
    styles[match[1]] = match[2]
  }
  return styles
}

function extractTransform(svgContent) {
  const gMatch = svgContent.match(/<g transform="([^"]+)">/)
  return gMatch ? gMatch[1] : null
}

function extractAllElements(svgContent, styles) {
  let content = svgContent.replace(/<defs>[\s\S]*?<\/defs>/g, '')
  // Remove nested g tags but keep their content
  content = content.replace(/<g[^>]*>/g, '').replace(/<\/g>/g, '')
  // Extract content between svg tags
  const svgMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
  if (svgMatch) content = svgMatch[1]

  const primaryPaths = []
  const secondaryPaths = []
  const elementRegex = /<(path|rect|circle|polygon|ellipse)([^>]*)(\/?>)/g
  let match

  while ((match = elementRegex.exec(content)) !== null) {
    const tagName = match[1]
    let attrs = match[2]
    const closing = match[3]

    // Support both cls-N and stN class formats
    const classMatch = attrs.match(/class="(cls-\d+|st\d+)"/)
    let classification = 'primary'

    if (classMatch && styles[classMatch[1]]) {
      const color = styles[classMatch[1]]
      classification = classifyColor(color)
      attrs = attrs.replace(/\s*class="(cls-\d+|st\d+)"/, '')
    }

    // Check for inline fill attribute
    const inlineFillMatch = attrs.match(/fill="(#[a-fA-F0-9]+)"/)
    if (inlineFillMatch) {
      classification = classifyColor(inlineFillMatch[1])
      attrs = attrs.replace(/\s*fill="[^"]*"/, '')
    }

    // Skip full-size background rects (width/height close to viewBox)
    if (tagName === 'rect') {
      const widthMatch = attrs.match(/width="(\d+)"/)
      const heightMatch = attrs.match(/height="(\d+)"/)
      if (widthMatch && heightMatch) {
        const w = parseInt(widthMatch[1])
        const h = parseInt(heightMatch[1])
        // Skip if it's a large background rect
        if (w >= 200 && h >= 200) continue
      }
    }

    if (classification === 'background') continue
    const element = `<${tagName}${attrs}${closing}`
    if (classification === 'secondary') {
      secondaryPaths.push(element)
    } else {
      primaryPaths.push(element)
    }
  }
  return { primaryPaths, secondaryPaths }
}

function processSvg(filename) {
  const baseName = filename.replace('.svg', '')
  const category = CATEGORY_MAP[baseName]
  if (!category) {
    console.log(`⚠️  No category mapping for: ${baseName}`)
    return null
  }

  const svgContent = fs.readFileSync(path.join(PROCESSED_DIR, filename), 'utf-8')
  const styles = parseStyles(svgContent)
  const transform = extractTransform(svgContent)
  const { primaryPaths, secondaryPaths } = extractAllElements(svgContent, styles)

  const transformAttr = transform ? ` transform="${transform}"` : ''
  const secondaryContent = secondaryPaths.join('\n')
  const primaryContent = primaryPaths.join('\n')

  const duotoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><g${transformAttr}><g class="duotone-secondary" opacity=".4" fill="currentColor">
${secondaryContent}
</g><g class="duotone-primary" fill="currentColor">
${primaryContent}
</g></g></svg>`

  return { category, svg: duotoneSvg }
}

// Process only specific files if provided as arguments, otherwise all
const args = process.argv.slice(2)
const filesToProcess = args.length > 0
  ? args.map(f => f.endsWith('.svg') ? f : f + '.svg')
  : fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.svg'))

console.log(`Converting ${filesToProcess.length} SVG files...\n`)

let converted = 0, skipped = 0
for (const file of filesToProcess) {
  if (!fs.existsSync(path.join(PROCESSED_DIR, file))) {
    console.log(`⚠️  File not found: ${file}`)
    skipped++
    continue
  }

  const result = processSvg(file)
  if (!result) {
    skipped++
    continue
  }

  const outDir = path.join(SVG_OUT_DIR, result.category)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(path.join(outDir, file), result.svg)
  console.log(`✅ ${result.category}/${file}`)
  converted++
}

console.log(`\n✨ Done: ${converted} converted, ${skipped} skipped`)
