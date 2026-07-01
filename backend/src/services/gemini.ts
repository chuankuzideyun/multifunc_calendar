import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const emailEventSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'The title of the event, meeting, flight, reservation, or appointment.'
    },
    startTime: {
      type: SchemaType.STRING,
      description: 'The start time of the event in ISO 8601 format. Convert to UTC or provide local offset. If only the date is mentioned, set to 09:00:00 local time.'
    },
    endTime: {
      type: SchemaType.STRING,
      description: 'The end time of the event in ISO 8601 format. If not explicitly specified, assume 1 hour duration after startTime.'
    },
    location: {
      type: SchemaType.STRING,
      description: 'The location, address, Zoom/Google Meet link, or physical venue. Null if not specified.'
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: 'Confidence score (0.0 to 1.0) indicating how likely this email describes a schedule event to be created.'
    }
  },
  required: ['title', 'startTime', 'endTime', 'confidence']
};

const emailResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    events: {
      type: SchemaType.ARRAY,
      items: emailEventSchema,
      description: 'List of events extracted from the email. Return empty array if no event is found.'
    }
  },
  required: ['events']
};

const voiceEventSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'Title of the event. Null if not specified.'
    },
    startTime: {
      type: SchemaType.STRING,
      description: 'Start date and time of the event in ISO 8601 format. Use reference date/time provided in the prompt. Null if not specified.'
    },
    endTime: {
      type: SchemaType.STRING,
      description: 'End date and time in ISO 8601 format. Null if not specified.'
    },
    location: {
      type: SchemaType.STRING,
      description: 'Location or meeting venue if specified. Null if not specified.'
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: 'Confidence score (0.0 to 1.0) of the parsed details.'
    },
    missingInfo: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Crucial fields missing from the speech. Can include: "title", "date", "startTime", "endTime".'
    }
  },
  required: ['confidence', 'missingInfo']
};

/**
 * Parses email subject & body into structured calendar events.
 */
export async function parseEmailContent(
  subject: string,
  body: string,
  emailDate: Date
): Promise<any[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: emailResponseSchema,
    },
  });

  const prompt = `
    Analyze the following email and extract any calendar events (like meetings, bookings, travel, reservations, interviews).
    Email Date Received: ${emailDate.toISOString()}
    Subject: ${subject}
    Body Snippet:
    ${body}

    Instructions:
    1. If the email does NOT describe any specific schedule event, return an empty events array.
    2. Extract the start time and end time accurately. Relate relative dates (like "tomorrow", "this Friday", "next Monday") to the Email Date Received.
    3. Ensure times are output in standard ISO 8601 format.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);
    return data.events || [];
  } catch (error) {
    console.error('[Gemini Email Parse Error]', error);
    return [];
  }
}

/**
 * Parses a voice transcription text into structured event details.
 */
export async function parseVoiceTranscript(
  transcript: string,
  referenceDate: Date
): Promise<{
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  confidence: number;
  missingInfo: string[];
}> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: voiceEventSchema,
    },
  });

  const prompt = `
    Analyze the following voice-to-text transcript and extract details to create a calendar event.
    Reference Date/Time (Current Time): ${referenceDate.toISOString()}
    Transcript:
    "${transcript}"

    Instructions:
    1. Resolve relative time statements (e.g. "tomorrow at 3 PM", "next Monday morning", "meeting in 2 hours") relative to the Reference Date/Time.
    2. If any of the following fields are missing, list them in the "missingInfo" array:
       - "title" (if we don't know what the event is, e.g. "meeting", "dentist", "lunch")
       - "date" (if the date is completely unspecified)
       - "startTime" (if specific start time is missing, e.g. "meeting tomorrow" but no hour)
    3. Output the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('[Gemini Voice Parse Error]', error);
    return {
      confidence: 0,
      missingInfo: ['title', 'date', 'startTime']
    };
  }
}
