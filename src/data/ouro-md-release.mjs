import fs from 'node:fs'
import path from 'node:path'

// Ouro MD's current release, read at build time from public/ouro-md/stable.json,
// which .github/workflows/refresh-ouromd-release.yml rewrites (and redeploys)
// hourly. The download buttons point straight at the disk image, so "Download
// for Mac" downloads instead of opening another page.
export const ouroMdReleases = 'https://github.com/ourostack/ouro-md/releases/latest'

function read() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/ouro-md/stable.json'), 'utf8'))
  } catch {
    return null
  }
}

const release = read()
export const ouroMdDownload = release?.downloads?.dmg?.url || release?.downloads?.zip?.url || release?.releaseURL || ouroMdReleases
