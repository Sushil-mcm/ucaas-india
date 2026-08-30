{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const Logger = (req, res, next) => {
    const isoDate = new Date().toISOString();
    const ymdDate = isoDate.substring(0, 10);
    const logDir = path_1.default.join(__dirname, "../../logs");
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path_1.default.join(logDir, `requests-${ymdDate}.log`);
    // Log request details
    const logRequestDetails = () => {
        const requestBodyForLog = { ...req.body };
        // const requestHeaderForLog = { ...req.headers };
        if (requestBodyForLog?.password) {
            requestBodyForLog.password = "*****";
        }
        /*
        if (requestHeaderForLog?.authorization) { requestHeaderForLog.authorization = '*****'; }
        const log = `[${new Date().toISOString()}] Request: ${req.method} ${req.headers.host}${req.url} - Body: ${JSON.stringify(requestBodyForLog)} - Headers: ${JSON.stringify(requestHeaderForLog)}\n`;
        */
        if (req.url !== "/api/v1/view-logs") {
            const log = `[${new Date().toISOString()}] Request: ${req.method} ${req.headers.host}${req.url} - Body: ${JSON.stringify(requestBodyForLog)}\n`;
            fs_1.default.appendFileSync(logFilePath, log);
        }
    };
    // Log response details
    const logResponseDetails = (statusCode, responseBody) => {
        if (req.url !== "/api/v1/view-logs") {
            const log = `[${new Date().toISOString()}] Response: ${statusCode} - Body: ${responseBody}\n\n`;
            fs_1.default.appendFileSync(logFilePath, log);
        }
    };
    logRequestDetails();
    let oldEnd = res.end;
    res.end = function (body) {
        logResponseDetails(res.statusCode, body);
        return oldEnd.apply(res, arguments);
    };
    next();
};
exports["default"] = Logger;


//# sourceURL=webpack://campaign-api/./src/middleware/Logger.ts?
}