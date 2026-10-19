function createGiocataReportWorkload({ ttlMs = 120000, maxEntries = 32, now = Date.now } = {}) {
  const cache = new Map();
  let active = false;
  let generation = 0;
  return {
    acquire() {
      if (active) return null;
      active = true;
      return () => { active = false; };
    },
    get generation() { return generation; },
    get(key) {
      const entry = cache.get(key);
      if (!entry || entry.expiresAt <= now()) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    put(key, value, startedGeneration) {
      // A write during calculation must not repopulate the cache with an old snapshot.
      if (generation !== startedGeneration || ttlMs <= 0) return;
      cache.delete(key);
      for (const [oldKey, entry] of cache) if (entry.expiresAt <= now()) cache.delete(oldKey);
      while (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
      cache.set(key, { value, expiresAt: now() + ttlMs });
    },
    invalidate() {
      generation += 1;
      cache.clear();
    },
  };
}

function invalidateGiocataReportsOnWrite(workload) {
  return (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        (/^\/appointments(?:\/|$)/.test(req.path) ||
         req.path === "/payments/mercadopago/webhook" ||
         /^\/admin\/giocata\/reports\/attendance\//.test(req.path))) {
      // Invalidate conservatively for all booking writes, including public and webhook flows.
      res.once("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) workload.invalidate();
      });
    }
    next();
  };
}

module.exports = { createGiocataReportWorkload, invalidateGiocataReportsOnWrite };
