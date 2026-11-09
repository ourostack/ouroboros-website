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
    grass, picked by hand so it holds no character, or a solid title plate
    above the whole scene. Nothing is laid over the art: no scrim, no wash, no
    fade (Ari, 2026-11-08: no picture fades to nothing). Each glyph carries a
    faint paper glow, so the words read on the sky.
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
import { plateFrame } from '../../og/frames.mjs'

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
// card (after any FRAME below), hand-picked on a 100px grid (taste review r2,
// re-picked in r5 so every title fits at the one TITLE_SIZE). Each zone is open
// sky, distant hills or open grass, and holds no character, post, vine or
// lantern, so the words never cover anything drawn.
const TITLE_ZONE: Record<string, [number, number, number, number]> = {
  'apple-distribution-kit': [780, 6, 1194, 290],
  // On its title plate (180px tall, gold rule at its foot): the words centred in it.
  'butler': [16, 30, 1194, 172],
  'desk': [280, 6, 1194, 172],
  // The plate cards below set their words as the butler's does.
  'factory': [16, 30, 1194, 172],
  'flow-review': [16, 6, 760, 268],
  'friends': [40, 4, 1160, 132],
  // The dovecote's art is a touch taller, so its plate is 150px.
  'friends-relay': [16, 14, 1194, 142],
  'gatefold': [16, 6, 1194, 140],
  'homebrew-tap': [16, 30, 1194, 172],
  // On its title plate, like the butler's.
  'housesitter': [16, 30, 1194, 172],
  'm365crawl': [820, 6, 1194, 196],
  'ouro-apps-site': [560, 4, 1196, 166],
  'ouro-hx': [640, 6, 1194, 316],
  'ouro-md': [390, 6, 1194, 190],
  'ouro-native-apple-app-shell': [720, 6, 1194, 240],
  'ouro-ui-apple': [16, 30, 1194, 172],
  'ouro-ui-core': [16, 30, 1194, 172],
  'ouro-work': [800, 6, 1194, 172],
  'ouro-workbench': [760, 6, 1194, 270],
  'ouroboros': [680, 6, 1194, 180],
  'ouroboros-skills': [830, 6, 1194, 240],
  'ouroboros-website': [770, 6, 1194, 196],
  'ourostack': [330, 6, 1060, 190],
  'playwright-focus-proof': [16, 30, 1194, 172],
  'shepherd': [240, 6, 800, 250],
}
// A card can be set in a different framing of the same canonical art: the home
// card takes the whole-world header at card height and slides the window right,
// so the picnic, both robots and the sheep fit whole (taste review r3). The
// art's bytes are only resized and cropped here, never repainted.
// Taste review r5 reframed three more: the workbench zooms in a little so its
// open sky clears the timber post, vines and lantern; the shell and the apps
// stall slide right so the words get the wide sunset sky instead of a sliver.
// Taste review r5 found three scenes whose cast is wider than any card-height
// window: the canonical card crop cut the robot's head (Ouro UI for Apple), Ouro's
// coil (the paint pots) and the person at her laptop (the focus proof). Those,
// and the three below, stand on a title plate: the whole header, scaled to the
// card's width, stands at the foot of the card at full strength, and above it
// is a solid cream plate with a thin gold rule (src/og/frames.mjs, plateFrame),
// so every character is whole and the title has a clean ground. A made-up sky
// would need the art to fade into it, and no picture fades.
type PlateFrame = { file: string; plate: true }
const FRAME: Record<string, { file: string; left: number; height?: number } | PlateFrame> = {
  ourostack: { file: 'headers/ourostack.webp', left: 690 },
  'ouro-workbench': { file: 'headers/ouro-workbench.webp', left: 816, height: 756 },
  'ouro-native-apple-app-shell': { file: 'headers/ouro-native-apple-app-shell.webp', left: 480 },
  'ouro-apps-site': { file: 'headers/ouro-apps-site.webp', left: 480 },
  'ouro-ui-apple': { file: 'headers/ouro-ui-apple.webp', plate: true },
  'ouro-ui-core': { file: 'headers/ouro-ui-core.webp', plate: true },
  'playwright-focus-proof': { file: 'headers/playwright-focus-proof.webp', plate: true },
  // The same sweep found three more: the factory's card cut Ouro's tail at the
  // right, the dovecote's cut the robot waving at the left, and the still's
  // barrel stood behind the title.
  factory: { file: 'headers/factory.webp', plate: true },
  'friends-relay': { file: 'headers/friends-relay.webp', plate: true },
  'homebrew-tap': { file: 'headers/homebrew-tap.webp', plate: true },
  // The butler's cottage roof runs to the very top of its art, so there is no
  // real sky to set a title in, and any sky made from the top rows dissolves
  // the roof (flagged in taste reviews r7, r12 and r13). Ari's ruling (r14):
  // the storybook title plate.
  butler: { file: 'headers/butler.webp', plate: true },
  // The housesitter's chimney meets the top of its art too, and its only open sky sits
  // beside Ouro's lantern, too narrow for a title: the same plate.
  housesitter: { file: 'headers/housesitter.webp', plate: true },
}

// Inner padding inside a zone, and the running head (mark, wordmark, tag) above the title.
const INSET = 10
const HEAD = 34
const HEAD_GAP = 8
const CHAR_EM = 0.4 // Cormorant runs about 0.4em a character (measured on these cards)
// One type scale on every card (taste review r5): the title is always this size,
// and only the line count changes. A zone too small for it fails the build.
export const TITLE_SIZE = 46

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
  // drawn on its own so none can wrap again. Take the fewest lines, up to five,
  // that fit the zone's width at TITLE_SIZE, and check they fit its height.
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
  const titleSize = TITLE_SIZE
  let lines: string[] | null = null
  for (let n = 1; n <= Math.min(5, words.length) && !lines; n++) {
    const candidate = balance(n)
    const longest = Math.max(...candidate.map((l) => l.length))
    if (longest * CHAR_EM * titleSize <= colWidth && n * titleSize * 1.04 <= titleRoom) lines = candidate
  }
  if (!lines) throw new Error(`og: "${title}" does not fit the ${scene} title zone at ${TITLE_SIZE}px`)

  const div = (style: Record<string, unknown>, children?: unknown) => ({ type: 'div', props: { style, children } })
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
  const framePath = frame ? join(process.cwd(), 'public/brand/storybook', frame.file) : ''
  const base = frame && 'plate' in frame
    ? (await plateFrame(framePath)).base
    : frame
    ? await sharp(join(process.cwd(), 'public/brand/storybook', frame.file)).resize({ height: frame.height ?? 630 }).extract({ left: frame.left, top: 0, width: 1200, height: 630 }).toBuffer()
    : join(sceneDir, `${scene}.jpg`)
  const jpeg = await sharp(base)
    .composite([{ input: Buffer.from(wordsLayer) }])
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
