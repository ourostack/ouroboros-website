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
  - Morning mist rises from the top edge: a parchment wash that keeps the
    sentence-case Cormorant title legible, then clears before the characters.
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

  // Keep the sky clear for the characters: one line across the top when it
  // still reads at feed size, else two balanced lines. Cormorant runs about
  // 0.45em a character; the text column is 1072px wide.
  const oneLine = Math.min(92, Math.floor(1072 / (title.length * 0.45)))
  const titleSize = oneLine >= 54 ? oneLine : title.length > 52 ? 58 : 64

  // One line, or two balanced lines broken only between words (so "to-do"
  // stays whole), each drawn on its own so no line can wrap again.
  const words = title.split(' ')
  let lines = [title]
  if (oneLine < 54) {
    let best = 1
    for (let i = 1; i < words.length; i++) {
      const cost = (k: number) => Math.max(words.slice(0, k).join(' ').length, words.slice(k).join(' ').length)
      if (cost(i) < cost(best)) best = i
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  }

  const div = (style: Record<string, unknown>, children?: unknown) => ({ type: 'div', props: { style, children } })

  const svg = await satori(
    div({
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'Outfit',
      // The morning mist: solid parchment behind the words, clear by the meadow.
      backgroundImage: `linear-gradient(180deg, rgba(${COLOR.paper}, 0.94) 0%, rgba(${COLOR.paper}, 0.86) 30%, rgba(${COLOR.paper}, 0.5) 44%, rgba(${COLOR.paper}, 0) 60%)`,
      padding: '44px 64px 0 64px',
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
        marginTop: '22px',
        maxWidth: '1072px',
        fontFamily: 'Cormorant Garamond',
        fontWeight: 400,
        fontSize: `${titleSize}px`,
        lineHeight: 1.02,
        letterSpacing: '-0.01em',
        color: COLOR.ink,
      }, lines.map((line) => div({ display: 'flex', whiteSpace: 'nowrap' }, line))),
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
    .composite([{ input: Buffer.from(wordsLayer) }])
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
