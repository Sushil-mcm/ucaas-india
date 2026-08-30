{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.defaultJobOptions = void 0;
exports.defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};


//# sourceURL=webpack://campaign-api/./src/queues/jobOptions.ts?
}