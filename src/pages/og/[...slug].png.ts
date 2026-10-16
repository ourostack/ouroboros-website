/*
  Dynamic Open Graph image endpoint.

  HOW IT WORKS:
  - This endpoint is the SINGLE source of OG image rendering for the site.
  - It reads from src/data/og.ts (the page metadata manifest) and renders
    one PNG per entry at build time via getStaticPaths.
  - On every push to main, Cloudflare Pages runs `astro build`, which calls
    getStaticPaths() once and pre-renders every OG image to dist/og/og-*.png.
  - The result: OG images are always in sync with the latest copy in
    src/data/og.ts. Update copy in one place, push, done.
  - Manual regeneration scripts are NOT needed (and the old
    scripts/generate-og.ts has been removed).

  DESIGN (the Ouro brand, light theme):
  - Warm paper background, a scale-green rule across the top
  - Sentence-case title in Cormorant Garamond, subtitle in Outfit
  - Optional tag as a tracked-out fang-red eyebrow
  - The page's product mark (an approved rich render) on the right, and the
    "ouro" wordmark bottom left; see `mark` in src/data/og.ts
*/
import type { APIRoute, GetStaticPaths } from 'astro'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pageOg, slugFor, routePathForSlug } from '../../data/og'

const fontsDir = join(process.cwd(), 'src/og/fonts')
const cormorantRegular = readFileSync(join(fontsDir, 'CormorantGaramond-Regular.ttf'))
const outfit = readFileSync(join(fontsDir, 'Outfit-Regular.ttf'))

// Light-theme tokens from src/styles/global.css (the warm Ouro palette).
const COLOR = {
  paper: '#FFFAF0',
  cream: '#F5EFE0',
  line: '#ECE3CC',
  scale: '#1F6A37',
  fang: '#A8352A',
  ink: '#1A2118',
  mist: '#3D4839',
} as const

// The approved rich renders, exported at card size (src/og/marks, from
// ouro-public-web icons/final). Satori embeds PNG data URIs.
const marksDir = join(process.cwd(), 'src/og/marks')
const markCache = new Map<string, string>()
function markSrc(mark: string): string {
  if (!markCache.has(mark)) {
    const png = readFileSync(join(marksDir, `${mark}.png`))
    markCache.set(mark, `data:image/png;base64,${png.toString('base64')}`)
  }
  return markCache.get(mark)!
}

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

  const { title, subtitle, tag } = entry
  const mark = entry.mark ?? 'ouro'

  // Bigger when shorter, so the title still reads when a feed shrinks the
  // card to ~300px wide.
  const titleSize =
    title.length > 60 ? 62 :
    title.length > 40 ? 72 :
    title.length > 25 ? 84 : 96

  const div = (style: Record<string, unknown>, children?: unknown) => ({ type: 'div', props: { style, children } })

  const svg = await satori(
    div({
      width: '1200px',
      height: '630px',
      display: 'flex',
      position: 'relative',
      background: `linear-gradient(160deg, ${COLOR.paper} 0%, ${COLOR.cream} 100%)`,
      fontFamily: 'Outfit',
      overflow: 'hidden',
    }, [
      div({ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: COLOR.scale }),
      // Text column
      div({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '760px',
        padding: '64px 0 120px 80px',
      }, [
        ...(tag ? [div({
          display: 'flex',
          fontSize: '22px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: COLOR.fang,
          marginBottom: '28px',
        }, tag)] : []),
        div({
          display: 'flex',
          fontFamily: 'Cormorant Garamond',
          fontWeight: 400,
          fontSize: `${titleSize}px`,
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          color: COLOR.ink,
        }, title),
        ...(subtitle ? [div({
          display: 'flex',
          fontSize: '27px',
          lineHeight: 1.4,
          color: COLOR.mist,
          marginTop: '28px',
        }, subtitle)] : []),
      ]),
      // Product mark
      div({
        position: 'absolute',
        right: '72px',
        top: '0',
        bottom: '40px',
        width: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }, [{ type: 'img', props: { src: markSrc(mark), width: 320, height: 320 } }]),
      // Wordmark
      div({
        position: 'absolute',
        left: '80px',
        bottom: '48px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }, [
        ...(mark === 'ouro' ? [] : [{ type: 'img', props: { src: markSrc('ouro'), width: 48, height: 48 } }]),
        div({ display: 'flex', fontFamily: 'Cormorant Garamond', fontWeight: 400, fontSize: '40px', color: COLOR.ink }, 'ouro'),
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

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  const pngBuffer = resvg.render().asPng()

  return new Response(pngBuffer, {
    headers: { 'Content-Type': 'image/png' },
  })
}
