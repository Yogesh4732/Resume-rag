const rateLimit = require('express-rate-limit');
let RedisStore;
let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    const redis = require('redis');
    RedisStore = require('rate-limit-redis');
    // Create Redis client for rate limiting
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('Rate Limit Redis Error:', err);
    });
  } catch (err) {
    // If redis or RedisStore not available, we'll fall back to memory store
    console.warn('Redis not available for rate limiting, falling back to memory store.');
    redisClient = null;
    RedisStore = null;
  }
} else {
  console.warn('REDIS_URL not set; skipping Redis rate limiter connection.');
}

// Rate limiter configuration
const limiter = rateLimit({
  store: redisClient && RedisStore ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60, // 60 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP address
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

module.exports = limiter;
