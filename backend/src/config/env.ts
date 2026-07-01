import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory, fallback to current dir .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const requiredEnv = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GEMINI_API_KEY',
  'OPENWEATHERMAP_API_KEY'
];

// Validate existence of keys
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[ERROR] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Validate ENCRYPTION_KEY hex length
const encryptionKeyHex = process.env.ENCRYPTION_KEY || '';
try {
  const keyBuffer = Buffer.from(encryptionKeyHex, 'hex');
  if (keyBuffer.length !== 32) {
    console.error('[ERROR] ENCRYPTION_KEY must be a 32-byte (64 characters) hex string.');
    process.exit(1);
  }
} catch (e) {
  console.error('[ERROR] ENCRYPTION_KEY parsing failed. Make sure it is valid hexadecimal.');
  process.exit(1);
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY!
};
