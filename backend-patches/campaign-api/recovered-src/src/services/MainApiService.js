{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MainApiService = exports.MainApiError = void 0;
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
const axios_retry_1 = __importDefault(__webpack_require__(/*! axios-retry */ "axios-retry"));
const opossum_1 = __importDefault(__webpack_require__(/*! opossum */ "opossum"));
const winston_1 = __importDefault(__webpack_require__(/*! winston */ "winston"));
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const secret_1 = __importDefault(__webpack_require__(/*! @/config/secret */ "./src/config/secret.ts"));
const logDir = path_1.default.join(__dirname, "../../logs");
// Ensure the log directory exists
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// Get today's date for log file naming
const isoDate = new Date().toISOString();
const ymdDate = isoDate.substring(0, 10); // e.g., 2024-10-11
// Configure Winston logger
const logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json() // Logs in structured JSON format
    ),
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
const mainApi = axios_1.default.create();
// Configure axios-retry
(0, axios_retry_1.default)(mainApi, {
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
class MainApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "MainApiError";
    }
}
exports.MainApiError = MainApiError;
// Circuit breaker configuration
const circuitBreakerOptions = {
    timeout: 10000, // If tenant API takes longer than 3s, consider it failed
    errorThresholdPercentage: 50, // Open circuit after 50% failed requests
    resetTimeout: 10000, // Wait 10 seconds before trying again
};
const breaker = new opossum_1.default(mainApi, circuitBreakerOptions);
// Circuit breaker events
breaker.on("open", () => logger.warn("Circuit breaker opened"));
breaker.on("halfOpen", () => logger.info("Circuit breaker half-open, testing the API"));
breaker.on("close", () => logger.info("Circuit breaker closed, API healthy again"));
class MainApiService {
    // Method to call the main API
    static callMainApi = async (endpoint, method = "GET", token, data) => {
        try {
            const headers = {
                Authorization: token,
            };
            const config = {
                method: method,
                url: `${secret_1.default?.MAIN_API_URL}/${endpoint}`,
                headers: headers,
                data: ["POST"].includes(method) ? data : undefined,
            };
            // Wrap API call with circuit breaker
            // const response = await breaker.fire(config);
            const response = await mainApi(config);
            // Log successful API call
            logger.info(`Main server call successful: ${config.url}`, {
                // tenantDbName,
                responseStatus: response.status,
                responseData: response.data,
            });
            // Optionally check if response is empty and throw an error
            if (!response || response.status !== 200 || !response.data) {
                throw new MainApiError("No response from main API", 500);
            }
            return response;
        }
        catch (error) {
            // Log the error
            logger.error(`Main server call failed: ${error.message}`, {
                error: error.stack,
                // tenantDbName,
                endpoint,
            });
            if (error.response) {
                throw new MainApiError(`Main server: ${error?.response?.data?.message}`, error.response.status);
            }
            else if (error.request) {
                throw new MainApiError(error, 500);
            }
            else {
                throw new MainApiError(`Main server call failed: ${error.message}`, 500);
            }
        }
    };
}
exports.MainApiService = MainApiService;


//# sourceURL=webpack://campaign-api/./src/services/MainApiService.ts?
}