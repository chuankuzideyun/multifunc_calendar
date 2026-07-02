"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../config/prisma");
const weatherController_1 = require("../controllers/weatherController");
function initScheduler() {
    console.log('[Scheduler] Initializing background tasks...');
    // Friday at 18:00 (cron pattern: 0 18 * * 5)
    // Schedules a running evaluation for all active users
    node_cron_1.default.schedule('0 18 * * 5', async () => {
        console.log('[Scheduler] Triggering weekly Friday 18:00 weather running planner...');
        try {
            const users = await prisma_1.prisma.user.findMany({
                where: {
                    googleRefreshTokenEncrypted: { not: null },
                    location: { not: null }
                }
            });
            console.log(`[Scheduler] Found ${users.length} eligible users for run planning.`);
            for (const user of users) {
                try {
                    console.log(`[Scheduler] Evaluating weather running plan for ${user.email} (City: ${user.location})...`);
                    const result = await (0, weatherController_1.planWeekendRunForUser)(user.id);
                    console.log(`[Scheduler] Result for ${user.email}: ${result.message}`);
                }
                catch (userErr) {
                    console.error(`[Scheduler Error] Failed processing user ${user.email}:`, userErr);
                }
            }
        }
        catch (error) {
            console.error('[Scheduler Error] Weather running planner cron failed:', error);
        }
    });
    console.log('[Scheduler] Weekly Friday 18:00 weather running cron scheduled successfully.');
}
exports.initScheduler = initScheduler;
