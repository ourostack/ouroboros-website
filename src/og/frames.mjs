// Card frames for the share cards (src/pages/og/[...slug].jpg.ts), kept in a
// plain module so tests/share-cards.test.mjs can render and measure them.
// The art's bytes are only resized and cropped here, never repainted.
import sharp from 'sharp'

export const W = 1200
export const H = 630

// The light theme's page colour (--color-void in src/styles/global.css) and a
// gold rule in the trail's own gold, for the title plate.
export const PLATE = { paper: '#F5EFE0', gold: '#E2B44D', goldEdge: '#B8862B', rule: 4 }

// The title plate (taste review r13, Ari's ruling for the Butler, and since
// 2026-11-08 every card whose cast is wider than a card-height window): the
// title stands on a clean, solid plate in the light theme's page colour across
// the top, like a book's title page, with a thin gold rule along its lower edge. The canonical header stands below it at
// full strength and full width; the plate's edge frames the roof the way a
// picture frame does. No gradient, no wash, no made-up sky.
export async function plateFrame(src) {
  const scene = await sharp(src).resize({ width: W }).removeAlpha().toBuffer()
  const sceneH = (await sharp(scene).metadata()).height
  const plateH = H - sceneH
  const { paper, gold, goldEdge, rule } = PLATE
  const plate = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${plateH}"><rect width="${W}" height="${plateH}" fill="${paper}"/><rect y="${plateH - rule}" width="${W}" height="${rule - 1}" fill="${gold}"/><rect y="${plateH - 1}" width="${W}" height="1" fill="${goldEdge}"/></svg>`)
  const base = await sharp({ create: { width: W, height: H, channels: 3, background: paper } })
    .composite([{ input: plate, top: 0, left: 0 }, { input: scene, top: plateH, left: 0 }])
    .png()
    .toBuffer()
  return { base, plateH }
}

// The feature card (2026-11-11, for the few pages shared widely on their own):
// the words stand on the same solid cream plate down the card's left side, with
// the gold rule along its right edge, and a card-height window of the canonical
// header stands beside it at full strength, so the cast reads large even as a
// thumbnail. The header is only resized and cropped: `height` scales it, and
// `left` slides the window to its cast.
export async function featureFrame(src, { plateW, height = H, left }) {
  const artW = W - plateW
  const scaled = await sharp(src).resize({ height }).removeAlpha().toBuffer()
  const { width: sw, height: sh } = await sharp(scaled).metadata()
  if (left < 0 || left + artW > sw || sh < H) throw new Error(`og: the feature window ${left}+${artW} misses the ${sw}x${sh} header ${src}`)
  const art = await sharp(scaled).extract({ left, top: sh - H, width: artW, height: H }).toBuffer()
  const { paper, gold, goldEdge, rule } = PLATE
  const plate = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${plateW}" height="${H}"><rect width="${plateW}" height="${H}" fill="${paper}"/><rect x="${plateW - rule}" width="${rule - 1}" height="${H}" fill="${gold}"/><rect x="${plateW - 1}" width="1" height="${H}" fill="${goldEdge}"/></svg>`)
  const base = await sharp({ create: { width: W, height: H, channels: 3, background: paper } })
    .composite([{ input: plate, top: 0, left: 0 }, { input: art, top: 0, left: plateW }])
    .png()
    .toBuffer()
  return { base, plateW }
}
