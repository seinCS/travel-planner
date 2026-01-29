/**
 * Rebuild icon TSX components from SVG design files.
 * Computes bounding box of each SVG's paths, then applies
 * transform (translate + scale) to fit content within 0 0 24 24 viewBox.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'docs/design/icon/svg')
const ICONS_DIR = path.join(ROOT, 'components/icons')

const FOLDER_MAP = {
  category: 'category',
  action: 'action',
  nav: 'nav',
  travel: 'travel',
  feature: 'feature',
  chat: 'chat',
  ui: 'ui',
}

const NAME_MAP = {
  'restaurant': 'Restaurant',
  'cafe': 'Cafe',
  'attraction': 'Attraction',
  'shopping': 'Shopping',
  'accommodation': 'Accommodation',
  'transport': 'Transport',
  'other': 'Location',
  'add': 'Plus',
  'close': 'Close',
  'collapse': 'Collapse',
  'confirm': 'CheckAction',
  'delete': 'Delete',
  'expand': 'Expand',
  'external-link': 'ExternalLink',
  'navigate-next': 'Next',
  'search': 'Search',
  'send': 'Send',
  'star': 'Star',
  'upload': 'Upload',
  'tab-image': 'TabImage',
  'tab-text': 'TabText',
  'tab-url': 'TabUrl',
  'tab-map': 'TabMap',
  'tab-places': 'TabList',
  'tab-itinerary': 'TabCalendar',
  'tab-members': 'TabPlus',
  'flight': 'Flight',
  'hotel': 'HotelIcon',
  'check-in': 'CheckIn',
  'check-out': 'CheckOut',
  'stay': 'Stay',
  'location-pin': 'MapPin',
  'globe': 'Globe',
  'luggage': 'Luggage',
  'passport': 'Passport',
  'route': 'Route',
  'ai-sparkle': 'AiSparkle',
  'loading': 'Loading',
  'error': 'ErrorIcon',
  'screenshot': 'Screenshot',
  'gallery': 'Gallery',
  'phone': 'Phone',
  'lightbulb': 'Lightbulb',
  'info': 'Info',
  'success': 'Success',
  'warning': 'Warning',
  'share': 'Share',
  'chat-bubble': 'ChatBubble',
  'chat-reset': 'ChatReset',
  'chat-refresh': 'RefreshCw',
  'chat-add-place': 'ChatAddPlace',
  'arrow-right': 'ArrowRight',
  'github': 'Github',
  'clock': 'Clock',
  'chevrons-updown': 'ChevronsUpDown',
  'checkbox-checked': 'CheckSquare',
  'checkbox-unchecked': 'Square',
}

function computePathBBox(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (!tokens) return null

  let x = 0, y = 0, startX = 0, startY = 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let cmd = 'M'
  let nums = []

  function update(px, py) {
    if (isFinite(px) && isFinite(py)) {
      minX = Math.min(minX, px); minY = Math.min(minY, py)
      maxX = Math.max(maxX, px); maxY = Math.max(maxY, py)
    }
  }

  for (const token of tokens) {
    if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(token)) {
      cmd = token; nums = []
      if (cmd === 'Z' || cmd === 'z') { x = startX; y = startY }
      continue
    }
    nums.push(parseFloat(token))

    switch (cmd) {
      case 'M': if (nums.length >= 2) { x = nums[0]; y = nums[1]; startX = x; startY = y; update(x, y); nums = []; cmd = 'L' } break
      case 'm': if (nums.length >= 2) { x += nums[0]; y += nums[1]; startX = x; startY = y; update(x, y); nums = []; cmd = 'l' } break
      case 'L': if (nums.length >= 2) { x = nums[0]; y = nums[1]; update(x, y); nums = [] } break
      case 'l': if (nums.length >= 2) { x += nums[0]; y += nums[1]; update(x, y); nums = [] } break
      case 'H': if (nums.length >= 1) { x = nums[0]; update(x, y); nums = [] } break
      case 'h': if (nums.length >= 1) { x += nums[0]; update(x, y); nums = [] } break
      case 'V': if (nums.length >= 1) { y = nums[0]; update(x, y); nums = [] } break
      case 'v': if (nums.length >= 1) { y += nums[0]; update(x, y); nums = [] } break
      case 'C': if (nums.length >= 6) { for (let i = 0; i < 6; i += 2) update(nums[i], nums[i+1]); x = nums[4]; y = nums[5]; nums = [] } break
      case 'c': if (nums.length >= 6) { for (let i = 0; i < 6; i += 2) update(x+nums[i], y+nums[i+1]); x += nums[4]; y += nums[5]; nums = [] } break
      case 'S': if (nums.length >= 4) { update(nums[0], nums[1]); x = nums[2]; y = nums[3]; update(x, y); nums = [] } break
      case 's': if (nums.length >= 4) { update(x+nums[0], y+nums[1]); x += nums[2]; y += nums[3]; update(x, y); nums = [] } break
      case 'Q': if (nums.length >= 4) { update(nums[0], nums[1]); x = nums[2]; y = nums[3]; update(x, y); nums = [] } break
      case 'q': if (nums.length >= 4) { update(x+nums[0], y+nums[1]); x += nums[2]; y += nums[3]; update(x, y); nums = [] } break
      case 'T': if (nums.length >= 2) { x = nums[0]; y = nums[1]; update(x, y); nums = [] } break
      case 't': if (nums.length >= 2) { x += nums[0]; y += nums[1]; update(x, y); nums = [] } break
      case 'A': if (nums.length >= 7) { x = nums[5]; y = nums[6]; update(x, y); nums = [] } break
      case 'a': if (nums.length >= 7) { x += nums[5]; y += nums[6]; update(x, y); nums = [] } break
    }
  }
  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

function computeSvgBBox(svgContent) {
  const pathRegex = /d="([^"]+)"/g
  let match
  let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const bbox = computePathBBox(match[1])
    if (bbox) {
      gMinX = Math.min(gMinX, bbox.minX); gMinY = Math.min(gMinY, bbox.minY)
      gMaxX = Math.max(gMaxX, bbox.maxX); gMaxY = Math.max(gMaxY, bbox.maxY)
    }
  }
  if (!isFinite(gMinX)) return null
  return { minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY }
}

function svgAttrToJsx(str) {
  return str
    .replace(/stroke-width/g, 'strokeWidth')
    .replace(/stroke-linecap/g, 'strokeLinecap')
    .replace(/stroke-linejoin/g, 'strokeLinejoin')
    .replace(/stroke-dasharray/g, 'strokeDasharray')
    .replace(/stroke-dashoffset/g, 'strokeDashoffset')
    .replace(/stroke-miterlimit/g, 'strokeMiterlimit')
    .replace(/stroke-opacity/g, 'strokeOpacity')
    .replace(/fill-opacity/g, 'fillOpacity')
    .replace(/fill-rule/g, 'fillRule')
    .replace(/clip-rule/g, 'clipRule')
    .replace(/clip-path/g, 'clipPath')
    .replace(/class="/g, 'className="')
}

function extractGroups(svgContent) {
  const secondaryMatch = svgContent.match(/<g\s+class="duotone-secondary"[^>]*>([\s\S]*?)<\/g>/)
  const primaryMatch = svgContent.match(/<g\s+class="duotone-primary"[^>]*>([\s\S]*?)<\/g>/)
  return {
    secondary: secondaryMatch ? svgAttrToJsx(secondaryMatch[1].trim()) : '',
    primary: primaryMatch ? svgAttrToJsx(primaryMatch[1].trim()) : '',
  }
}

/**
 * Compute transform to fit content within 24x24 with padding.
 * Returns { scale, translateX, translateY } or null.
 */
function computeTransform(bbox) {
  if (!bbox) return null
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  if (w <= 0 || h <= 0) return null

  const padding = 1.5  // padding on each side
  const available = 24 - padding * 2  // 21
  const scale = Math.min(available / w, available / h)

  // Center of content in original coords
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2

  // After scaling, center should be at (12, 12)
  const tx = 12 - cx * scale
  const ty = 12 - cy * scale

  return { scale: Math.round(scale * 10000) / 10000, tx: Math.round(tx * 100) / 100, ty: Math.round(ty * 100) / 100 }
}

function generateTsx(componentName, groups, transform) {
  const tfStr = transform
    ? `transform={\`translate(\${${transform.tx}}, \${${transform.ty}}) scale(\${${transform.scale}})\`}`
    : ''

  // Use a simpler approach: hardcode the transform string
  const tfAttr = transform
    ? ` transform="translate(${transform.tx}, ${transform.ty}) scale(${transform.scale})"`
    : ''

  return `import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const ${componentName} = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, className, secondaryOpacity = 0.4, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <g${tfAttr}>
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          ${groups.secondary}
        </g>
        <g className="duotone-primary" fill="currentColor">
          ${groups.primary}
        </g>
      </g>
    </svg>
  )
)

${componentName}.displayName = '${componentName}'
export { ${componentName} }
`
}

// Main
let processed = 0, skipped = 0

for (const [svgFolder, tsxFolder] of Object.entries(FOLDER_MAP)) {
  const svgFolderPath = path.join(SVG_DIR, svgFolder)
  if (!fs.existsSync(svgFolderPath)) { console.warn(`⚠ SVG folder not found: ${svgFolder}`); continue }

  const tsxFolderPath = path.join(ICONS_DIR, tsxFolder)
  if (!fs.existsSync(tsxFolderPath)) fs.mkdirSync(tsxFolderPath, { recursive: true })

  const svgFiles = fs.readdirSync(svgFolderPath).filter(f => f.endsWith('.svg'))

  for (const svgFile of svgFiles) {
    const baseName = svgFile.replace('.svg', '')
    const componentName = NAME_MAP[baseName]
    if (!componentName) { console.warn(`⚠ No mapping for ${svgFolder}/${baseName}`); skipped++; continue }

    const svgContent = fs.readFileSync(path.join(svgFolderPath, svgFile), 'utf-8')
    const groups = extractGroups(svgContent)
    if (!groups.secondary && !groups.primary) { console.warn(`⚠ No groups in ${svgFolder}/${svgFile}`); skipped++; continue }

    const bbox = computeSvgBBox(svgContent)
    const transform = computeTransform(bbox)

    const tsx = generateTsx(componentName, groups, transform)
    const outPath = path.join(tsxFolderPath, `${componentName}.tsx`)
    fs.writeFileSync(outPath, tsx)

    const s = transform ? `scale=${transform.scale} tx=${transform.tx} ty=${transform.ty}` : 'no transform'
    console.log(`✓ ${tsxFolder}/${componentName}.tsx (${s})`)
    processed++
  }
}

console.log(`\nDone: ${processed} icons generated, ${skipped} skipped`)
