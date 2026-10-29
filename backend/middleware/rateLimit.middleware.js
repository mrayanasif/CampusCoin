// Dependency-free in-memory rate limiter (fixed window per key).
//
// Notes/limitations:
// - State is per-process: on Vercel every serverless instance has its own
//   counters, so the effective limit scales with the number of warm instances.
//   This is acceptable for abuse dampening; a shared store (Redis) would be
//   required for strict global limits.
// - Buckets are pruned lazily, so a long-running process does not leak memory.

/**
 * Create an Express middleware limited to `max` requests per `windowMs` per
 * client IP (+ router scope). Responds with 429 JSON and a Retry-After header
 * once the limit is exceeded.
 *
 * @param {{windowMs?: number, max?: number, message?: string}} options
 * @returns {import("express").RequestHandler}
 */
function rateLimit({ windowMs = 60 * 1000, max = 60, message } = {}) {
  const buckets = new Map();
  const maxBuckets = 10000;
  const responseMessage =
    message || "Too many requests. Please try again later.";

  function prune(now) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    try {
      const now = Date.now();
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      // Keyed per client IP + mounted router/route so limits don't leak across
      // unrelated endpoints from the same IP.
      const scope = req.baseUrl || req.path || req.originalUrl || "";
      const key = `${ip}:${scope}`;

      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;
      const remaining = Math.max(0, max - bucket.count);

      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (bucket.count > max) {
        const retryAfter = Math.max(
          1,
          Math.ceil((bucket.resetAt - now) / 1000)
        );
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
          success: false,
          message: responseMessage,
          retryAfter,
        });
      }

      if (buckets.size > maxBuckets) {
        prune(now);
        if (buckets.size > maxBuckets) buckets.clear();
      }

      return next();
    } catch (error) {
      // A limiter bug must never take the API down.
      console.error("Rate limiter error:", error.message);
      return next();
    }
  };
}

module.exports = { rateLimit };
