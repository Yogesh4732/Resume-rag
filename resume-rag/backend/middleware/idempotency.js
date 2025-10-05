let redisClient = null;
let inMemoryStore = null;
try {
  const redis = require('redis');
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('Idempotency Redis Error:', err);
    });
    redisClient.connect().catch(() => {});
  } else {
    // Use a simple in-memory map for idempotency in dev
    inMemoryStore = new Map();
    console.warn('REDIS_URL not set; using in-memory idempotency store.');
  }
} catch (err) {
  inMemoryStore = new Map();
  console.warn('redis package not available; using in-memory idempotency store.');
}

const idempotency = async (req, res, next) => {
  const idempotencyKey = req.get('Idempotency-Key');
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: 'Idempotency-Key',
        message: 'Idempotency-Key header is required for this operation'
      }
    });
  }

  // Check if this key was already used
  const cacheKey = `idempotency:${idempotencyKey}`;
  
  try {
    let cachedResponse = null;
    if (redisClient) {
      cachedResponse = await redisClient.get(cacheKey);
    } else if (inMemoryStore) {
      cachedResponse = inMemoryStore.get(cacheKey) || null;
    }
    
    if (cachedResponse) {
      const response = typeof cachedResponse === 'string' ? JSON.parse(cachedResponse) : cachedResponse;
      return res.status(response.status).json(response.data);
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let statusCode = 200;
    let responseData = null;

    // Override status method to capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };

    // Override send method to capture response
    res.send = function(data) {
      responseData = data;
      
      // Cache the response for 24 hours
      const responseToCache = {
        status: statusCode,
        data: typeof data === 'string' ? JSON.parse(data) : data
      };
      
      if (redisClient) {
        redisClient.setEx(cacheKey, 86400, JSON.stringify(responseToCache)).catch(() => {});
      } else if (inMemoryStore) {
        inMemoryStore.set(cacheKey, responseToCache);
      }
      
      return originalSend.call(this, data);
    };

    // Override json method to capture response
    res.json = function(data) {
      responseData = data;
      
      // Cache the response for 24 hours
      const responseToCache = {
        status: statusCode,
        data: data
      };
      
      if (redisClient) {
        redisClient.setEx(cacheKey, 86400, JSON.stringify(responseToCache)).catch(() => {});
      } else if (inMemoryStore) {
        inMemoryStore.set(cacheKey, responseToCache);
      }
      
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next();
  }
};

module.exports = idempotency;
