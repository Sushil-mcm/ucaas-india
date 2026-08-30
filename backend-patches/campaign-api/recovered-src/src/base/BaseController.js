{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseController = void 0;
const ResponseModel_1 = __webpack_require__(/*! ./ResponseModel */ "./src/base/ResponseModel.ts");
class BaseController {
    handleError(apiError, error, response) {
        // Extract file and line number from stack trace
        const stackLine = error?.stack?.split('\n')[1]?.trim() || '';
        // Example: "at MyService.myFunction (/path/to/file.ts:45:13)"
        const fileMatch = stackLine.match(/\(([^)]+)\)/);
        const location = fileMatch ? fileMatch[1] : 'unknown location';
        // Build error message
        const message = error?.message || apiError?.message || 'Unexpected error occurred';
        // Use correct status code fallback
        const statusCode = apiError?.status ?? 500;
        console.error(`❌ Error: ${message} at ${location}`);
        return response.status(statusCode).send(new ResponseModel_1.ResponseModel({
            success: false,
            error: {
                message,
                location, // add location info in response if needed
            },
        }));
    }
    isNull(val) {
        if (typeof val === "string") {
            val = val.trim();
        }
        if (val === undefined || val === null || typeof val === "undefined" || val === "" || val === "undefined" || typeof val === undefined) {
            return true;
        }
        return false;
    }
}
exports.BaseController = BaseController;


//# sourceURL=webpack://campaign-api/./src/base/BaseController.ts?
}