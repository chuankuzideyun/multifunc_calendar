"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVoiceInput = parseVoiceInput;
const gemini_1 = require("../services/gemini");
/**
 * Endpoint to parse a voice transcription string into structured event details.
 */
async function parseVoiceInput(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Transcript string is required in request body.' });
    }
    try {
        // Reference date is user's current local date/time
        // (We pass user timezone offset if available or standard server time)
        const referenceDate = new Date();
        const parsedData = await (0, gemini_1.parseVoiceTranscript)(transcript, referenceDate);
        return res.json(parsedData);
    }
    catch (error) {
        console.error('[Voice Parse Controller Error]', error);
        return res.status(500).json({ error: 'Failed to process voice transcript.' });
    }
}
