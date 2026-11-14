// Saves GitHub's current receipts as src/data/receipts-snapshot.json, the
// answer the build falls back on when it can't reach GitHub (src/lib/receipts.mjs).
// The snapshot keeps its own time, so the page never passes it off as newer.
//
//   node scripts/refresh-receipts.mjs            (uses GITHUB_TOKEN or GH_TOKEN when set)

import fs from 'node:fs';
import { fetchReceipts, isValidReceipts } from '../src/lib/receipts.mjs';

const receipts = await fetchReceipts({ token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN });
if (!isValidReceipts(receipts)) throw new Error(`GitHub's answer has nothing to show: ${JSON.stringify(receipts)}`);
fs.writeFileSync(new URL('../src/data/receipts-snapshot.json', import.meta.url), JSON.stringify(receipts, null, 2) + '\n');
console.log(`${receipts.count} pull requests merged in the 24 hours to ${receipts.asOf}, across ${receipts.repos} repositories.`);
