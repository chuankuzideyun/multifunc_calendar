"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planWeekendRunForUser = planWeekendRunForUser;
exports.triggerWeatherCheck = triggerWeatherCheck;
const prisma_1 = require("../config/prisma");
const google_1 = require("../services/google");
const weather_1 = require("../services/weather");
/**
 * Plans a weekend run (Saturday or Sunday 8:00-9:00 AM local time) for a user.
 * 1. Checks weather conditions.
 * 2. Checks for conflicts in Google Calendar.
 * 3. Checks for duplicates.
 * 4. Creates event in local DB and Google Calendar if conditions are met.
 */
async function planWeekendRunForUser(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        return { success: false, message: 'User not found.' };
    }
    if (!user.location) {
        return {
            success: false,
            message: 'Location is not set in settings. Please set your city to enable weekend run scheduling.'
        };
    }
    if (!user.googleRefreshTokenEncrypted) {
        return { success: false, message: 'Google OAuth account is not connected.' };
    }
    try {
        const forecast = await (0, weather_1.getWeekendWeather)(user.location);
        const oauthClient = (0, google_1.getOAuth2Client)(user.googleRefreshTokenEncrypted);
        const timezoneOffsetMs = forecast.timezoneOffsetSeconds * 1000;
        const nowUtc = new Date();
        // Convert current UTC time to user local time
        const todayLocal = new Date(nowUtc.getTime() + timezoneOffsetMs);
        const currentDay = todayLocal.getUTCDay(); // 0 (Sun) to 6 (Sat)
        // Calculate days to Saturday and Sunday
        let daysToSat = (6 - currentDay + 7) % 7;
        let daysToSun = (7 - currentDay + 7) % 7;
        // If it is already Saturday or Sunday morning past 9:00 AM local time, schedule for the following weekend.
        if (daysToSat === 0 && todayLocal.getUTCHours() >= 9) {
            daysToSat = 7;
        }
        if (daysToSun === 0 && todayLocal.getUTCHours() >= 9) {
            daysToSun = 7;
        }
        // --- EVALUATE SATURDAY ---
        if (forecast.saturday && (0, weather_1.checkRunningCriteria)(forecast.saturday)) {
            const satLocal = new Date(todayLocal);
            satLocal.setUTCDate(todayLocal.getUTCDate() + daysToSat);
            satLocal.setUTCHours(8, 0, 0, 0); // 8:00 AM local
            const satStartUtc = new Date(satLocal.getTime() - timezoneOffsetMs);
            const satEndUtc = new Date(satStartUtc.getTime() + 60 * 60 * 1000); // 9:00 AM local
            // Check DB duplication
            const existingDbEvent = await prisma_1.prisma.event.findFirst({
                where: {
                    userId: user.id,
                    source: 'weather',
                    startTime: satStartUtc
                }
            });
            if (!existingDbEvent) {
                // Check Google Calendar duplication & conflicts
                const isGoogleDuplicate = await (0, google_1.checkDuplicateWeatherRun)(oauthClient, satStartUtc, satEndUtc);
                const isConflict = await (0, google_1.checkCalendarConflict)(oauthClient, satStartUtc, satEndUtc);
                if (!isGoogleDuplicate && !isConflict) {
                    // Match! Create Saturday morning run.
                    const description = `Weekend morning run (automatically scheduled). Temp: ${forecast.saturday.temp}°C, Weather conditions: ${forecast.saturday.description}.`;
                    const event = await prisma_1.prisma.event.create({
                        data: {
                            userId: user.id,
                            title: 'Morning Run 🏃‍♂️',
                            description,
                            startTime: satStartUtc,
                            endTime: satEndUtc,
                            location: user.location,
                            source: 'weather',
                            status: 'confirmed'
                        }
                    });
                    try {
                        const googleEvent = await (0, google_1.createGoogleCalendarEvent)(oauthClient, {
                            title: 'Morning Run 🏃‍♂️',
                            description,
                            startTime: satStartUtc,
                            endTime: satEndUtc,
                            location: user.location,
                            extendedProperties: {
                                private: { source: 'auto-weather-run' }
                            }
                        });
                        await prisma_1.prisma.event.update({
                            where: { id: event.id },
                            data: { googleEventId: googleEvent.id }
                        });
                    }
                    catch (err) {
                        console.error('[Google Calendar Weather Sync Failed]', err);
                    }
                    return {
                        success: true,
                        message: `Successfully scheduled Saturday morning run in ${user.location}. Temp: ${forecast.saturday.temp}°C.`,
                        day: 'Saturday',
                        event
                    };
                }
            }
        }
        // --- EVALUATE SUNDAY ---
        if (forecast.sunday && (0, weather_1.checkRunningCriteria)(forecast.sunday)) {
            const sunLocal = new Date(todayLocal);
            sunLocal.setUTCDate(todayLocal.getUTCDate() + daysToSun);
            sunLocal.setUTCHours(8, 0, 0, 0); // 8:00 AM local
            const sunStartUtc = new Date(sunLocal.getTime() - timezoneOffsetMs);
            const sunEndUtc = new Date(sunStartUtc.getTime() + 60 * 60 * 1000); // 9:00 AM local
            // Check DB duplication
            const existingDbEvent = await prisma_1.prisma.event.findFirst({
                where: {
                    userId: user.id,
                    source: 'weather',
                    startTime: sunStartUtc
                }
            });
            if (!existingDbEvent) {
                // Check Google Calendar duplication & conflicts
                const isGoogleDuplicate = await (0, google_1.checkDuplicateWeatherRun)(oauthClient, sunStartUtc, sunEndUtc);
                const isConflict = await (0, google_1.checkCalendarConflict)(oauthClient, sunStartUtc, sunEndUtc);
                if (!isGoogleDuplicate && !isConflict) {
                    // Match! Create Sunday morning run.
                    const description = `Weekend morning run (automatically scheduled). Temp: ${forecast.sunday.temp}°C, Weather conditions: ${forecast.sunday.description}.`;
                    const event = await prisma_1.prisma.event.create({
                        data: {
                            userId: user.id,
                            title: 'Morning Run 🏃‍♂️',
                            description,
                            startTime: sunStartUtc,
                            endTime: sunEndUtc,
                            location: user.location,
                            source: 'weather',
                            status: 'confirmed'
                        }
                    });
                    try {
                        const googleEvent = await (0, google_1.createGoogleCalendarEvent)(oauthClient, {
                            title: 'Morning Run 🏃‍♂️',
                            description,
                            startTime: sunStartUtc,
                            endTime: sunEndUtc,
                            location: user.location,
                            extendedProperties: {
                                private: { source: 'auto-weather-run' }
                            }
                        });
                        await prisma_1.prisma.event.update({
                            where: { id: event.id },
                            data: { googleEventId: googleEvent.id }
                        });
                    }
                    catch (err) {
                        console.error('[Google Calendar Weather Sync Failed]', err);
                    }
                    return {
                        success: true,
                        message: `Successfully scheduled Sunday morning run in ${user.location}. Temp: ${forecast.sunday.temp}°C.`,
                        day: 'Sunday',
                        event
                    };
                }
            }
        }
        return {
            success: false,
            message: `Checked weather for ${user.location} but no suitable weekend slots were available (due to temperature >= 25°C, rain/precipitation probability >= 30%, existing schedule conflicts, or already scheduled).`
        };
    }
    catch (error) {
        console.error('[planWeekendRunForUser Error]', error);
        return { success: false, message: `Failed to evaluate weekend runs: ${error.message}` };
    }
}
/**
 * Controller endpoint to manually trigger a weather scheduling evaluation.
 */
async function triggerWeatherCheck(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const result = await planWeekendRunForUser(req.user.id);
    if (!result.success) {
        return res.status(200).json(result); // Return status 200 with result message even if no run was scheduled
    }
    return res.json(result);
}
