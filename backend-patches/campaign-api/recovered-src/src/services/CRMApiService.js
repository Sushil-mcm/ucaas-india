{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CRMApiService = exports.crmApiError = void 0;
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
    fs_1.default.mkdirSync(logDir, { recursive: true });
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
const crmApi = axios_1.default.create();
// Configure axios-retry
(0, axios_retry_1.default)(crmApi, {
    retries: 3, // Retry up to 3 times
    retryDelay: (retryCount) => {
        return 2 ** retryCount * 1000; // Exponential backoff (2^retryCount seconds)
    },
    retryCondition: (error) => {
        // Retry on specific error conditions (e.g., network errors, server errors)
        return error.code === "ECONNREFUSED" || error.response?.status >= 500;
    }
});
// Define a custom error for Contact API
class crmApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "crmApiError";
    }
}
exports.crmApiError = crmApiError;
// Circuit breaker configuration
const circuitBreakerOptions = {
    timeout: 10000, // If contact API takes longer than 3s, consider it failed
    errorThresholdPercentage: 50, // Open circuit after 50% failed requests
    resetTimeout: 10000, // Wait 10 seconds before trying again
};
const breaker = new opossum_1.default(crmApi, circuitBreakerOptions);
// Circuit breaker events
breaker.on("open", () => logger.warn("Circuit breaker opened"));
breaker.on("halfOpen", () => logger.info("Circuit breaker half-open, testing the API"));
breaker.on("close", () => logger.info("Circuit breaker closed, API healthy again"));
class CRMApiService {
    // Method to call the contact API
    static callCRMApi = async (endpoint, method = "GET", data, user) => {
        try {
            const headers = {
                "X-db-name": user?.connectionTenant,
                "X-User-company_uuid": user?.company_uuid?.toString(),
                "X-User-role": "ADMIN", //user?.role,
                "X-User-user_uuid": user?.user_uuid?.toString(),
                "X-User-extension": user?.extension,
                "X-User-callerId": user?.caller_id,
                "X-user-fromName": user?.caller_id,
                "X-user-domain": user?.domain,
            };
            const config = {
                method: method,
                url: `http://localhost:${process.env.CRM_INTEGRATION_PORT}/api/v1/${endpoint}`,
                headers: headers,
                params: method === 'GET' ? data : undefined,
                data: ["POST", "PATCH", "DELETE"].includes(method) ? data : undefined,
            };
            // Wrap API call with circuit breaker
            // const response = await breaker.fire(config);
            const response = await crmApi(config);
            // Log successful API call
            logger.info(`Contact API call successful: ${config.url}`, {
                responseStatus: response.status,
                responseData: response.data,
            });
            // Optionally check if response is empty and throw an error
            if (!response || response.status !== 200 || !response.data) {
                throw new crmApiError("No response from CRM_INTEGRATION API", 500);
            }
            return response;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status || 500;
                const errorData = error.response?.data || error.message;
                console.error('CRMApiService error:', errorData);
                throw new crmApiError(`CRMApiService error: ${JSON.stringify(errorData)}`, status);
            }
            else {
                // Non-Axios errors
                console.error('Unexpected error:', error.message || error);
                throw new crmApiError(error.message, 500);
            }
        }
    };
}
exports.CRMApiService = CRMApiService;


//# sourceURL=webpack://campaign-api/./src/services/CRMApiService.ts?
}