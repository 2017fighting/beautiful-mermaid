/**
 * Tests for styles module — text measurement and constants.
 * Theme resolution tests are in theme.test.ts (CSS custom property system).
 */
import { describe, it, expect } from 'bun:test'
import { estimateTextWidth, FONT_SIZES, FONT_WEIGHTS, NODE_PADDING, STROKE_WIDTHS, ARROW_HEAD } from '../styles.ts'
import { THEMES, DEFAULTS, fromShikiTheme, buildStyleBlock, svgOpenTag } from '../theme.ts'
import type { DiagramColors } from '../theme.ts'

// ============================================================================
// Theme system (CSS custom properties)
// ============================================================================

describe('THEMES', () => {
  it('contains well-known theme palettes', () => {
    expect(THEMES['zinc-light']).toBeDefined()
    expect(THEMES['zinc-dark']).toBeDefined()
    expect(THEMES['tokyo-night']).toBeDefined()
    expect(THEMES['catppuccin-mocha']).toBeDefined()
    expect(THEMES['nord']).toBeDefined()
  })

  it('each theme has valid bg and fg colors', () => {
    for (const [name, colors] of Object.entries(THEMES)) {
      expect(colors.bg).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(colors.fg).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('DEFAULTS', () => {
  it('provides zinc-light bg/fg', () => {
    expect(DEFAULTS.bg).toBe('#FFFFFF')
    expect(DEFAULTS.fg).toBe('#27272A')
  })
})

describe('svgOpenTag', () => {
  it('sets --bg and --fg CSS variables in inline style', () => {
    const tag = svgOpenTag(400, 300, { bg: '#1a1b26', fg: '#a9b1d6' })
    expect(tag).toContain('--bg:#1a1b26')
    expect(tag).toContain('--fg:#a9b1d6')
    expect(tag).toContain('background:var(--bg)')
  })

  it('includes optional enrichment variables when provided', () => {
    const colors: DiagramColors = {
      bg: '#1a1b26', fg: '#a9b1d6',
      line: '#3d59a1', accent: '#7aa2f7',
    }
    const tag = svgOpenTag(400, 300, colors)
    expect(tag).toContain('--line:#3d59a1')
    expect(tag).toContain('--accent:#7aa2f7')
  })

  it('omits unset enrichment variables', () => {
    const tag = svgOpenTag(400, 300, { bg: '#fff', fg: '#000' })
    expect(tag).not.toContain('--line')
    expect(tag).not.toContain('--accent')
    expect(tag).not.toContain('--muted')
  })
})

describe('buildStyleBlock', () => {
  it('includes derived CSS variable declarations', () => {
    const style = buildStyleBlock('Inter')
    expect(style).toContain('--_text')
    expect(style).toContain('--_line')
    expect(style).toContain('--_arrow')
    expect(style).toContain('--_node-fill')
    expect(style).toContain('--_node-stroke')
  })

  it('includes mono font class when requested', () => {
    const withMono = buildStyleBlock('Inter', 'JetBrains Mono')
    expect(withMono).toContain('.mono')
    expect(withMono).toContain('JetBrains Mono')

    const withoutMono = buildStyleBlock('Inter')
    expect(withoutMono).not.toContain('.mono')
  })

  it('omits Google Fonts @import when font is a CSS variable', () => {
    const style = buildStyleBlock('var(--font-family-body)')
    expect(style).not.toContain('fonts.googleapis.com')
    expect(style).not.toContain('Inter')
  })

  it('omits all @imports when CSS variable font and no mono', () => {
    const style = buildStyleBlock('var(--my-font)')
    expect(style).not.toContain('@import')
  })

  it('includes mono @import when CSS variable font has literal mono', () => {
    const style = buildStyleBlock('var(--my-font)', 'JetBrains Mono')
    expect(style).toContain('JetBrains Mono')
    expect(style).not.toContain('Inter')
  })

  it('omits mono @import when mono font is a CSS variable', () => {
    const style = buildStyleBlock('Inter', 'var(--mono-font)')
    expect(style).toContain('Inter')
    expect(style).not.toContain('JetBrains+Mono')
  })

  it('omits all @imports when both fonts are CSS variables', () => {
    const style = buildStyleBlock('var(--body-font)', 'var(--mono-font)')
    expect(style).not.toContain('@import')
  })

  it('renders CSS variable mono font unquoted in .mono class', () => {
    const style = buildStyleBlock('Inter', 'var(--mono-font)')
    expect(style).toContain('.mono')
    expect(style).toContain("font-family: var(--mono-font), 'SF Mono'")
    expect(style).not.toContain("'var(--mono-font)'")
  })

  it('renders literal mono font quoted in .mono class', () => {
    const style = buildStyleBlock('Inter', 'JetBrains Mono')
    expect(style).toContain("font-family: 'JetBrains Mono', 'SF Mono'")
  })

  it('renders CSS variable font unquoted in font-family', () => {
    const style = buildStyleBlock('var(--font-body)')
    expect(style).toContain("font-family: var(--font-body), system-ui, sans-serif")
    expect(style).not.toContain("'var(--font-body)'")
  })

  it('renders regular font quoted in font-family', () => {
    const style = buildStyleBlock('Inter')
    expect(style).toContain("font-family: 'Inter', system-ui, sans-serif")
  })
})

describe('fromShikiTheme', () => {
  it('extracts bg/fg from editor colors', () => {
    const colors = fromShikiTheme({
      type: 'dark',
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#a9b1d6',
      },
    })
    expect(colors.bg).toBe('#1a1b26')
    expect(colors.fg).toBe('#a9b1d6')
  })

  it('falls back for missing editor colors', () => {
    const dark = fromShikiTheme({ type: 'dark' })
    expect(dark.bg).toBe('#1e1e1e')
    expect(dark.fg).toBe('#d4d4d4')

    const light = fromShikiTheme({ type: 'light' })
    expect(light.bg).toBe('#ffffff')
    expect(light.fg).toBe('#333333')
  })
})

// ============================================================================
// Text width estimation
// ============================================================================

describe('estimateTextWidth', () => {
  it('returns a positive number for non-empty text', () => {
    const width = estimateTextWidth('Hello', 13, 500)
    expect(width).toBeGreaterThan(0)
  })

  it('returns minimum padding for empty text', () => {
    // Empty text still returns minimum padding (fontSize * 0.15) for layout safety
    expect(estimateTextWidth('', 13, 500)).toBeCloseTo(1.95, 1)
  })

  it('scales with text length', () => {
    const short = estimateTextWidth('Hi', 13, 500)
    const long = estimateTextWidth('Hello World', 13, 500)
    expect(long).toBeGreaterThan(short)
  })

  it('scales with font size', () => {
    const small = estimateTextWidth('Text', 11, 500)
    const large = estimateTextWidth('Text', 16, 500)
    expect(large).toBeGreaterThan(small)
  })

  it('heavier weights produce wider estimates', () => {
    const regular = estimateTextWidth('Text', 13, 400)
    const bold = estimateTextWidth('Text', 13, 600)
    expect(bold).toBeGreaterThan(regular)
  })

  it('produces reasonable widths for typical node labels', () => {
    // A 5-character label at 13px/500w should be roughly 35px (5 * 13 * 0.55)
    const width = estimateTextWidth('Hello', FONT_SIZES.nodeLabel, FONT_WEIGHTS.nodeLabel)
    expect(width).toBeGreaterThan(25)
    expect(width).toBeLessThan(60)
  })
})

// ============================================================================
// Exported constants
// ============================================================================

describe('constants', () => {
  it('FONT_SIZES has expected values', () => {
    expect(FONT_SIZES.nodeLabel).toBe(13)
    expect(FONT_SIZES.edgeLabel).toBe(11)
    expect(FONT_SIZES.groupHeader).toBe(12)
  })

  it('FONT_WEIGHTS has expected values', () => {
    expect(FONT_WEIGHTS.nodeLabel).toBe(500)
    expect(FONT_WEIGHTS.edgeLabel).toBe(400)
    expect(FONT_WEIGHTS.groupHeader).toBe(600)
  })

  it('NODE_PADDING has expected values', () => {
    expect(NODE_PADDING.horizontal).toBe(20)
    expect(NODE_PADDING.vertical).toBe(10)
    expect(NODE_PADDING.diamondExtra).toBe(24)
  })

  it('STROKE_WIDTHS has expected values', () => {
    expect(STROKE_WIDTHS.outerBox).toBe(1)
    expect(STROKE_WIDTHS.innerBox).toBe(0.75)
    expect(STROKE_WIDTHS.connector).toBe(1)
  })

  it('ARROW_HEAD has expected values', () => {
    expect(ARROW_HEAD.width).toBe(8)
    expect(ARROW_HEAD.height).toBe(5)
  })
})
