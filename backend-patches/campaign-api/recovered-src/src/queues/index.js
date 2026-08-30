{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Queues = void 0;
// queues/index.ts
const bullmq_1 = __webpack_require__(/*! bullmq */ "bullmq");
const redis_1 = __webpack_require__(/*! @/config/redis */ "./src/config/redis.ts");
exports.Queues = {
    DNC: redis_1.isRedisEnabled
        ? new bullmq_1.Queue("DncQueue", { connection: redis_1.redisConnection })
        : null,
    LEAD: redis_1.isRedisEnabled
        ? new bullmq_1.Queue("LeadQueue", { connection: redis_1.redisConnection })
        : null,
    CAMPAIGN_LEAD_ASSIGNMENT: redis_1.isRedisEnabled
        ? new bullmq_1.Queue("CampaignLeadAssignmentQueue", { connection: redis_1.redisConnection })
        : null,
    CAMPAIGN_ANALYTICS_SYNC: redis_1.isRedisEnabled
        ? new bullmq_1.Queue("CampaignAnalyticsSyncQueue", { connection: redis_1.redisConnection })
        : null,
    // future queues go here
};


//# sourceURL=webpack://campaign-api/./src/queues/index.ts?
}