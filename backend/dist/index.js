"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const redis_1 = require("./services/redis");
const scheduler_1 = require("./services/scheduler");
const rateLimit_1 = require("./middleware/rateLimit");
const auth_1 = require("./middleware/auth");
const authController = __importStar(require("./controllers/authController"));
const eventsController = __importStar(require("./controllers/eventsController"));
const mailController = __importStar(require("./controllers/mailController"));
const weatherController = __importStar(require("./controllers/weatherController"));
const voiceController = __importStar(require("./controllers/voiceController"));
const app = (0, express_1.default)();
// Express configuration
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        process.env.FRONTEND_URL || 'https://*.vercel.app'
    ],
    credentials: true // Crucial for httpOnly cookie storage
}));
// Apply global rate limiter
app.use('/api/', rateLimit_1.apiLimiter);
// --- ROUTES ---
// Authentication
app.get('/api/auth/google', authController.redirectToGoogle);
app.get('/api/auth/google/callback', authController.handleGoogleCallback);
app.get('/api/auth/me', auth_1.requireAuth, authController.getMe);
app.post('/api/auth/settings', auth_1.requireAuth, authController.updateSettings);
app.post('/api/auth/logout', authController.logout);
// Events management
app.get('/api/events', auth_1.requireAuth, eventsController.getEvents);
app.post('/api/events/manual', auth_1.requireAuth, eventsController.createManualEvent);
app.post('/api/events/:id/confirm', auth_1.requireAuth, eventsController.confirmEvent);
app.post('/api/events/:id/reject', auth_1.requireAuth, eventsController.rejectEvent);
app.delete('/api/events/:id', auth_1.requireAuth, eventsController.deleteEvent);
// Gmail synchronization
app.post('/api/mail/sync', auth_1.requireAuth, rateLimit_1.strictLimiter, mailController.syncGmail);
// Weather checks
app.post('/api/weather/check-weekend', auth_1.requireAuth, rateLimit_1.strictLimiter, weatherController.triggerWeatherCheck);
// Voice input parser
app.post('/api/events/voice-parse', auth_1.requireAuth, rateLimit_1.strictLimiter, voiceController.parseVoiceInput);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// Bootstrapping function
async function startServer() {
    try {
        // 1. Connect Redis
        console.log('Connecting to Upstash Redis...');
        await (0, redis_1.connectRedis)();
        // 2. Initialize Schedulers
        (0, scheduler_1.initScheduler)();
        // 3. Start listening
        app.listen(env_1.env.PORT, () => {
            console.log(`[Server] Running in ${env_1.env.NODE_ENV} mode on port ${env_1.env.PORT}`);
        });
    }
    catch (error) {
        console.error('[Startup Error] Failed to boot server:', error);
        process.exit(1);
    }
}
startServer();
