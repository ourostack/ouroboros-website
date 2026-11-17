// Copies the storybook art this site uses, byte for byte, from ourostack/.github's
// brand/ folder into public/brand/storybook/, and checks every file against that
// folder's provenance.json. Never re-encode these files: the brand audit compares
// the served bytes with provenance.json.
//
//   node scripts/sync-storybook.mjs /path/to/ourostack-.github/brand
//   node scripts/sync-storybook.mjs --from-github [ref]   # downloads only the files this site uses (default: main)
//   ... --out <dir>                                       # write there instead of public/brand/storybook
//
// --from-github is what .github/workflows/sync-brand.yml runs. BRAND_RAW_BASE
// replaces https://raw.githubusercontent.com/ourostack/.github (tests/sync-storybook.test.mjs).
// The scenes to copy come from src/data/scenes.mjs (every scene a page uses).
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { usedScenes, largeAvifWidths, largeWebpWidths, meadowScene, darkScenes } from '../src/data/scenes.mjs'

const argv = process.argv.slice(2)
const flag = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1] }
const outFlag = flag('--out')
const github = argv.includes('--from-github')
const ref = github && argv[argv.indexOf('--from-github') + 1] && !argv[argv.indexOf('--from-github') + 1].startsWith('--') ? argv[argv.indexOf('--from-github') + 1] : 'main'
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out' && argv[i - 1] !== '--from-github')[0]
const rawBase = process.env.BRAND_RAW_BASE ?? 'https://raw.githubusercontent.com/ourostack/.github'

async function download(sha, rel, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${rawBase}/${sha}/brand/${rel}`)
      if (!res.ok) throw new Error(`${rel} answered ${res.status}`)
      mkdirSync(dirname(to), { recursive: true })
      writeFileSync(to, Buffer.from(await res.arrayBuffer()))
      return
    } catch (err) {
      if (attempt >= 3) throw err
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

// Resolves the ref to one commit first, so every file comes from the same one.
async function commitOf(r) {
  if (/^[0-9a-f]{40}$/.test(r)) return r
  const res = await fetch(`https://api.github.com/repos/ourostack/.github/commits/${r}`, { headers: { accept: 'application/vnd.github.sha', ...(process.env.GH_TOKEN ? { authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) } })
  if (!res.ok) throw new Error(`${r} did not resolve (${res.status})`)
  return (await res.text()).trim()
}

let brand = positional
let commit
if (github) {
  commit = await commitOf(ref)
  brand = mkdtempSync(join(tmpdir(), 'brand-'))
  await download(commit, 'provenance.json', join(brand, 'provenance.json'))
}
if (!brand || !existsSync(join(brand, 'provenance.json'))) {
  console.error('usage: node scripts/sync-storybook.mjs <ourostack/.github brand folder> | --from-github [ref]  [--out <dir>]')
  process.exit(1)
}
const out = outFlag ?? join(import.meta.dirname, '..', 'public', 'brand', 'storybook')
const provenance = JSON.parse(readFileSync(join(brand, 'provenance.json'), 'utf8'))
const shaOf = new Map(provenance.map((entry) => [entry.file, entry.sha256]))

export const filesForScene = (scene) => [
  `headers/${scene}.webp`,
  `scenes/${scene}-640.webp`, `scenes/${scene}-640.avif`,
  `scenes/${scene}-960.webp`, `scenes/${scene}-960.avif`,
  `scenes/${scene}-1536.avif`,
  ...largeAvifWidths.map((w) => `scenes/${scene}-${w}.avif`),
  ...largeWebpWidths.map((w) => `scenes/${scene}-${w}.webp`),
  `phone/${scene}-384.webp`, `phone/${scene}-384.avif`,
  `phone/${scene}-768.webp`, `phone/${scene}-768.avif`,
  // The meadow spans a phone's full width, so it needs the 1152 crop at 2x.
  ...(scene === meadowScene || scene === darkScenes[meadowScene] ? [`phone/${scene}-1152.webp`, `phone/${scene}-1152.avif`] : []),
  `og/${scene}.jpg`,
]
const files = [
  'icons/ouro.svg', 'icons/ouro-180.png', 'icons/ouro-192.png', 'icons/ouro-512.png',
  ...usedScenes().flatMap(filesForScene),
]

if (github) {
  const queue = [...files]
  await Promise.all(Array.from({ length: 8 }, async () => { for (let file; (file = queue.shift()); ) await download(commit, file, join(brand, file)) }))
}
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
console.log(`copied ${files.length} files into ${out}${commit ? ` from ourostack/.github@${commit}` : ''}`)
