// Smoke-check a deployed site: content types of the agent surfaces and the
// old-URL redirects. Usage: node scripts/smoke-preview.mjs <base-url>
const base = (process.argv[2] || 'https://ouroboros.bot').replace(/\/$/, '')
const failures = []
const check = (ok, message) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures.push(message) }

for (const [path, type] of [['/brief.md', 'text/markdown'], ['/llms.txt', 'text/plain']]) {
  const res = await fetch(base + path)
  check(res.status === 200 && (res.headers.get('content-type') || '').startsWith(type), `${path} is ${type} (${res.status} ${res.headers.get('content-type')})`)
}
for (const [from, to] of [
  ['/essays/stop-being-the-glue', '/blog/stop-being-the-glue/'],
  ['/docs?utm_source=smoke', '/lab/docs/?utm_source=smoke'],
  ['/why', '/lab/why/'],
  ['/model-reviews/anthropic/', '/lab/model-reviews/anthropic/'],
]) {
  const res = await fetch(base + from, { redirect: 'manual' })
  const location = res.headers.get('location') || ''
  check(res.status === 301 && location.endsWith(to), `${from} → 301 ${to} (${res.status} ${location})`)
}
// Published posts and the Desk RFC's links are served directly, no redirect.
for (const path of ['/blog/', '/blog/stop-being-the-glue/', '/blog/designing-with-your-agent/', '/blog/what-is-agent-experience/']) {
  const res = await fetch(base + path, { redirect: 'manual' })
  check(res.status === 200, `${path} is 200 (${res.status})`)
}
process.exit(failures.length ? 1 : 0)
