{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallScriptController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const CallScriptRepository_1 = __webpack_require__(/*! @/repositories/CallScriptRepository */ "./src/repositories/CallScriptRepository.ts");
class CallScriptController extends BaseController_1.BaseController {
    serverVersion = async (request, response) => {
        return response.status(200).send(`App version: ${process.version}`);
    };
    upsert = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await CallScriptRepository_1.CallScriptRepository.upsert(requestData, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: result
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    delete = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await CallScriptRepository_1.CallScriptRepository.delete(requestData, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: result
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    list = async (request, response) => {
        try {
            const result = await CallScriptRepository_1.CallScriptRepository.list(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Call Script List',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    callScriptById = async (request, response) => {
        try {
            const result = await CallScriptRepository_1.CallScriptRepository.callScriptById(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Call Script details retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
}
exports.CallScriptController = CallScriptController;


//# sourceURL=webpack://campaign-api/./src/controllers/CallScriptController.ts?
}