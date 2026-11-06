// Copies the storybook art this site uses, byte for byte, from a checkout of
// ourostack/.github's brand/ folder into public/brand/storybook/, and checks
// every file against that folder's provenance.json. Never re-encode these
// files: the brand audit compares the served bytes with provenance.json.
//
//   node scripts/sync-storybook.mjs /path/to/ourostack-.github/brand
//
// The scenes to copy come from src/data/scenes.mjs (every scene a page uses).
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { usedScenes } from '../src/data/scenes.mjs'

const brand = process.argv[2]
if (!brand || !existsSync(join(brand, 'provenance.json'))) {
  console.error('usage: node scripts/sync-storybook.mjs <ourostack/.github brand folder>')
  process.exit(1)
}
const out = join(import.meta.dirname, '..', 'public', 'brand', 'storybook')
const provenance = JSON.parse(readFileSync(join(brand, 'provenance.json'), 'utf8'))
const shaOf = new Map(provenance.map((entry) => [entry.file, entry.sha256]))

export const filesForScene = (scene) => [
  `headers/${scene}.webp`,
  `scenes/${scene}-640.webp`, `scenes/${scene}-640.avif`,
  `scenes/${scene}-960.webp`, `scenes/${scene}-960.avif`,
  `scenes/${scene}-1536.avif`,
  `phone/${scene}-384.webp`, `phone/${scene}-384.avif`,
  `phone/${scene}-768.webp`, `phone/${scene}-768.avif`,
  `og/${scene}.jpg`,
]
const files = [
  'icons/ouro.svg', 'icons/ouro-180.png', 'icons/ouro-192.png', 'icons/ouro-512.png',
  ...usedScenes().flatMap(filesForScene),
]

const shipped = []
for (const file of files) {
  const expected = shaOf.get(file)
  if (!expected) throw new Error(`${file} is not in provenance.json`)
  const source = join(brand, file)
  const actual = createHash('sha256').update(readFileSync(source)).digest('hex')
  if (actual !== expected) throw new Error(`${file}: sha256 ${actual} does not match provenance ${expected}`)
  mkdirSync(dirname(join(out, file)), { recursive: true })
  copyFileSync(source, join(out, file))
  shipped.push(provenance.find((entry) => entry.file === file))
}
// The served provenance lists exactly the files served here, so anyone can check them.
writeFileSync(join(out, 'provenance.json'), JSON.stringify(shipped, null, 2) + '\n')
console.log(`copied ${files.length} files into public/brand/storybook`)
