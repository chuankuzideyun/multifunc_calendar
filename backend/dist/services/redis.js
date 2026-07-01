"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.connectRedis = connectRedis;
const redis_1 = require("redis");
const env_1 = require("../config/env");
exports.redisClient = (0, redis_1.createClient)({
    url: env_1.env.REDIS_URL,
    socket: {
        // Enable TLS if the connection scheme is rediss://
        tls: env_1.env.REDIS_URL.startsWith('rediss://'),
        rejectUnauthorized: false // Avoid connection rejection on cloud certificates
    }
});
exports.redisClient.on('error', (err) => {
    console.error('[Redis Error]', err);
});
exports.redisClient.on('connect', () => {
    console.log('Redis client initiating connection...');
});
exports.redisClient.on('ready', () => {
    console.log('Redis connected and ready to use.');
});
async function connectRedis() {
    if (!exports.redisClient.isOpen) {
        await exports.redisClient.connect();
    }
}
