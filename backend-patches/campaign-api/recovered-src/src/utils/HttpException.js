{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpException = void 0;
class HttpException extends Error {
    status;
    errors;
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;
        Object.setPrototypeOf(this, HttpException.prototype);
    }
}
exports.HttpException = HttpException;


//# sourceURL=webpack://campaign-api/./src/utils/HttpException.ts?
}