import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { getOAuth2Client, fetchRecentEmails, getEmailDetail } from '../services/google';
import { parseEmailContent } from '../services/gemini';
import { redisClient } from '../services/redis';

/**
 * Manually triggers Gmail synchronization.
 * Fetches emails from the last 7 days, filters them, parses via Gemini, and adds high-confidence events to the pending queue.
 */
export async function syncGmail(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.googleRefreshTokenEncrypted) {
      return res.status(400).json({ error: 'Google Calendar/Gmail credentials missing. Please sign in again.' });
    }

    const oauthClient = getOAuth2Client(user.googleRefreshTokenEncrypted);
    
    // 1. Fetch recent email headers/IDs (keyword filtered by Google API)
    const messages = await fetchRecentEmails(oauthClient, 7);
    
    let processedCount = 0;
    let newEventsCount = 0;

    // 2. Iterate through each email
    for (const msg of messages) {
      if (!msg.id) continue;

      const redisKey = `mail:processed:${user.id}:${msg.id}`;

      // Deduplication check via Redis
      let isProcessed = false;
      try {
        if (redisClient.isOpen) {
          const cacheVal = await redisClient.get(redisKey);
          isProcessed = !!cacheVal;
        }
      } catch (cacheErr) {
        console.error('[Redis Deduplication Check Failed, falling back to DB check]', cacheErr);
      }

      // Secondary DB check for safety
      if (!isProcessed) {
        const existingEvent = await prisma.event.findFirst({
          where: {
            userId: user.id,
            originalEmailId: msg.id
          }
        });
        if (existingEvent) {
          isProcessed = true;
          // Set cache if we missed it
          try {
            if (redisClient.isOpen) {
              await redisClient.setEx(redisKey, 30 * 24 * 3600, '1');
            }
          } catch (_) {}
        }
      }

      if (isProcessed) {
        continue;
      }

      processedCount++;

      // 3. Fetch full email content
      const emailDetail = await getEmailDetail(oauthClient, msg.id);

      // 4. Send to Gemini for event extraction
      const extractedEvents = await parseEmailContent(
        emailDetail.subject,
        emailDetail.bodySnippet,
        emailDetail.emailDate
      );

      // 5. Store high-confidence events in database
      for (const extEvent of extractedEvents) {
        if (extEvent.confidence > 0.6) {
          // Double-check start/end date parsing validity
          const start = new Date(extEvent.startTime);
          const end = new Date(extEvent.endTime);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`[WARNING] Gemini parsed invalid dates for email ${msg.id}. Skipping.`);
            continue;
          }

          await prisma.event.create({
            data: {
              userId: user.id,
              title: extEvent.title,
              description: `Automatically extracted from Gmail. Subject: "${emailDetail.subject}"\nSnippet: ${emailDetail.bodySnippet.substring(0, 180)}...`,
              startTime: start,
              endTime: end,
              location: extEvent.location || null,
              source: 'gmail',
              status: 'pending',
              confidence: extEvent.confidence,
              originalEmailId: msg.id
            }
          });
          newEventsCount++;
        }
      }

      // Mark email as processed in Redis
      try {
        if (redisClient.isOpen) {
          await redisClient.setEx(redisKey, 30 * 24 * 3600, '1'); // Cache for 30 days
        }
      } catch (cacheErr) {
        console.error('[Redis Set Error]', cacheErr);
      }
    }

    return res.json({
      message: `Sync completed. Scanned ${messages.length} relevant emails, fully parsed ${processedCount} new emails, extracted ${newEventsCount} events.`,
      newEventsCount
    });
  } catch (error) {
    console.error('[syncGmail Controller Error]', error);
    return res.status(500).json({ error: 'Failed to synchronize Gmail.' });
  }
}
