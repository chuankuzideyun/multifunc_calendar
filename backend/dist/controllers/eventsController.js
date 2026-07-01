"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvents = getEvents;
exports.createManualEvent = createManualEvent;
exports.confirmEvent = confirmEvent;
exports.rejectEvent = rejectEvent;
exports.deleteEvent = deleteEvent;
const prisma_1 = require("../config/prisma");
const google_1 = require("../services/google");
const googleapis_1 = require("googleapis");
/**
 * Lists all events (confirmed and pending) for the logged-in user.
 */
async function getEvents(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    try {
        const events = await prisma_1.prisma.event.findMany({
            where: {
                userId: req.user.id,
                // Optional: you can filter out rejected events to clean up dashboard
                status: { in: ['pending', 'confirmed'] }
            },
            orderBy: { startTime: 'asc' }
        });
        return res.json(events);
    }
    catch (error) {
        console.error('[GetEvents Error]', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
/**
 * Creates a manual event directly. It is automatically confirmed and written to Google Calendar.
 */
async function createManualEvent(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const { title, description, startTime, endTime, location, source = 'manual' } = req.body;
    if (!title || !startTime || !endTime) {
        return res.status(400).json({ error: 'Title, startTime, and endTime are required.' });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        // Write to Google Calendar first if OAuth refresh token is available
        let googleEventId = null;
        if (user.googleRefreshTokenEncrypted) {
            try {
                const oauthClient = (0, google_1.getOAuth2Client)(user.googleRefreshTokenEncrypted);
                const googleEvent = await (0, google_1.createGoogleCalendarEvent)(oauthClient, {
                    title,
                    description,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    location
                });
                googleEventId = googleEvent.id || null;
            }
            catch (err) {
                console.error('[Google Calendar Manual Sync Failed]', err);
                // Continue creating locally even if Google Calendar sync fails, but notify
            }
        }
        const event = await prisma_1.prisma.event.create({
            data: {
                userId: req.user.id,
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                location,
                source: source, // Cast to EventSource enum
                status: 'confirmed',
                googleEventId
            }
        });
        return res.status(201).json(event);
    }
    catch (error) {
        console.error('[CreateManualEvent Error]', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
/**
 * Confirms a pending event (from Gmail or Voice).
 * Writes the event to Google Calendar and changes status to confirmed.
 */
async function confirmEvent(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const { id } = req.params;
    try {
        const event = await prisma_1.prisma.event.findFirst({
            where: { id, userId: req.user.id }
        });
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        if (event.status !== 'pending') {
            return res.status(400).json({ error: 'Event is already confirmed or rejected.' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        // Sync to Google Calendar
        let googleEventId = null;
        if (user.googleRefreshTokenEncrypted) {
            try {
                const oauthClient = (0, google_1.getOAuth2Client)(user.googleRefreshTokenEncrypted);
                // Build extendedProperties if it is an automated weather run or gmail
                const extendedProperties = event.source === 'weather' ? {
                    private: { source: 'auto-weather-run' }
                } : undefined;
                const googleEvent = await (0, google_1.createGoogleCalendarEvent)(oauthClient, {
                    title: event.title,
                    description: event.description || undefined,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    location: event.location || undefined,
                    extendedProperties
                });
                googleEventId = googleEvent.id || null;
            }
            catch (err) {
                console.error('[Google Calendar Sync Failed]', err);
                return res.status(500).json({ error: 'Failed to write event to Google Calendar. Please check connection.' });
            }
        }
        else {
            return res.status(400).json({ error: 'Google Calendar credentials missing. Please reconnect Google account.' });
        }
        const updatedEvent = await prisma_1.prisma.event.update({
            where: { id },
            data: {
                status: 'confirmed',
                googleEventId
            }
        });
        return res.json(updatedEvent);
    }
    catch (error) {
        console.error('[ConfirmEvent Error]', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
/**
 * Rejects a pending event. Updates status to rejected.
 */
async function rejectEvent(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const { id } = req.params;
    try {
        const event = await prisma_1.prisma.event.findFirst({
            where: { id, userId: req.user.id }
        });
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        if (event.status !== 'pending') {
            return res.status(400).json({ error: 'Event is already confirmed or rejected.' });
        }
        const updatedEvent = await prisma_1.prisma.event.update({
            where: { id },
            data: {
                status: 'rejected'
            }
        });
        return res.json(updatedEvent);
    }
    catch (error) {
        console.error('[RejectEvent Error]', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
/**
 * Deletes an event. If it is confirmed and has a googleEventId, delete it from Google Calendar.
 */
async function deleteEvent(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const { id } = req.params;
    try {
        const event = await prisma_1.prisma.event.findFirst({
            where: { id, userId: req.user.id }
        });
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        // Delete from Google Calendar if sync'd
        if (event.googleEventId) {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.id }
            });
            if (user && user.googleRefreshTokenEncrypted) {
                try {
                    const oauthClient = (0, google_1.getOAuth2Client)(user.googleRefreshTokenEncrypted);
                    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauthClient });
                    await calendar.events.delete({
                        calendarId: 'primary',
                        eventId: event.googleEventId
                    });
                }
                catch (err) {
                    // If the event was already deleted in Google Calendar, ignore the error and proceed
                    if (err.code !== 410 && err.code !== 404) {
                        console.error('[Google Calendar Delete Failed]', err);
                        return res.status(500).json({ error: 'Failed to delete event from Google Calendar.' });
                    }
                }
            }
        }
        await prisma_1.prisma.event.delete({
            where: { id }
        });
        return res.json({ message: 'Event deleted successfully.' });
    }
    catch (error) {
        console.error('[DeleteEvent Error]', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
