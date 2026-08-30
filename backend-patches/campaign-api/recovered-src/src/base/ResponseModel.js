{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResponseModel = void 0;
class ResponseModel {
    success;
    data;
    error;
    meta;
    constructor({ success = true, data, error, meta }) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.meta = meta;
    }
}
exports.ResponseModel = ResponseModel;


//# sourceURL=webpack://campaign-api/./src/base/ResponseModel.ts?
}