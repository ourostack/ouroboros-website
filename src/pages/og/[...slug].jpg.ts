/*
  Dynamic Open Graph image endpoint.

  HOW IT WORKS:
  - This endpoint is the SINGLE source of OG image rendering for the site.
  - It reads from src/data/og.ts (the page metadata manifest) and renders
    one JPEG per entry at build time via getStaticPaths.
  - On every push to main, the deploy runs `astro build`, which calls
    getStaticPaths() once and pre-renders every card to dist/og/og-*.jpg.
  - The result: cards are always in sync with the latest copy in
    src/data/og.ts. Update copy in one place, push, done.
  - Manual regeneration scripts are NOT needed (and the old
    scripts/generate-og.ts has been removed).

  DESIGN (the storybook world, 2026-11-06):
  - The page's canonical storybook card scene (public/brand/storybook/og/<scene>.jpg,
    the same bytes the site serves, chosen in src/data/scenes.mjs) fills the card.
  - The title stands in the scene's own title zone (TITLE_ZONE): open sky or
    grass, picked by hand so it holds no character. A soft parchment scrim sits
    behind the words, clipped to that zone, so it never washes over anyone.
  - The optional tag as a tracked-out fang-red eyebrow; the product's mark
    and the "ouro" wordmark sit at the top, like a storybook's running head.
  - Satori draws the words on a transparent layer; sharp lays it over the scene
    and writes one JPEG. The scene itself is never re-drawn by hand.
*/
import type { APIRoute, GetStaticPaths } from 'astro'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pageOg, slugFor, routePathForSlug, ogSceneForRoute } from '../../data/og'

const fontsDir = join(process.cwd(), 'src/og/fonts')
const cormorantRegular = readFileSync(join(fontsDir, 'CormorantGaramond-Regular.ttf'))
const outfit = readFileSync(join(fontsDir, 'Outfit-Regular.ttf'))

// Light-theme tokens from src/styles/global.css (the warm Ouro palette).
const COLOR = {
  paper: '255, 250, 240',
  fang: '#A8352A',
  ink: '#1A2118',
} as const

const marksDir = join(process.cwd(), 'src/og/marks')
const markCache = new Map<string, string>()
function markSrc(mark: string): string {
  if (!markCache.has(mark)) {
    const png = readFileSync(join(marksDir, `${mark}.png`))
    markCache.set(mark, `data:image/png;base64,${png.toString('base64')}`)
  }
  return markCache.get(mark)!
}

const sceneDir = join(process.cwd(), 'public/brand/storybook/og')

// Where the words may stand in each card scene: [x0, y0, x1, y1] in the 1200x630
// card, hand-picked from public/brand/storybook/og on a 100px grid (taste review
// r2, 2026-11-06). Each zone is open sky, distant hills or open grass, and holds
// no character, so neither the words nor their scrim ever cover Ouro or a friend.
const TITLE_ZONE: Record<string, [number, number, number, number]> = {
  'apple-distribution-kit': [780, 20, 1170, 290],
  'butler': [230, 436, 760, 616],
  'desk': [280, 14, 1170, 142],
  'factory': [480, 20, 1170, 296],
  'flow-review': [40, 20, 740, 256],
  'friends': [40, 14, 1160, 126],
  'friends-relay': [770, 20, 1170, 350],
  'gatefold': [40, 16, 680, 156],
  'homebrew-tap': [690, 8, 1190, 134],
  'm365crawl': [840, 14, 1180, 180],
  'ouro-apps-site': [806, 8, 1190, 174],
  'ouro-hx': [660, 20, 1170, 296],
  'ouro-md': [380, 8, 1190, 148],
  'ouro-native-apple-app-shell': [10, 8, 232, 250],
  'ouro-ui-apple': [30, 16, 390, 196],
  'ouro-ui-core': [30, 14, 840, 146],
  'ouro-work': [800, 8, 1190, 168],
  'ouro-workbench': [880, 16, 1190, 225],
  'ouroboros': [800, 10, 1190, 170],
  'ouroboros-skills': [830, 8, 1190, 228],
  'ouroboros-website': [290, 30, 620, 226],
  'ourostack': [330, 8, 1070, 190],
  'playwright-focus-proof': [30, 16, 520, 310],
  'shepherd': [250, 16, 800, 270],
}
// Busy ground (the butler's flowered lawn) needs a firmer vignette than open sky.
const FIRM_SCRIM: Record<string, number> = { 'butler': 0.9, 'ouro-ui-apple': 0.8, 'ouro-native-apple-app-shell': 0.8 }

// A card can be set in a different framing of the same canonical art: the home
// card takes the whole-world header at card height and slides the window right,
// so the picnic, both robots and the sheep fit whole (taste review r3). The
// art's bytes are only resized and cropped here, never repainted.
const FRAME: Record<string, { file: string; left: number }> = {
  ourostack: { file: 'headers/ourostack.webp', left: 690 },
}

// Inner padding inside a zone, and the running head (mark, wordmark, tag) above the title.
const INSET = 16
const HEAD = 34
const HEAD_GAP = 10
const CHAR_EM = 0.4 // Cormorant runs about 0.4em a character (measured on these cards)

export const getStaticPaths: GetStaticPaths = () => {
  return Object.keys(pageOg).map((routePath) => ({
    params: { slug: slugFor(routePath) },
  }))
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug as string
  const routePath = routePathForSlug(slug)
  if (!routePath) return new Response('Not found', { status: 404 })

  const entry = pageOg[routePath]
  if (!entry) return new Response('Not found', { status: 404 })

  const { title, tag } = entry
  const mark = entry.mark ?? 'ouro'
  const scene = ogSceneForRoute(routePath)

  // The words stand in the scene's own title zone (TITLE_ZONE), never on a character.
  const zone = TITLE_ZONE[scene]
  if (!zone) throw new Error(`og: no title zone for scene ${scene}`)
  const colLeft = zone[0] + INSET
  const colTop = zone[1] + INSET
  const colWidth = zone[2] - zone[0] - INSET * 2
  // The tag rides beside the wordmark, or on its own line under it when the zone is narrow.
  const headWidth = HEAD + 12 + 56 + (tag ? 26 + tag.length * 16 * 0.86 : 0)
  const tagBelow = Boolean(tag) && headWidth > colWidth
  const headH = HEAD + (tagBelow ? 30 : 0)
  const titleRoom = zone[3] - zone[1] - INSET * 2 - headH - HEAD_GAP

  // Balanced lines broken only between words (so "to-do" stays whole), each
  // drawn on its own so none can wrap again. Pick the line count, up to five,
  // whose title is largest while it still fits the zone's width and height.
  const words = title.split(' ')
  const balance = (n: number): string[] => {
    if (n === 1) return [title]
    let best: string[] = [title]
    let bestCost = Infinity
    const go = (from: number, left: number, acc: string[]) => {
      if (left === 1) {
        const lines = [...acc, words.slice(from).join(' ')]
        const cost = Math.max(...lines.map((l) => l.length))
        if (cost < bestCost) { bestCost = cost; best = lines }
        return
      }
      for (let i = from + 1; i <= words.length - left + 1; i++) go(i, left - 1, [...acc, words.slice(from, i).join(' ')])
    }
    go(0, n, [])
    return best
  }
  let lines = [title]
  let titleSize = 0
  for (let n = 1; n <= Math.min(5, words.length); n++) {
    const candidate = balance(n)
    const longest = Math.max(...candidate.map((l) => l.length))
    const size = Math.floor(Math.min(92, colWidth / (longest * CHAR_EM), titleRoom / (n * 1.04)))
    if (size > titleSize) { titleSize = size; lines = candidate }
  }

  const div = (style: Record<string, unknown>, children?: unknown) => ({ type: 'div', props: { style, children } })
  // A soft, edgeless parchment vignette behind the words (taste review r3,
  // 2026-11-06: the old blurred rectangle showed its edges). It is a radial
  // gradient that has faded to nothing before it reaches the zone's edge, so
  // there is no rim to see and nothing washes over a character outside the
  // zone. Each glyph also carries a faint paper glow, so the words read on
  // busy ground without a box.
  const widest = Math.min(colWidth, Math.max(...lines.map((l) => l.length)) * titleSize * CHAR_EM)
  const blockW = Math.min(colWidth, Math.max(widest, tagBelow ? HEAD + 74 : headWidth))
  const blockH = headH + HEAD_GAP + lines.length * titleSize * 1.04
  const cx = colLeft + blockW / 2
  const cy = colTop + blockH / 2
  // Sized from the words, not clipped to the zone: it fades to nothing at its
  // rim, so it never draws an edge, and the zones leave room for its faint fringe.
  const rx = blockW * 0.75 + 30
  const ry = blockH * 0.8 + 24
  const strength = FIRM_SCRIM[scene] ?? 0.62
  const scrimSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="v" cx="${cx}" cy="${cy}" r="${rx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(${cx} ${cy}) scale(1 ${ry / rx}) translate(${-cx} ${-cy})"><stop offset="0" stop-color="rgb(${COLOR.paper})" stop-opacity="${strength}"/><stop offset="0.6" stop-color="rgb(${COLOR.paper})" stop-opacity="${(strength * 0.9).toFixed(3)}"/><stop offset="0.85" stop-color="rgb(${COLOR.paper})" stop-opacity="${(strength * 0.35).toFixed(3)}"/><stop offset="1" stop-color="rgb(${COLOR.paper})" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#v)"/></svg>`
  const glow = `0 0 ${Math.round(titleSize * 0.28)}px rgba(${COLOR.paper}, 0.95)`

  const svg = await satori(
    div({
      width: '1200px',
      height: '630px',
      display: 'flex',
      position: 'relative',
      fontFamily: 'Outfit',
    }, [
      div({
        position: 'absolute',
        left: `${colLeft}px`,
        top: `${colTop}px`,
        width: `${colWidth}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }, [
        // Running head: mark, wordmark, tag
        div({ display: 'flex', alignItems: 'center', gap: '12px', height: `${HEAD}px` }, [
          { type: 'img', props: { src: markSrc(mark), width: HEAD, height: HEAD } },
          div({ display: 'flex', fontFamily: 'Cormorant Garamond', fontWeight: 400, fontSize: '30px', color: COLOR.ink, lineHeight: 1 }, 'ouro'),
          ...(tag && !tagBelow ? [
            div({ display: 'flex', width: '2px', height: '24px', background: 'rgba(26, 33, 24, 0.25)', marginLeft: '6px', marginRight: '6px' }),
            div({ display: 'flex', fontSize: '16px', letterSpacing: '0.2em', textTransform: 'uppercase', color: COLOR.fang }, tag),
          ] : []),
        ]),
        ...(tagBelow ? [div({ display: 'flex', marginTop: '8px', height: '22px', fontSize: '17px', letterSpacing: '0.18em', textTransform: 'uppercase', color: COLOR.fang, whiteSpace: 'nowrap' }, tag)] : []),
        div({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginTop: `${HEAD_GAP}px`,
          fontFamily: 'Cormorant Garamond',
          fontWeight: 400,
          fontSize: `${titleSize}px`,
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          color: COLOR.ink,
          textShadow: glow,
        }, lines.map((line) => div({ display: 'flex', whiteSpace: 'nowrap' }, line))),
      ]),
    ]),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Cormorant Garamond', data: cormorantRegular, weight: 400, style: 'normal' as const },
        { name: 'Outfit', data: outfit, weight: 400, style: 'normal' as const },
      ],
    }
  )

  const wordsLayer = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  const frame = FRAME[scene]
  const base = frame
    ? await sharp(join(process.cwd(), 'public/brand/storybook', frame.file)).resize({ height: 630 }).extract({ left: frame.left, top: 0, width: 1200, height: 630 }).toBuffer()
    : join(sceneDir, `${scene}.jpg`)
  const jpeg = await sharp(base)
    .composite([{ input: Buffer.from(scrimSvg) }, { input: Buffer.from(wordsLayer) }])
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
