// Card frames for the share cards (src/pages/og/[...slug].jpg.ts), kept in a
// plain module so tests/share-cards.test.mjs can render and measure them.
// The art's bytes are only resized and cropped here, never repainted.
import sharp from 'sharp'

export const W = 1200
export const H = 630

// The light theme's page colour (--color-void in src/styles/global.css) and a
// gold rule in the trail's own gold, for the Butler's title plate.
export const PLATE = { paper: '#F5EFE0', gold: '#E2B44D', goldEdge: '#B8862B', rule: 4 }

// A tiny, fixed grain (the same on every build), about the art's own grain, so
// a smooth sky never bands in the JPEG.
function grain(buf, amount = 2.2) {
  let seed = 0x2f6b9d
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < buf.length; i += 3) {
    const n = (rand() + rand() - 1) * amount
    for (let c = 0; c < 3; c++) buf[i + c] = Math.max(0, Math.min(255, Math.round(buf[i + c] + n)))
  }
  return buf
}

// The sky frame (taste review r5, re-built in r14): the header at card width
// (1200x450) stands at the foot of the card, and the sky above it is one smooth
// gradient sampled from the art's averaged top band. Taste review r13 found
// vertical streaks where the old sky stretched each column's top pixels; this
// sky has no per-column detail at all. Across the card it eases between a few
// broad samples of the top band (the sunset still glows where the sun is); up
// the card it eases from the art's own top edge toward the band's overall
// colour, so the very top is calmest. The scene's top melts in over `seam` px.
export async function skyFrame(src, { seam = 32, stops = 6 } = {}) {
  const scene = await sharp(src).resize({ width: W }).removeAlpha().toBuffer()
  const sceneH = (await sharp(scene).metadata()).height
  const band = H - sceneH
  const ROWS = 14
  const { data } = await sharp(scene).extract({ left: 0, top: 0, width: W, height: ROWS }).raw().toBuffer({ resolveWithObject: true })
  // Broad samples across the top band: `stops` equal slices, each averaged.
  const samples = Array.from({ length: stops }, (_, i) => {
    const x0 = Math.round((i * W) / stops)
    const x1 = Math.round(((i + 1) * W) / stops)
    const sum = [0, 0, 0]
    for (let y = 0; y < ROWS; y++) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) sum[c] += data[(y * W + x) * 3 + c]
    return sum.map((s) => s / (ROWS * (x1 - x0)))
  })
  const mean = [0, 1, 2].map((c) => samples.reduce((s, v) => s + v[c], 0) / stops)
  const ease = (t) => t * t * (3 - 2 * t)
  // The colour at x along the bottom of the sky: smoothstep between slice centres.
  const across = (x) => {
    const p = (x / W) * stops - 0.5
    const i = Math.max(0, Math.min(stops - 2, Math.floor(p)))
    const t = ease(Math.max(0, Math.min(1, p - i)))
    return [0, 1, 2].map((c) => samples[i][c] + (samples[i + 1][c] - samples[i][c]) * t)
  }
  const skyH = band + seam
  const sky = Buffer.alloc(W * skyH * 3)
  const row = Array.from({ length: W }, (_, x) => across(x))
  for (let y = 0; y < skyH; y++) {
    // 0 at the top of the card (the band's mean), 1 where the art begins.
    const v = ease(Math.min(1, y / band)) * 0.75 + 0.25
    for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
      sky[(y * W + x) * 3 + c] = Math.round(mean[c] + (row[x][c] - mean[c]) * v)
    }
  }
  grain(sky)
  const skyPng = await sharp(sky, { raw: { width: W, height: skyH, channels: 3 } }).png().toBuffer()
  const fadeStops = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    return `<stop offset="${((t * seam) / sceneH).toFixed(4)}" stop-color="#fff" stop-opacity="${ease(t).toFixed(3)}"/>`
  }).join('')
  const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${sceneH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${fadeStops}</linearGradient></defs><rect width="${W}" height="${sceneH}" fill="url(#g)"/></svg>`)
  const faded = await sharp(scene).ensureAlpha().composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer()
  const base = await sharp({ create: { width: W, height: H, channels: 3, background: '#F3C6A8' } })
    .composite([{ input: skyPng, top: 0, left: 0 }, { input: faded, top: band, left: 0 }])
    .png()
    .toBuffer()
  return { base, band }
}

// The title plate (taste review r13, Ari's ruling for the Butler): the art has
// no sky above the cottage, so the title stands on a clean, solid plate in the
// light theme's page colour across the top, like a book's title page, with a
// thin gold rule along its lower edge. The canonical header stands below it at
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
