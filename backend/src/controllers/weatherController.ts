import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { getFutureWeather } from '../services/weather';

/**
 * Plans runs for the future 7 days (8:00-9:00 AM local time) for a user based on weather.
 * 1. Checks weather conditions.
 * 2. Checks for duplicate events in DB (same user, source: weather, same startTime, status in pending/confirmed).
 * 3. Creates pending events in local DB if conditions are met.
 */
export async function planFutureRunsForUser(userId: string): Promise<{
  success: boolean;
  message: string;
  suggestionsCreated: number;
  forecast: any[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { success: false, message: 'User not found.', suggestionsCreated: 0, forecast: [] };
  }

  if (!user.location) {
    return {
      success: false,
      message: 'Location is not set in settings. Please set your city to enable weather run scheduling.',
      suggestionsCreated: 0,
      forecast: []
    };
  }

  try {
    const forecast = await getFutureWeather(user.location);
    let suggestionsCreated = 0;

    for (const day of forecast) {
      if (day.suitable) {
        // Check DB duplication (same day weather running events that are pending or confirmed)
        const existingDbEvent = await prisma.event.findFirst({
          where: {
            userId: user.id,
            source: 'weather',
            status: { in: ['pending', 'confirmed'] },
            startTime: day.startTime
          }
        });

        if (!existingDbEvent) {
          // Create weather suggestion event in DB as pending
          await prisma.event.create({
            data: {
              userId: user.id,
              title: 'Morning Run',
              description: `Weather suggestion: ${day.reason}`,
              startTime: day.startTime,
              endTime: day.endTime,
              location: user.location,
              source: 'weather',
              status: 'pending',
              confidence: 0.95
            }
          });
          suggestionsCreated++;
        }
      }
    }

    const message = suggestionsCreated > 0
      ? `Weather check completed. Found ${suggestionsCreated} suitable morning run slots in the next 7 days, added to the pending queue.`
      : 'Weather check completed. No suitable weather slots or existing duplicate morning run schedules found in the next 7 days.';

    return {
      success: true,
      message,
      suggestionsCreated,
      forecast
    };
  } catch (error: any) {
    console.error('[planFutureRunsForUser Error]', error);
    return {
      success: false,
      message: `Failed to evaluate future runs: ${error.message}`,
      suggestionsCreated: 0,
      forecast: []
    };
  }
}

/**
 * Controller endpoint to manually trigger a weather scheduling evaluation.
 */
export async function triggerWeatherCheck(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const result = await planFutureRunsForUser(req.user.id);
  
  return res.json(result);
}
