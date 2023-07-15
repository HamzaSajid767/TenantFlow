const TOKEN_BUCKET_LUA = `
local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'updatedAt')
local tokens = tonumber(bucket[1])
local updatedAt = tonumber(bucket[2])
local capacity = tonumber(ARGV[1])
local refillPerMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

if tokens == nil then
  tokens = capacity
  updatedAt = now
end

local elapsed = math.max(0, now - updatedAt)
tokens = math.min(capacity, tokens + elapsed * refillPerMs)
updatedAt = now

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'updatedAt', updatedAt)
local ttl = math.ceil(capacity / refillPerMs) + 1000
redis.call('PEXPIRE', KEYS[1], ttl)

return { allowed, tostring(tokens), capacity }
`;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
};

export async function consumeTokenBucket(
  redis: { eval: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<unknown> },
  key: string,
  capacity: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const refillPerMs = capacity / (windowSec * 1000);
  const result = (await redis.eval(
    TOKEN_BUCKET_LUA,
    1,
    key,
    capacity,
    refillPerMs,
    Date.now(),
    1,
  )) as [number, string, number];

  const allowed = result[0] === 1;
  const remaining = Math.max(0, Math.floor(Number(result[1])));
  return {
    allowed,
    remaining,
    limit: capacity,
    retryAfterSeconds: allowed ? 0 : Math.ceil(windowSec / capacity) || 1,
  };
}

export { TOKEN_BUCKET_LUA };
