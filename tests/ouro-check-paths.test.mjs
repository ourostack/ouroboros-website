import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

// Ouro Current moves Ouro check and its AX kit with each Ouro UI release (Ouro UI put Ouro check under scripts/ouro/
// after v1.3.241), and an app may not write a workflow. So site-checks finds them in the install record at run time,
// and no workflow names their folders.
test("site-checks finds Ouro check and its AX kit in the install record, and no workflow names their folders", () => {
  for (const name of readdirSync(".github/workflows")) {
    const text = readFileSync(`.github/workflows/${name}`, "utf8");
    assert.doesNotMatch(text, /(^|[\s"'])(src\/)?lib\/ouro\/(check|ax)\b|scripts\/ouro\/check/m, `${name} names an Ouro check or AX kit folder`);
  }
  const checks = readFileSync(".github/workflows/site-checks.yml", "utf8");
  const pick = /check="\$\(dirname "\$\(jq -er '([^']+)' \.github\/ouro-hx-installed\.json\)"\)"/.exec(checks);
  assert.ok(pick, "site-checks reads Ouro check's folder from the record");
  const kit = /jq -r '([^']+)' \.github\/ouro-hx-installed\.json \| while read/.exec(checks);
  assert.ok(kit, "site-checks reads the AX kit's files from the record");
  assert.match(checks, /node "\$OURO_CHECK" dist/);

  // The same filters, run on this repository's record and on one laid out as Ouro UI installs after v1.3.241.
  const run = (filter, record) => execFileSync("jq", ["-r", filter], { input: JSON.stringify(record), encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const record = JSON.parse(readFileSync(".github/ouro-hx-installed.json", "utf8"));
  const [here] = run(pick[1], record);
  assert.ok(Object.keys(record.files).includes(here), "the record names Ouro check's entry point");
  const moved = { files: { "scripts/ouro/check/check.ts": "a", "scripts/ouro/check/run.ts": "b", "src/lib/ouro/ax/cli.ts": "c", "src/lib/ouro/cn.ts": "d" } };
  assert.deepEqual(run(pick[1], moved), ["scripts/ouro/check/check.ts"]);
  assert.deepEqual(run(kit[1], moved), ["src/lib/ouro/ax/cli.ts"]);
  assert.ok(run(kit[1], record).length > 0, "the record names the AX kit's files");
});
