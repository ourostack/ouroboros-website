import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

// Ouro Current moves this site's Ouro items to each Ouro UI release, and with them the tag in their install record. An
// app may not write a workflow, so no workflow names the tag itself: site-checks reads it from the record at run time.
test("the Ouro UI release is read from the install record, and no workflow writes it down", () => {
  const record = JSON.parse(readFileSync(".github/ouro-hx-installed.json", "utf8"));
  assert.match(record.tag, /^v\d+\.\d+\.\d+$/);
  for (const name of readdirSync(".github/workflows")) {
    const text = readFileSync(`.github/workflows/${name}`, "utf8");
    assert.doesNotMatch(text, /OURO_UI_TAG:\s*["']?v\d/, `${name} names an Ouro UI tag`);
  }
  const checks = readFileSync(".github/workflows/site-checks.yml", "utf8");
  assert.match(checks, /OURO_UI_TAG=\$\(jq -er \.tag \.github\/ouro-hx-installed\.json\)" >> "\$GITHUB_ENV"/);
});
