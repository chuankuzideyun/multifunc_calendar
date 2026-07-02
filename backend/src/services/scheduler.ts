import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { planFutureRunsForUser } from '../controllers/weatherController';

export function initScheduler() {
  console.log('[Scheduler] Initializing background tasks...');

  // Daily at 08:00 (cron pattern: 0 8 * * *)
  // Schedules a running evaluation for all active users
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Triggering daily weather running planner at 08:00...');
    
    try {
      const users = await prisma.user.findMany({
        where: {
          googleRefreshTokenEncrypted: { not: null },
          location: { not: null }
        }
      });

      console.log(`[Scheduler] Found ${users.length} eligible users for run planning.`);

      for (const user of users) {
        try {
          console.log(`[Scheduler] Evaluating weather running plan for ${user.email} (City: ${user.location})...`);
          const result = await planFutureRunsForUser(user.id);
          console.log(`[Scheduler] Result for ${user.email}: ${result.message}`);
        } catch (userErr) {
          console.error(`[Scheduler Error] Failed processing user ${user.email}:`, userErr);
        }
      }
    } catch (error) {
      console.error('[Scheduler Error] Weather running planner cron failed:', error);
    }
  });

  console.log('[Scheduler] Daily 8:00 weather running cron scheduled successfully.');
}
