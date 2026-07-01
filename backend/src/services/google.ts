import { google } from 'googleapis';
import { env } from '../config/env';
import { decrypt } from './crypto';

/**
 * Generates an OAuth2 client configured with user credentials.
 */
export function getOAuth2Client(encryptedRefreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: decrypt(encryptedRefreshToken)
  });

  return oauth2Client;
}

/**
 * Creates an event in Google Calendar.
 */
export async function createGoogleCalendarEvent(
  oauth2Client: any,
  eventDetails: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    extendedProperties?: any;
  }
) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
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
export async function checkCalendarConflict(
  oauth2Client: any,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
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
  } catch (error) {
    console.error('[Google Conflict Check Error]', error);
    // If it fails, assume conflict to be safe
    return true;
  }
}

/**
 * Checks Google Calendar for an existing event with matching extended properties
 * to prevent duplicate creation of automated runs.
 */
export async function checkDuplicateWeatherRun(
  oauth2Client: any,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
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
  } catch (error) {
    console.error('[Google Duplicate Run Check Error]', error);
    return false;
  }
}

/**
 * Fetches recent emails pre-filtered by date and invitation keywords.
 */
export async function fetchRecentEmails(
  oauth2Client: any,
  lastNDays: number = 7
) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
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
  } catch (error) {
    console.error('[Google Gmail List Error]', error);
    return [];
  }
}

/**
 * Retrieves details for a specific email message.
 */
export async function getEmailDetail(oauth2Client: any, messageId: string) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
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
  } catch (error) {
    console.error(`[Google Gmail Get Error] ID: ${messageId}`, error);
    throw error;
  }
}
