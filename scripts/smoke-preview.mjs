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
  ['/blog/stop-being-the-glue', '/essays/stop-being-the-glue/'],
  ['/blog/', '/essays/'],
  ['/docs?utm_source=smoke', '/lab/docs/?utm_source=smoke'],
  ['/why', '/lab/why/'],
  ['/model-reviews/anthropic/', '/lab/model-reviews/anthropic/'],
]) {
  const res = await fetch(base + from, { redirect: 'manual' })
  const location = res.headers.get('location') || ''
  check(res.status === 301 && location.endsWith(to), `${from} → 301 ${to} (${res.status} ${location})`)
}
process.exit(failures.length ? 1 : 0)
