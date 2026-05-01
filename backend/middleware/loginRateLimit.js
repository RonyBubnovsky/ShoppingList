const LoginRateLimit = require('../models/LoginRateLimit');

const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS || 30 * 60 * 1000);
const CLEANUP_GRACE_MS = Number(process.env.LOGIN_RATE_LIMIT_CLEANUP_GRACE_MS || 5 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 6);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const buildLimiterBuckets = (req) => {
  const ip = getClientIp(req);

  return [
    {
      name: 'ip',
      key: `login:ip:${ip}`,
      maxAttempts: MAX_ATTEMPTS,
    },
  ];
};

const computeExpiry = (now) => {
  const keepForMs = Math.max(WINDOW_MS, BLOCK_MS) + CLEANUP_GRACE_MS;
  return new Date(now.getTime() + keepForMs);
};

const sendRateLimitExceeded = (res, blockedUntil) => {
  const retryMs = Math.max(0, blockedUntil.getTime() - Date.now());
  const retrySeconds = Math.max(1, Math.ceil(retryMs / 1000));

  res.setHeader('Retry-After', String(retrySeconds));
  return res.status(429).json({
    error: 'Too many login attempts. Please try again later.',
    retryAfterSeconds: retrySeconds,
  });
};

const consumeBucketAttempt = async (bucket, now) => {
  let entry = await LoginRateLimit.findOne({ key: bucket.key });

  if (!entry) {
    entry = new LoginRateLimit({
      key: bucket.key,
      attemptCount: 1,
      windowStart: now,
      blockedUntil: null,
      expireAt: computeExpiry(now),
    });
    await entry.save();
    return { blockedUntil: null };
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    entry.expireAt = computeExpiry(now);
    await entry.save();
    return { blockedUntil: entry.blockedUntil };
  }

  const windowExpired = !entry.windowStart || (now.getTime() - entry.windowStart.getTime()) >= WINDOW_MS;

  if (windowExpired) {
    await LoginRateLimit.deleteOne({ key: bucket.key });

    entry = new LoginRateLimit({
      key: bucket.key,
      attemptCount: 1,
      windowStart: now,
      blockedUntil: null,
      expireAt: computeExpiry(now),
    });
    await entry.save();
    return { blockedUntil: null };
  }

  entry.attemptCount += 1;

  if (entry.attemptCount > bucket.maxAttempts) {
    entry.blockedUntil = new Date(now.getTime() + BLOCK_MS);
    entry.expireAt = computeExpiry(now);
    await entry.save();
    return { blockedUntil: entry.blockedUntil };
  }

  entry.expireAt = computeExpiry(now);
  await entry.save();
  return { blockedUntil: null };
};

const loginRateLimitMiddleware = async (req, res, next) => {
  try {
    const buckets = buildLimiterBuckets(req);
    const now = new Date();

    for (const bucket of buckets) {
      const result = await consumeBucketAttempt(bucket, now);
      if (result.blockedUntil) {
        return sendRateLimitExceeded(res, result.blockedUntil);
      }
    }

    return next();
  } catch (error) {
    // Fail open to avoid auth outage if limiter persistence has issues.
    console.error('Login rate limiter error:', error.message);
    return next();
  }
};

const clearLoginRateLimit = async (req) => {
  try {
    const buckets = buildLimiterBuckets(req);
    await LoginRateLimit.deleteMany({ key: { $in: buckets.map((bucket) => bucket.key) } });
  } catch (error) {
    console.error('Failed to clear login rate limit state:', error.message);
  }
};

module.exports = {
  loginRateLimitMiddleware,
  clearLoginRateLimit,
};
