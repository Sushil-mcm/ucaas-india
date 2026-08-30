{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const CampaignRepository_1 = __webpack_require__(/*! @/repositories/CampaignRepository */ "./src/repositories/CampaignRepository.ts");
const LiveCallRepository_1 = __webpack_require__(/*! @/repositories/LiveCallRepository */ "./src/repositories/LiveCallRepository.ts");
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
class CampaignController extends BaseController_1.BaseController {
    getRequestUser(request) {
        if (!request.user) {
            throw new HttpException_1.HttpException(401, "Unauthorized");
        }
        return request.user;
    }
    campaignList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign list retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignGlobalSearch = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignGlobalSearch(request.body, user);
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
    campaignUpsert = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignUpsert(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign saved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignTemplateList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignTemplateList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign template list retrieved successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignTemplateUpsert = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignTemplateUpsert(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign template saved successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    deleteCampaignTemplate = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.deleteCampaignTemplate(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign template deleted successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignDetailByIdTemplate = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignDetailByIdTemplate(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Template campaign detail retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    deleteCampaign = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.deleteCampaign(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign deleted successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignDetailById = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignDetailById(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign detail retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignRuntimeAnalytics = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignRuntimeAnalytics(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign runtime analytics retrieved successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    changeCampaignState = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.changeCampaignState(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign state changed successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignRandomLead = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.campaignRandomLead(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign leads retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    validateAssignedLead = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.validateAssignedLead(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: result.message,
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    memberCampaign = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.memberCampaign(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign list retrieved successfully', // Member's campaign list
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    companyActiveCampaignList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.companyActiveCampaignList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Active campaign list retrieved successfully',
                    result,
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    memberCampaignLeadList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.memberCampaignLeadList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign member leads retrieved successfully',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    contactActivityCallSave = async (request, response) => {
        try {
            const result = await CampaignRepository_1.CampaignRepository.contactActivityCallSave(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    walletUpdateWebhook = async (request, response) => {
        try {
            const result = await CampaignRepository_1.CampaignRepository.walletUpdateWebhook(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    contactActivityNoteSave = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CampaignRepository_1.CampaignRepository.contactActivityNoteSave(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignAiLiveCallTest = async (request, response) => {
        try {
            const result = await LiveCallRepository_1.LiveCallRepository.campaignAiLiveCall(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    liveCallList = async (request, response) => {
        try {
            const result = await LiveCallRepository_1.LiveCallRepository.liveCallList(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    activeCampaignListTest = async (request, response) => {
        try {
            const result = await LiveCallRepository_1.LiveCallRepository.activeCampaignList(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignAiAgentDataTest = async (request, response) => {
        try {
            const result = await LiveCallRepository_1.LiveCallRepository.campaignAiAgentData(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignCallFlowFunnelTest = async (request, response) => {
        try {
            const result = await LiveCallRepository_1.LiveCallRepository.campaignCallFlowFunnel(request.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Success',
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
exports.CampaignController = CampaignController;


//# sourceURL=webpack://campaign-api/./src/controllers/CampaignController.ts?
}