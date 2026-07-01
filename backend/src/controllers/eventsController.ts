import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { getOAuth2Client, createGoogleCalendarEvent } from '../services/google';
import { google } from 'googleapis';

/**
 * Lists all events (confirmed and pending) for the logged-in user.
 */
export async function getEvents(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const events = await prisma.event.findMany({
      where: {
        userId: req.user.id,
        // Optional: you can filter out rejected events to clean up dashboard
        status: { in: ['pending', 'confirmed'] }
      },
      orderBy: { startTime: 'asc' }
    });

    return res.json(events);
  } catch (error) {
    console.error('[GetEvents Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Creates a manual event directly. It is automatically confirmed and written to Google Calendar.
 */
export async function createManualEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { title, description, startTime, endTime, location, source = 'manual' } = req.body;

  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Title, startTime, and endTime are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Write to Google Calendar first if OAuth refresh token is available
    let googleEventId: string | null = null;
    if (user.googleRefreshTokenEncrypted) {
      try {
        const oauthClient = getOAuth2Client(user.googleRefreshTokenEncrypted);
        const googleEvent = await createGoogleCalendarEvent(oauthClient, {
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location
        });
        googleEventId = googleEvent.id || null;
      } catch (err) {
        console.error('[Google Calendar Manual Sync Failed]', err);
        // Continue creating locally even if Google Calendar sync fails, but notify
      }
    }

    const event = await prisma.event.create({
      data: {
        userId: req.user.id,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        source: source as any, // Cast to EventSource enum
        status: 'confirmed',
        googleEventId
      }
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('[CreateManualEvent Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Confirms a pending event (from Gmail or Voice).
 * Writes the event to Google Calendar and changes status to confirmed.
 */
export async function confirmEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Event is already confirmed or rejected.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Sync to Google Calendar
    let googleEventId: string | null = null;
    if (user.googleRefreshTokenEncrypted) {
      try {
        const oauthClient = getOAuth2Client(user.googleRefreshTokenEncrypted);
        // Build extendedProperties if it is an automated weather run or gmail
        const extendedProperties = event.source === 'weather' ? {
          private: { source: 'auto-weather-run' }
        } : undefined;

        const googleEvent = await createGoogleCalendarEvent(oauthClient, {
          title: event.title,
          description: event.description || undefined,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location || undefined,
          extendedProperties
        });

        googleEventId = googleEvent.id || null;
      } catch (err) {
        console.error('[Google Calendar Sync Failed]', err);
        return res.status(500).json({ error: 'Failed to write event to Google Calendar. Please check connection.' });
      }
    } else {
      return res.status(400).json({ error: 'Google Calendar credentials missing. Please reconnect Google account.' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        status: 'confirmed',
        googleEventId
      }
    });

    return res.json(updatedEvent);
  } catch (error) {
    console.error('[ConfirmEvent Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Rejects a pending event. Updates status to rejected.
 */
export async function rejectEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Event is already confirmed or rejected.' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        status: 'rejected'
      }
    });

    return res.json(updatedEvent);
  } catch (error) {
    console.error('[RejectEvent Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Deletes an event. If it is confirmed and has a googleEventId, delete it from Google Calendar.
 */
export async function deleteEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Delete from Google Calendar if sync'd
    if (event.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (user && user.googleRefreshTokenEncrypted) {
        try {
          const oauthClient = getOAuth2Client(user.googleRefreshTokenEncrypted);
          const calendar = google.calendar({ version: 'v3', auth: oauthClient });
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: event.googleEventId
          });
        } catch (err: any) {
          // If the event was already deleted in Google Calendar, ignore the error and proceed
          if (err.code !== 410 && err.code !== 404) {
            console.error('[Google Calendar Delete Failed]', err);
            return res.status(500).json({ error: 'Failed to delete event from Google Calendar.' });
          }
        }
      }
    }

    await prisma.event.delete({
      where: { id }
    });

    return res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('[DeleteEvent Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
