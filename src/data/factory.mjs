// The factory's longest session, as the homepage cites it.
//
// Source: https://ourostack.github.io/factory/data.json, field `featured[0]`
// (built by ourostack/factory `site/scripts/build-data.mjs`; `built_at`
// 2026-10-11T02:39:02Z, `reports_commit` 6e1c786). The screenshot at
// public/images/workshop/factory-longest-sessions.jpg is the "The longest
// sessions" block of https://ourostack.github.io/factory/#/store, taken from
// the same build. Re-read both together when refreshing.
export const longestSession = {
  sessionId: 'e1c92170-2f9b-4805-b98c-5a15f0cfe2e1',
  durationMs: 621705005,
  prsMerged: 82,
  prsTotal: 84,
  asOf: '11 October 2026',
}

export const longestHours = (longestSession.durationMs / 3_600_000).toFixed(1)
