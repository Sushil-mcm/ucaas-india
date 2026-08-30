{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ApiErrors = void 0;
exports.ApiErrors = {
    ServerError: {
        success: false,
        status: 500,
        message: `Internal server error`,
    },
    NotFound: {
        success: false,
        status: 404,
        message: `Not found error`,
    },
    Unauthorized: {
        success: false,
        status: 401,
        message: `Unauthorized error`,
    },
    Unexpected: {
        success: false,
        status: 422,
        message: `Unexpected error`,
    },
};


//# sourceURL=webpack://campaign-api/./src/constants/ApiErrors.ts?
}