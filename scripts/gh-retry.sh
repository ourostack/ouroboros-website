# Runs a gh command again when GitHub answers with a rate limit or a server error, and fails at once on anything else.
# sync-brand.yml makes every gh call through it: the token it uses is shared across many jobs, and a secondary rate
# limit used to fail a whole sync, which then waited for the next 10-minute run.
#   source scripts/gh-retry.sh; gh_retry gh pr list --head brand-sync
# GH_RETRY_TRIES (default 6) and GH_RETRY_SLEEP (seconds before the first retry, default 20, doubling) tune it.
gh_retry() {
  local tries="${GH_RETRY_TRIES:-6}" wait="${GH_RETRY_SLEEP:-20}" n=1 err out status
  err=$(mktemp)
  while :; do
    out=$("$@" 2>"$err") && status=0 || status=$?
    if [ "$status" -eq 0 ]; then
      cat "$err" >&2
      rm -f "$err"
      printf '%s' "$out"
      [ -z "$out" ] || printf '\n'
      return 0
    fi
    cat "$err" >&2
    if [ "$n" -ge "$tries" ] || ! grep -qiE 'rate limit|abuse|secondary|HTTP 5[0-9][0-9]|timed out|timeout|connection (reset|refused)|EOF|temporarily' "$err"; then
      rm -f "$err"
      return "$status"
    fi
    echo "gh_retry: try $n of $tries failed, trying again in ${wait}s" >&2
    sleep "$wait"
    wait=$((wait * 2))
    n=$((n + 1))
  done
}
