import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on("error", (err) => {
  // ioredis can emit an error whose `message` is empty (a closed connection),
  // which would log as `err: ""` — useless exactly when it is needed.
  console.error("Redis worker connection error:", err.message || String(err));
});
