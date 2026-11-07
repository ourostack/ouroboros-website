// Rewrites public/ouro-md/stable.json from Ouro MD's latest GitHub release.
// The download page (/ouro-md/download/) reads it for its version, download
// link and signing line. .github/workflows/refresh-ouromd-release.yml runs it
// hourly; it moved here from ourostack/ouro-apps-site with the page (2026-11-07).
//
//   node scripts/refresh-ouromd-release.mjs

import { writeFile } from "node:fs/promises";

const repo = "ourostack/ouro-md";
const api = `https://api.github.com/repos/${repo}/releases/latest`;
const out = new URL("../public/ouro-md/stable.json", import.meta.url);

const response = await fetch(api, {
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "ouroboros-website-release-refresh",
    ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
  },
});

if (!response.ok) {
  throw new Error(`GitHub release lookup failed: ${response.status} ${response.statusText}`);
}

const release = await response.json();
const version = release.tag_name.replace(/^v/, "");
const asset = (suffix) => release.assets.find((item) => item.name.endsWith(suffix));
const zip = asset(".zip");
const dmg = asset(".dmg");
const manifest = asset(".manifest.json");

if (!zip || !manifest) {
  throw new Error(`Latest release ${release.tag_name} is missing zip or manifest assets`);
}

let manifestData = {};
const manifestResponse = await fetch(manifest.browser_download_url, {
  headers: { "User-Agent": "ouroboros-website-release-refresh" },
});
if (manifestResponse.ok) {
  manifestData = await manifestResponse.json();
}

const digest = (item) => String(item.digest || "").replace(/^sha256:/, "");
const download = (item, role) => ({
  name: item.name,
  url: item.browser_download_url,
  bytes: item.size,
  sha256: digest(item),
  role,
});

const metadata = {
  appName: "Ouro MD",
  subtitle: "The Markdown App",
  channel: "stable",
  version,
  releaseTag: release.tag_name,
  releaseURL: release.html_url,
  publishedAt: release.published_at,
  bundleIdentifier: manifestData.bundleIdentifier || "bot.ouro.md",
  minimumMacOS: "13.0",
  signingMode: manifestData.signingMode || null,
  notarized: typeof manifestData.notarized === "boolean" ? manifestData.notarized : null,
  downloads: {
    installerScript: { url: "https://ouroboros.bot/ouro-md-install.sh" },
    zip: download(zip, "auto-update"),
    ...(dmg ? { dmg: download(dmg, "interactive-install") } : {}),
    manifest: download(manifest, "metadata"),
  },
};

// The fields the download page and ouro.bot's endpoint check read must be there.
for (const key of ["appName", "version", "releaseURL", "bundleIdentifier"]) {
  if (!metadata[key]) throw new Error(`stable.json would be missing ${key}`);
}
if (!metadata.downloads.zip.sha256 || !metadata.downloads.manifest.sha256) {
  throw new Error("stable.json would be missing a checksum");
}

await writeFile(out, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`updated public/ouro-md/stable.json -> ${release.tag_name}`);
