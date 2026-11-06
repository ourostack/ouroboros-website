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
  - The title stands where Ouro is not: on the scene's free side (OURO_IN_SCENE),
    over a soft local parchment scrim that fades out well before him. No wash
    across the whole card, so the scene keeps its colour.
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

// Where Ouro stands in each card scene: [left x, right x, top y] in the 1200x630
// card, measured from his green in public/brand/storybook/og (2026-11-06).
const OURO_IN_SCENE: Record<string, [number, number, number]> = {
  'butler': [747, 1118, 147],
  'desk': [747, 1055, 191],
  'factory': [920, 1199, 249],
  'flow-review': [777, 1154, 136],
  'friends': [422, 778, 210],
  'friends-relay': [636, 856, 379],
  'gatefold': [700, 1081, 115],
  'homebrew-tap': [718, 1136, 134],
  'm365crawl': [782, 1115, 191],
  'ouro-apps-site': [696, 1059, 170],
  'ouro-hx': [820, 1094, 314],
  'ouro-md': [727, 1036, 158],
  'ouro-ui-apple': [775, 1199, 120],
  'ouro-ui-core': [865, 1199, 121],
  'ouro-work': [786, 1171, 171],
  'ouro-workbench': [936, 1186, 243],
  'ouroboros': [805, 1101, 275],
  'ouroboros-skills': [478, 887, 125],
  'ouroboros-website': [724, 1103, 171],
  'ourostack': [94, 545, 130],
  'playwright-focus-proof': [789, 1196, 186],
  'shepherd': [809, 1180, 101],
}
const PAD = 64
const GAP = 40

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

  // The title stands where Ouro is not. Each scene's Ouro box (measured from
  // his green in public/brand/storybook/og, 2026-11-06) leaves a free side; the
  // words take that side's column, or the whole sky when Ouro sits low.
  const ouro = OURO_IN_SCENE[scene] ?? [700, 1100, 150]
  const [ox0, ox1, oy0] = ouro
  const freeLeft = ox0 - PAD - GAP
  const freeRight = 1200 - ox1 - PAD - GAP
  const low = oy0 >= 300
  const side: 'left' | 'right' = low || freeLeft >= freeRight ? 'left' : 'right'
  const colWidth = low ? 1072 : Math.min(1072, side === 'left' ? freeLeft : freeRight)
  const colLeft = side === 'left' ? PAD : 1200 - PAD - colWidth

  // Balanced lines broken only between words (so "to-do" stays whole), each
  // drawn on its own so none can wrap again. Cormorant runs about 0.4em a
  // character (measured on these cards): pick the fewest lines, up to four, that still read large.
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
  for (let n = 1; n <= Math.min(4, words.length); n++) {
    const candidate = balance(n)
    const longest = Math.max(...candidate.map((l) => l.length))
    const size = Math.min(92, Math.floor(colWidth / (longest * 0.4)))
    if (size > titleSize) { titleSize = size; lines = candidate }
    if (size >= 72) break
  }

  const div = (style: Record<string, unknown>, children?: unknown) => ({ type: 'div', props: { style, children } })
  const blockHeight = 46 + 22 + lines.length * titleSize * 1.04
  // A soft local scrim of parchment behind the words only: a blurred rounded
  // block that fades out before Ouro, so the scene keeps its own colour elsewhere.
  const widest = Math.min(colWidth, Math.max(...lines.map((l) => l.length)) * titleSize * 0.4)
  const scrimX = side === 'right' ? colLeft + colWidth - widest - 36 : colLeft - 36
  const scrimSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter></defs><rect x="${Math.round(scrimX)}" y="10" width="${Math.round(widest + 72)}" height="${Math.round(blockHeight + 60)}" rx="48" fill="rgb(${COLOR.paper})" fill-opacity="0.8" filter="url(#b)"/></svg>`

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
        top: '44px',
        width: `${colWidth}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'right' ? 'flex-end' : 'flex-start',
      }, [
        // Running head: mark, wordmark, tag
        div({ display: 'flex', alignItems: 'center', gap: '14px' }, [
          { type: 'img', props: { src: markSrc(mark), width: 46, height: 46 } },
          div({ display: 'flex', fontFamily: 'Cormorant Garamond', fontWeight: 400, fontSize: '38px', color: COLOR.ink, lineHeight: 1 }, 'ouro'),
          ...(tag ? [
            div({ display: 'flex', width: '2px', height: '26px', background: 'rgba(26, 33, 24, 0.25)', marginLeft: '8px', marginRight: '8px' }),
            div({ display: 'flex', fontSize: '21px', letterSpacing: '0.22em', textTransform: 'uppercase', color: COLOR.fang }, tag),
          ] : []),
        ]),
        div({
          display: 'flex',
          flexDirection: 'column',
          alignItems: side === 'right' ? 'flex-end' : 'flex-start',
          marginTop: '22px',
          fontFamily: 'Cormorant Garamond',
          fontWeight: 400,
          fontSize: `${titleSize}px`,
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          color: COLOR.ink,
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
  const jpeg = await sharp(join(sceneDir, `${scene}.jpg`))
    .composite([{ input: Buffer.from(scrimSvg) }, { input: Buffer.from(wordsLayer) }])
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
