// The receipts this build renders, asked for once and shared by the home page and the
// build's copy of /api/receipts.json. RECEIPTS_OFFLINE=1 builds from the snapshot without
// asking GitHub.
import snapshot from '../data/receipts-snapshot.json'
import { receiptsOrSnapshot } from './receipts.mjs'

export const buildReceipts = await receiptsOrSnapshot({
  snapshot,
  offline: process.env.RECEIPTS_OFFLINE === '1',
  token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
})
