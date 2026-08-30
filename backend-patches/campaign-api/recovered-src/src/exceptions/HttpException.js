{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpException = void 0;
class HttpException extends Error {
    status;
    message;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.message = message;
    }
    static showErrorMessage = async (status, message, res) => {
        return res.status(status).json({ success: false, error: { message: message } });
    };
}
exports.HttpException = HttpException;


//# sourceURL=webpack://campaign-api/./src/exceptions/HttpException.ts?
}