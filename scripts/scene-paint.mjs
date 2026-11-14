// Paints each storybook scene's placeholder: the art's own main colour, so a
// scene that is slow, or fails outright, still shows its own sky or meadow
// (taste review r10, 2026-11-06: a brief Cloudflare 503 left /apps/'s hero
// showing alt text on a beige box). StoryScene.astro sets it as the scene's
// background and PageHero.astro as the Hero picture's `placeholder`, as Ouro
// HX's Hero advises. A colour, not a tiny upscaled picture: Ouro check counts
// a 16px picture drawn across the page as a blurry image, whatever it is for.
//
//   node scripts/scene-paint.mjs          (after scripts/sync-storybook.mjs)
//
// Reads the served wide art in public/brand/storybook/headers/ and writes
// src/data/scene-paint.json: for every scene the site uses, the dominant
// colour of its art and the sha256 of the file it came from, so
// tests/storybook.test.mjs notices when the art changes and the paint has not
// been redone. The served art is never touched.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { usedScenes } from '../src/data/scenes.mjs'

const root = join(import.meta.dirname, '..')
const art = join(root, 'public', 'brand', 'storybook')
const hex = (n) => n.toString(16).padStart(2, '0')

async function paint(file) {
  const bytes = readFileSync(join(art, file))
  const { dominant: { r, g, b } } = await sharp(bytes).stats()
  return { from: file, sha256: createHash('sha256').update(bytes).digest('hex'), colour: `#${hex(r)}${hex(g)}${hex(b)}` }
}

const out = {}
for (const scene of usedScenes()) out[scene] = await paint(`headers/${scene}.webp`)
writeFileSync(join(root, 'src', 'data', 'scene-paint.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`painted ${Object.keys(out).length} scenes`)
