{/* module decorator */ module = __webpack_require__.nmd(module);

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.startWorkers = startWorkers;
exports.stopWorkers = stopWorkers;
const DncRepository_1 = __webpack_require__(/*! @/repositories/DncRepository */ "./src/repositories/DncRepository.ts");
const LeadRepository_1 = __webpack_require__(/*! @/repositories/LeadRepository */ "./src/repositories/LeadRepository.ts");
const CampaignRepository_1 = __webpack_require__(/*! @/repositories/CampaignRepository */ "./src/repositories/CampaignRepository.ts");
const redis_1 = __webpack_require__(/*! @/config/redis */ "./src/config/redis.ts");
const createWorker_1 = __webpack_require__(/*! ./createWorker */ "./src/queues/workers/createWorker.ts");
const NatsController_1 = __webpack_require__(/*! @/nats/NatsController */ "./src/nats/NatsController.ts");
// workers/index.ts
const workers = [];
async function startWorkers(initializeNats = false) {
    if (!redis_1.isRedisEnabled) {
        console.log("Workers not created because REDIS_ENABLED=false");
        return;
    }
    if (workers.length) {
        return workers;
    }
    if (initializeNats) {
        await NatsController_1.NatsController.init(false);
    }
    workers.push((0, createWorker_1.createWorker)("DncQueue", (job) => DncRepository_1.DncRepository.processDncFile(job.data), 3));
    workers.push((0, createWorker_1.createWorker)("LeadQueue", (job) => LeadRepository_1.LeadRepository.processLeadFile(job.data), 5));
    workers.push((0, createWorker_1.createWorker)("CampaignLeadAssignmentQueue", (job) => CampaignRepository_1.CampaignRepository.processCampaignLeadAssignmentJob(job.data), 2));
    workers.push((0, createWorker_1.createWorker)("CampaignAnalyticsSyncQueue", (job) => CampaignRepository_1.CampaignRepository.processCampaignAnalyticsSyncJob(job.data), 2));
}
async function stopWorkers() {
    console.log("Shutting down workers...");
    await Promise.all(workers.map(w => w.close()));
}
if (__webpack_require__.c[__webpack_require__.s] === module) {
    startWorkers(true).catch((error) => {
        console.error("Failed to start workers", error);
        process.exit(1);
    });
    process.on("SIGTERM", async () => {
        await stopWorkers();
        process.exit(0);
    });
}


//# sourceURL=webpack://campaign-api/./src/queues/workers/index.ts?
}