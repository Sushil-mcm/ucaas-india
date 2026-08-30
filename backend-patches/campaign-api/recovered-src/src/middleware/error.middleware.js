{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.globalErrorHandler = globalErrorHandler;
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
function globalErrorHandler(err, req, res, next) {
    // Normalize error
    const error = err instanceof HttpException_1.HttpException
        ? err
        : err instanceof Error
            ? new HttpException_1.HttpException(500, err.message)
            : new HttpException_1.HttpException(500, "Unknown error occurred");
    res.status(error.status).json({
        success: false,
        message: error.message,
        errors: error.errors ?? null,
    });
}


//# sourceURL=webpack://campaign-api/./src/middleware/error.middleware.ts?
}