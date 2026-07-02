import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectRedis } from './services/redis';
import { initScheduler } from './services/scheduler';
import { apiLimiter, strictLimiter } from './middleware/rateLimit';
import { requireAuth } from './middleware/auth';
import * as authController from './controllers/authController';
import * as eventsController from './controllers/eventsController';
import * as mailController from './controllers/mailController';
import * as weatherController from './controllers/weatherController';
import * as voiceController from './controllers/voiceController';

const app = express();

// Express configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL || 'https://*.vercel.app'
  ],
  credentials: true // Crucial for httpOnly cookie storage
}));

// Apply global rate limiter
app.use('/api/', apiLimiter);

// --- ROUTES ---

// Authentication
app.get('/api/auth/google', authController.redirectToGoogle);
app.get('/api/auth/google/callback', authController.handleGoogleCallback);
app.get('/api/auth/me', requireAuth, authController.getMe);
app.post('/api/auth/settings', requireAuth, authController.updateSettings);
app.post('/api/auth/logout', authController.logout);

// Events management
app.get('/api/events', requireAuth, eventsController.getEvents);
app.post('/api/events/manual', requireAuth, eventsController.createManualEvent);
app.post('/api/events/:id/confirm', requireAuth, eventsController.confirmEvent);
app.post('/api/events/:id/reject', requireAuth, eventsController.rejectEvent);
app.delete('/api/events/:id', requireAuth, eventsController.deleteEvent);

// Gmail synchronization
app.post('/api/mail/sync', requireAuth, strictLimiter, mailController.syncGmail);

// Weather checks
app.post('/api/weather/check-weekend', requireAuth, strictLimiter, weatherController.triggerWeatherCheck);

// Voice input parser
app.post('/api/events/voice-parse', requireAuth, strictLimiter, voiceController.parseVoiceInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Bootstrapping function
async function startServer() {
  try {
    // 1. Connect Redis
    console.log('Connecting to Upstash Redis...');
    await connectRedis();

    // 2. Initialize Schedulers
    initScheduler();

    // 3. Start listening
    app.listen(env.PORT, () => {
      console.log(`[Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('[Startup Error] Failed to boot server:', error);
    process.exit(1);
  }
}

startServer();
