import { createClient } from 'redis';
import { env } from '../config/env';

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    // Enable TLS if the connection scheme is rediss://
    tls: env.REDIS_URL.startsWith('rediss://'),
    rejectUnauthorized: false // Avoid connection rejection on cloud certificates
  }
});

redisClient.on('error', (err) => {
  console.error('[Redis Error]', err);
});

redisClient.on('connect', () => {
  console.log('Redis client initiating connection...');
});

redisClient.on('ready', () => {
  console.log('Redis connected and ready to use.');
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
