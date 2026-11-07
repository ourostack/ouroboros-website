// Paints each storybook scene's placeholder: a tiny, soft preview of the art
// itself, so a scene that is slow, or fails outright, still shows its own dawn
// (taste review r10, 2026-11-06: a brief Cloudflare 503 left /apps/'s hero
// showing alt text on a beige box). StoryScene.astro sets it as the scene's
// background; the browser's smooth upscaling blurs it into a wash of the
// scene's own sky, hills and meadow.
//
//   node scripts/scene-paint.mjs          (after scripts/sync-storybook.mjs)
//
// Reads the served art in public/brand/storybook/ (the wide header and the
// phone crop) and writes src/data/scene-paint.json: for every scene the site
// uses, a WebP data URI of each, a few hundred bytes, and the sha256 of the
// file it was painted from, so tests/storybook.test.mjs notices when the art
// changes and the paint has not been redone. The served art is never touched.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { usedScenes } from '../src/data/scenes.mjs'

const root = join(import.meta.dirname, '..')
const art = join(root, 'public', 'brand', 'storybook')
// 16 pixels across: enough for the sun, the hills and the meadow to sit where
// they sit in the art, few enough that it reads as paint, not as a picture.
const ACROSS = 16

async function paint(file) {
  const bytes = readFileSync(join(art, file))
  const { width, height } = await sharp(bytes).metadata()
  const down = Math.max(1, Math.round((ACROSS * height) / width))
  const webp = await sharp(bytes).resize(ACROSS, down, { fit: 'fill', kernel: 'lanczos3' }).webp({ quality: 70, smartSubsample: true }).toBuffer()
  return {
    from: file,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    uri: `data:image/webp;base64,${webp.toString('base64')}`,
  }
}

// The art's foot, mirrored: its last few rows, flipped so the row next to
// the art's edge is the art's own last row, and shrunk to a soft strip. A
// hero whose cast stands on that foot lays it below the art as an apron
// (heroFrame() in src/data/scenes.mjs; taste review r11), so the meadow's
// own colours run straight on and blur away. Several rows tall, not one
// averaged row stretched (taste review r14: that smeared the picnic blanket
// into a flat ochre band on /lab/why/).
const FOOT_ROWS = 0.1
const FOOT_ACROSS = 48
const FOOT_DOWN = 6
async function foot(file) {
  const bytes = readFileSync(join(art, file))
  const { width, height } = await sharp(bytes).metadata()
  const rows = Math.max(2, Math.round(height * FOOT_ROWS))
  const webp = await sharp(bytes).extract({ left: 0, top: height - rows, width, height: rows }).flip().resize(FOOT_ACROSS, FOOT_DOWN, { fit: 'fill', kernel: 'lanczos3' }).webp({ quality: 80 }).toBuffer()
  return {
    from: file,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    uri: `data:image/webp;base64,${webp.toString('base64')}`,
  }
}

const out = {}
for (const scene of usedScenes()) {
  out[scene] = { wide: await paint(`headers/${scene}.webp`), phone: await paint(`phone/${scene}-384.webp`), foot: await foot(`headers/${scene}.webp`) }
}
writeFileSync(join(root, 'src', 'data', 'scene-paint.json'), JSON.stringify(out, null, 2) + '\n')
const sizes = Object.values(out).flatMap((p) => [p.wide.uri.length, p.phone.uri.length])
console.log(`painted ${Object.keys(out).length} scenes; data URIs ${Math.min(...sizes)}-${Math.max(...sizes)} characters`)
