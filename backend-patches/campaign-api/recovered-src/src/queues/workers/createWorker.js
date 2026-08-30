{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createWorker = createWorker;
const bullmq_1 = __webpack_require__(/*! bullmq */ "bullmq");
const redis_1 = __webpack_require__(/*! @/config/redis */ "./src/config/redis.ts");
function createWorker(queueName, processor, concurrency = 1) {
    const worker = new bullmq_1.Worker(queueName, async (job) => {
        console.log(`[${queueName}][PID:${process.pid}] Job ${job.id} started`);
        return processor(job);
    }, {
        connection: redis_1.redisConnection,
        limiter: {
            max: 10,
            duration: 1000,
        },
        concurrency,
    });
    worker.on("completed", (job) => console.log(`[${queueName}] Job ${job.id} completed`));
    worker.on("failed", (job, err) => console.error(`[${queueName}] Job ${job?.id} failed`, err));
    return worker;
}


//# sourceURL=webpack://campaign-api/./src/queues/workers/createWorker.ts?
}