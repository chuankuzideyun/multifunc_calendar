"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gemini_1 = require("../services/gemini");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from root or current directory
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config();
async function runGeminiTests() {
    console.log('[Test] Running gemini-parser.test.ts...');
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
        console.warn('⚠️ [Test Skipped] GEMINI_API_KEY is not configured in .env. Skipping real Gemini API call tests.');
        return;
    }
    // 1. Email Extraction Test
    console.log('[Test] Evaluating email parser with sample meeting invitation...');
    const emailDate = new Date('2026-06-30T10:00:00Z'); // Reference date: June 30, 2026
    const subject = 'Project Kickoff Meeting invitation';
    const body = 'Hi Yao, let\'s have a meeting tomorrow at 14:00 to 15:30 in the conference room 2B to kick off the new project.';
    try {
        const events = await (0, gemini_1.parseEmailContent)(subject, body, emailDate);
        console.log('[Test Result] Extracted events:', JSON.stringify(events, null, 2));
        if (!Array.isArray(events)) {
            console.error('❌ [Test Failure] Extracted events output is not an array.');
            process.exit(1);
        }
        if (events.length === 0) {
            console.error('❌ [Test Failure] No events were extracted from a clear invitation email.');
            process.exit(1);
        }
        const event = events[0];
        if (!event.title || !event.startTime || !event.endTime || typeof event.confidence !== 'number') {
            console.error('❌ [Test Failure] Event schema is missing required fields (title, startTime, endTime, confidence).');
            process.exit(1);
        }
        // Verify relative date resolving ("tomorrow" relative to June 30 is July 1st)
        const startDate = new Date(event.startTime);
        if (startDate.getUTCDate() !== 1 || startDate.getUTCMonth() !== 6) { // 6 = July (0-indexed)
            console.warn(`⚠️ [Test Alert] Relative date resolving output was ${event.startTime}. Check if timezone matched.`);
        }
        console.log('✅ [Email Parser Test] Schema validation and parsing succeeded.');
    }
    catch (error) {
        console.error('❌ [Test Failure] Email parsing threw an error:', error);
        process.exit(1);
    }
    // 2. Voice Input Extraction Test
    console.log('[Test] Evaluating voice parser with sample audio transcript...');
    const refDate = new Date('2026-06-30T15:00:00Z'); // Reference date
    const voiceTranscript = 'Set up a dentist appointment for next Monday at 10 AM';
    try {
        const result = await (0, gemini_1.parseVoiceTranscript)(voiceTranscript, refDate);
        console.log('[Test Result] Voice parse output:', JSON.stringify(result, null, 2));
        if (typeof result.confidence !== 'number' || !Array.isArray(result.missingInfo)) {
            console.error('❌ [Test Failure] Voice parse schema is invalid.');
            process.exit(1);
        }
        console.log('✅ [Voice Parser Test] Schema validation and parsing succeeded.');
    }
    catch (error) {
        console.error('❌ [Test Failure] Voice parsing threw an error:', error);
        process.exit(1);
    }
    console.log('✅ [Test Success] gemini-parser.test.ts completed.');
}
runGeminiTests();
