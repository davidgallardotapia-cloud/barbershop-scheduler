# Giocata report resource limits

- Report reads use a separate PostgreSQL pool, limited to one connection per server process.
- Summary, balances and attendance share one admission slot. Excess reads return 503
  with `REPORT_BUSY` and `Retry-After: 1`, without joining a database connection queue.
- The browser cancels superseded selections and retries busy reads at most three times.
- Report connection acquisition is limited to 500 ms; SQL statements to 2 seconds;
  lock waits to 200 ms. Parallel query workers and JIT are disabled for report reads.
- Summary cache: 2 minutes, at most 32 entries, owner and resolved period scoped.
  Account access is revalidated in PostgreSQL even on cache hits. Cached responses
  preserve `generatedAt`; browser and intermediary caching remain disabled.
- Lists are uncached and paginated. Attendance writes use the operational pool.
- Successful appointment, recurring booking, payment, webhook and attendance writes
  invalidate summaries. Generation checks prevent an overlapping calculation from
  restoring an invalidated snapshot. Direct SQL/external writes may remain unseen
  in a summary until the 2-minute TTL expires.

These limits are per process, not distributed admission control. They do not isolate
database CPU, memory or disk from reservations. Production impact still requires
measurement; use a separate reporting database if shared-resource contention occurs.

The isolated integration fixture suite disables summary caching with
`NODE_ENV=test GIOCATA_REPORT_CACHE_DISABLED=1` because fixtures also mutate via SQL.
Cache, access checks, bounded admission and invalidation have separate unit tests.
The integration load checks use 6,000 synthetic reservations, public booking writes
in two businesses and a PostgreSQL sleep query to verify the statement timeout.
