"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOAuth2Client = getOAuth2Client;
exports.createGoogleCalendarEvent = createGoogleCalendarEvent;
exports.checkCalendarConflict = checkCalendarConflict;
exports.checkDuplicateWeatherRun = checkDuplicateWeatherRun;
exports.fetchRecentEmails = fetchRecentEmails;
exports.getEmailDetail = getEmailDetail;
const googleapis_1 = require("googleapis");
const env_1 = require("../config/env");
const crypto_1 = require("./crypto");
/**
 * Generates an OAuth2 client configured with user credentials.
 */
function getOAuth2Client(encryptedRefreshToken) {
    const oauth2Client = new googleapis_1.google.auth.OAuth2(env_1.env.GOOGLE_CLIENT_ID, env_1.env.GOOGLE_CLIENT_SECRET, env_1.env.GOOGLE_REDIRECT_URI);
    oauth2Client.setCredentials({
        refresh_token: (0, crypto_1.decrypt)(encryptedRefreshToken)
    });
    return oauth2Client;
}
/**
 * Creates an event in Google Calendar.
 */
async function createGoogleCalendarEvent(oauth2Client, eventDetails) {
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
            summary: eventDetails.title,
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.startTime.toISOString(),
            },
            end: {
                dateTime: eventDetails.endTime.toISOString(),
            },
            location: eventDetails.location,
            extendedProperties: eventDetails.extendedProperties
        }
    });
    return response.data;
}
/**
 * Checks if the user has any events in the specified time slot.
 * Returns true if there is a conflict.
 */
async function checkCalendarConflict(oauth2Client, startTime, endTime) {
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            maxResults: 5 // just need to know if > 0
        });
        const events = response.data.items || [];
        return events.length > 0;
    }
    catch (error) {
        console.error('[Google Conflict Check Error]', error);
        // If it fails, assume conflict to be safe
        return true;
    }
}
/**
 * Checks Google Calendar for an existing event with matching extended properties
 * to prevent duplicate creation of automated runs.
 */
async function checkDuplicateWeatherRun(oauth2Client, startTime, endTime) {
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            privateExtendedProperty: ['source=auto-weather-run']
        });
        const events = response.data.items || [];
        return events.length > 0;
    }
    catch (error) {
        console.error('[Google Duplicate Run Check Error]', error);
        return false;
    }
}
/**
 * Fetches recent emails pre-filtered by date and invitation keywords.
 */
async function fetchRecentEmails(oauth2Client, lastNDays = 7) {
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    // Calculate date filter
    const date = new Date();
    date.setDate(date.getDate() - lastNDays);
    const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    // Search query: recent emails with meeting/booking related terms in subject/body
    const query = `after:${formattedDate} subject:(meeting OR booking OR reservation OR invite OR confirm OR schedule OR appointment OR calendar)`;
    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 30
        });
        return response.data.messages || [];
    }
    catch (error) {
        console.error('[Google Gmail List Error]', error);
        return [];
    }
}
/**
 * Retrieves details for a specific email message.
 */
async function getEmailDetail(oauth2Client, messageId) {
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    try {
        const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });
        const payload = response.data.payload;
        const headers = payload?.headers || [];
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
        const emailDate = dateHeader ? new Date(dateHeader) : new Date();
        const bodySnippet = response.data.snippet || '';
        return {
            id: messageId,
            subject,
            bodySnippet,
            emailDate
        };
    }
    catch (error) {
        console.error(`[Google Gmail Get Error] ID: ${messageId}`, error);
        throw error;
    }
}
