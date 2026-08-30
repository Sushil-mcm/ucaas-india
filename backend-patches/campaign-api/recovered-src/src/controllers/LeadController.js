{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LeadController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const LeadRepository_1 = __webpack_require__(/*! @/repositories/LeadRepository */ "./src/repositories/LeadRepository.ts");
class LeadController extends BaseController_1.BaseController {
    serverVersion = async (request, response) => {
        return response.status(200).send(`App version: ${process.version}`);
    };
    leadList = async (request, response) => {
        try {
            const result = await LeadRepository_1.LeadRepository.leadList(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Lead List',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    updateLead = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await LeadRepository_1.LeadRepository.updateLead(requestData, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Lead updated successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    deleteLead = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await LeadRepository_1.LeadRepository.deleteLead(requestData, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Lead deleted successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    addLeadCsvXlsx = async (request, response) => {
        try {
            const requestData = {
                file: request?.file || request?.body?.file,
                body: request?.body?.body || request?.body,
            };
            const result = await LeadRepository_1.LeadRepository.addLeadCsvXlsx(requestData, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Lead file is under process. You will be notified once processing is complete.',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    leadGroupUpsert = async (request, response) => {
        try {
            const requestData = request.body;
            const result = await LeadRepository_1.LeadRepository.leadGroupUpsert(requestData, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Group saved successfully',
                    result,
                }
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    leadGroupList = async (request, response) => {
        try {
            const result = await LeadRepository_1.LeadRepository.leadGroupList(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'group List retrieved successfully.',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    leadGroupGlobalSearch = async (request, response) => {
        try {
            const result = await LeadRepository_1.LeadRepository.leadGroupGlobalSearch(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: result,
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    leadGroupById = async (request, response) => {
        try {
            const result = await LeadRepository_1.LeadRepository.leadGroupById(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Group details retrieved successfully.',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    deleteGroup = async (request, response) => {
        try {
            const result = await LeadRepository_1.LeadRepository.deleteGroup(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Lead group deleted successfully.',
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
exports.LeadController = LeadController;


//# sourceURL=webpack://campaign-api/./src/controllers/LeadController.ts?
}