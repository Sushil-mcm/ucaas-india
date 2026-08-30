{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DncController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const DncRepository_1 = __webpack_require__(/*! @/repositories/DncRepository */ "./src/repositories/DncRepository.ts");
class DncController extends BaseController_1.BaseController {
    verifyDnc = async (request, response) => {
        try {
            const result = await DncRepository_1.DncRepository.verifyDnc(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: result.exists ? 'Dnc record found' : 'Dnc record not found',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    syncFtcDnc = async (request, response) => {
        try {
            const result = await DncRepository_1.DncRepository.syncFtcDnc(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'FTC DNC sync completed successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    addNumberToDnc = async (request, response) => {
        try {
            const result = await DncRepository_1.DncRepository.addNumberToDnc(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Dnc number added successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    dncList = async (request, response) => {
        try {
            const result = await DncRepository_1.DncRepository.dncList(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Dnc List',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    removeDnc = async (request, response) => {
        try {
            const result = await DncRepository_1.DncRepository.removeDnc(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Dnc removed successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    addDncCsvXlsx = async (request, response) => {
        try {
            const requestData = {
                file: request?.file || request?.body?.file,
                body: request?.body?.body || request?.body,
            };
            const result = await DncRepository_1.DncRepository.addDncCsvXlsx(requestData, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'DNC file is under process. You will be notified once processing is complete.',
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
exports.DncController = DncController;


//# sourceURL=webpack://campaign-api/./src/controllers/DncController.ts?
}