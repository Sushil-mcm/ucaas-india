{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AIApiService = exports.AIApiError = void 0;
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
const axios_retry_1 = __importDefault(__webpack_require__(/*! axios-retry */ "axios-retry"));
const opossum_1 = __importDefault(__webpack_require__(/*! opossum */ "opossum"));
const winston_1 = __importDefault(__webpack_require__(/*! winston */ "winston"));
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
// Logger setup
const logDir = path_1.default.join(__dirname, "../../logs");
// Ensure the log directory exists
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, {
        recursive: true
    });
}
// Get today's date for log file naming
const isoDate = new Date().toISOString();
const ymdDate = isoDate.substring(0, 10); // e.g., 2024-10-11
// Configure Winston logger
const logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        // Error log file (e.g., /logs/errors-YYYY-MM-DD.log)
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, `errors-${ymdDate}.log`),
            level: "error",
        }),
        // Combined log file (e.g., /logs/combined-YYYY-MM-DD.log)
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, `combined-${ymdDate}.log`),
        }),
    ],
});
// Create an axios instance
const AIApi = axios_1.default.create();
// Configure axios-retry
(0, axios_retry_1.default)(AIApi, {
    retries: 3, // Retry up to 3 times
    retryDelay: (retryCount) => {
        return 2 ** retryCount * 1000; // Exponential backoff (2^retryCount seconds)
    },
    retryCondition: (error) => {
        // Retry on specific error conditions (e.g., network errors, server errors)
        return error.code === "ECONNREFUSED" || error.response?.status >= 500;
    },
});
// Define a custom error for Tenant API
class AIApiError extends Error {
    statusCode;
    service;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.service = 'AI';
        this.name = "AIApiError";
    }
}
exports.AIApiError = AIApiError;
// Circuit breaker configuration
const circuitBreakerOptions = {
    timeout: 10000, // If tenant API takes longer than 3s, consider it failed
    errorThresholdPercentage: 50, // Open circuit after 50% failed requests
    resetTimeout: 10000, // Wait 10 seconds before trying again
};
const breaker = new opossum_1.default(AIApi, circuitBreakerOptions);
// Circuit breaker events
breaker.on("open", () => logger.warn("Circuit breaker opened"));
breaker.on("halfOpen", () => logger.info("Circuit breaker half-open, testing the API"));
breaker.on("close", () => logger.info("Circuit breaker closed, API healthy again"));
//const AI_API_URL =process.env.AI_API_URL;
const AI_API_URL = "https://ai.mycountrymobile.com:8443";
class AIApiService {
    // Method to call the AI API
    static async callAIProcess(action, postData = {}) {
        try {
            const response = await axios_1.default.post(`https://ai.mycountrymobile.com:8443${action}`, postData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            if (error?.response?.status) {
                throw new Error(`${error?.response?.data?.error}`);
            }
            throw new Error(error?.message);
        }
    }
    static async getCallAIProcess(action) {
        try {
            const response = await axios_1.default.get(`https://ai.mycountrymobile.com:8443${action}`);
            return response.data;
        }
        catch (error) {
            if (error?.response?.status) {
                throw new Error(`${error?.response?.data?.error}`);
            }
            throw new Error(error?.message);
        }
    }
}
exports.AIApiService = AIApiService;


//# sourceURL=webpack://campaign-api/./src/services/AIApiService.ts?
}