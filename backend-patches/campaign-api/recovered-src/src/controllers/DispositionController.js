{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DispositionController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const DispositionRepository_1 = __webpack_require__(/*! @/repositories/DispositionRepository */ "./src/repositories/DispositionRepository.ts");
class DispositionController extends BaseController_1.BaseController {
    serverVersion = async (request, response) => {
        return response.status(200).send(`App version: ${process.version}`);
    };
    upsert = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await DispositionRepository_1.DispositionRepository.upsert(requestData, request?.user);
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
            const result = await DispositionRepository_1.DispositionRepository.delete(requestData, request?.user);
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
            const result = await DispositionRepository_1.DispositionRepository.list(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Disposition List',
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
exports.DispositionController = DispositionController;


//# sourceURL=webpack://campaign-api/./src/controllers/DispositionController.ts?
}