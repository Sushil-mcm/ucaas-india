{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignSocketController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const CommonHelper_1 = __importDefault(__webpack_require__(/*! @/helpers/CommonHelper */ "./src/helpers/CommonHelper.ts"));
const CampaignRepository_1 = __webpack_require__(/*! @/repositories/CampaignRepository */ "./src/repositories/CampaignRepository.ts");
class CampaignSocketController extends BaseController_1.BaseController {
    campaignPreviewContactList = async (request, response) => {
        try {
            let user = CommonHelper_1.default.createUserObject(request.body);
            let result = await CampaignRepository_1.CampaignRepository.getCampaignAssignmentsForUsers(request.body, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignRandomLead = async (request, response) => {
        let user = CommonHelper_1.default.createUserObject(request.body);
        void response;
        try {
            const result = await CampaignRepository_1.CampaignRepository.campaignRandomLead(request.body, user);
            return result;
        }
        catch {
            // return super.handleError(error as { status?: number }, errObject, response);
        }
    };
    campaignContactDetails = async (request, response) => {
        let user = CommonHelper_1.default.createUserObject(request.body);
        try {
            const result = await CampaignRepository_1.CampaignRepository.campaignContactDetails(request.body, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    systemPredictiveLeadRequest = async (request, response) => {
        let reqBody = request.body;
        let user = CommonHelper_1.default.createUserObject(reqBody);
        try {
            const result = await CampaignRepository_1.CampaignRepository.systemPredictiveLeadRequest(reqBody, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    saveCampaignAgentActivity = async (request, response) => {
        let user = CommonHelper_1.default.createUserObject(request.body);
        try {
            const result = await CampaignRepository_1.CampaignRepository.saveCampaignAgentActivity(request.body, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignSkipLead = async (request, response) => {
        let user = CommonHelper_1.default.createUserObject(request.body);
        try {
            const result = await CampaignRepository_1.CampaignRepository.campaignSkipLead(request.body, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignEventLogs = async (request, response) => {
        try {
            const result = await CampaignRepository_1.CampaignRepository.campaignEventLogs(request.body);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    campaignLeadWrap = async (request, response) => {
        try {
            const user = CommonHelper_1.default.createUserObject(request.body);
            const result = await CampaignRepository_1.CampaignRepository.campaignLeadWrap(request.body, user);
            return result;
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
}
exports.CampaignSocketController = CampaignSocketController;


//# sourceURL=webpack://campaign-api/./src/controllers/CampaignSocketController.ts?
}