{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ApiRoute = exports.asyncHandler = void 0;
const ApiErrors_1 = __webpack_require__(/*! @/constants/ApiErrors */ "./src/constants/ApiErrors.ts");
const CallNotesWithDispositionController_1 = __webpack_require__(/*! @/controllers/CallNotesWithDispositionController */ "./src/controllers/CallNotesWithDispositionController.ts");
const CallScriptController_1 = __webpack_require__(/*! @/controllers/CallScriptController */ "./src/controllers/CallScriptController.ts");
const CallStatisticsController_1 = __webpack_require__(/*! @/controllers/CallStatisticsController */ "./src/controllers/CallStatisticsController.ts");
const CampaignController_1 = __webpack_require__(/*! @/controllers/CampaignController */ "./src/controllers/CampaignController.ts");
const DispositionController_1 = __webpack_require__(/*! @/controllers/DispositionController */ "./src/controllers/DispositionController.ts");
const DncController_1 = __webpack_require__(/*! @/controllers/DncController */ "./src/controllers/DncController.ts");
const LeadController_1 = __webpack_require__(/*! @/controllers/LeadController */ "./src/controllers/LeadController.ts");
const Auth_1 = __webpack_require__(/*! @/middleware/Auth */ "./src/middleware/Auth.ts");
const RequireAdmin_1 = __webpack_require__(/*! @/middleware/RequireAdmin */ "./src/middleware/RequireAdmin.ts");
const upload_1 = __webpack_require__(/*! @/middleware/upload */ "./src/middleware/upload.ts");
const Validator_1 = __importDefault(__webpack_require__(/*! @/middleware/Validator */ "./src/middleware/Validator.ts"));
const CallScript_1 = __webpack_require__(/*! @/schemas/CallScript */ "./src/schemas/CallScript.ts");
const Campaign_1 = __webpack_require__(/*! @/schemas/Campaign */ "./src/schemas/Campaign.ts");
const Disposition_1 = __webpack_require__(/*! @/schemas/Disposition */ "./src/schemas/Disposition.ts");
const Dnc_1 = __webpack_require__(/*! @/schemas/Dnc */ "./src/schemas/Dnc.ts");
const Lead_1 = __webpack_require__(/*! @/schemas/Lead */ "./src/schemas/Lead.ts");
const note_1 = __webpack_require__(/*! @/schemas/note */ "./src/schemas/note.ts");
const express_1 = __webpack_require__(/*! express */ "express");
const queue_1 = __webpack_require__(/*! @/schemas/queue */ "./src/schemas/queue.ts");
const QueueController_1 = __webpack_require__(/*! @/controllers/QueueController */ "./src/controllers/QueueController.ts");
//asyncHandler error wrapper so you never write try/catch in controllers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
class ApiRoute {
    path = "/api/v1/campaign/";
    router = (0, express_1.Router)();
    campaign = new CampaignController_1.CampaignController();
    statistics = new CallStatisticsController_1.CallStatisticsController();
    callScript = new CallScriptController_1.CallScriptController();
    disposition = new DispositionController_1.DispositionController();
    lead = new LeadController_1.LeadController();
    dnc = new DncController_1.DncController();
    notesDisposition = new CallNotesWithDispositionController_1.CallNotesWithDispositionController();
    queue = new QueueController_1.QueueController();
    constructor() {
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get(`/`, this.callScript.serverVersion);
        /* campaign routes */
        this.router.post(`${this.path}list`, (0, Validator_1.default)(Campaign_1.campaignListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignList));
        this.router.post(`${this.path}upsert`, (0, Validator_1.default)(Campaign_1.upsertCampaignValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignUpsert));
        this.router.delete(`${this.path}delete`, (0, Validator_1.default)(Campaign_1.deleteCampaignValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.deleteCampaign));
        this.router.post(`${this.path}detail`, (0, Validator_1.default)(Campaign_1.campaignDetailByIdValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignDetailById));
        this.router.post(`${this.path}analytics`, (0, Validator_1.default)(Campaign_1.campaignDetailByIdValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignRuntimeAnalytics));
        this.router.post(`${this.path}global-search`, (0, Validator_1.default)(Campaign_1.campaignGlobalSearchValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignGlobalSearch));
        this.router.post(`${this.path}change-state`, (0, Validator_1.default)(Campaign_1.changeStateValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.changeCampaignState));
        this.router.post(`${this.path}random-leads`, (0, Validator_1.default)(Campaign_1.randomLeadValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignRandomLead));
        this.router.post(`${this.path}member-based`, (0, Validator_1.default)(Campaign_1.memberCampaignListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.memberCampaign));
        this.router.post(`${this.path}member-leads`, (0, Validator_1.default)(Campaign_1.memberCampaignLeadListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.memberCampaignLeadList));
        this.router.post(`${this.path}active/list`, (0, Validator_1.default)(Campaign_1.activeCampaignListValidation, 'body'), Auth_1.Auth, RequireAdmin_1.RequireAdmin, (0, exports.asyncHandler)(this.campaign.companyActiveCampaignList));
        this.router.post(`${this.path}statistics`, (0, Validator_1.default)(Campaign_1.paginationSchema, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.statistics.callStatisticsList));
        this.router.post(`${this.path}dropdown/list`, (0, Validator_1.default)(Campaign_1.paginationSchema, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.statistics.callStatisticsCampaignList));
        this.router.post(`${this.path}member/call/report`, (0, Validator_1.default)(Campaign_1.paginationSchema, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.statistics.memberCallsReport));
        /* Campaign Templates routes */
        this.router.post(`${this.path}template/list`, (0, Validator_1.default)(Campaign_1.campaignListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignTemplateList));
        this.router.post(`${this.path}template/upsert`, (0, Validator_1.default)(Campaign_1.upsertCampaignValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignTemplateUpsert));
        this.router.delete(`${this.path}template/delete`, (0, Validator_1.default)(Campaign_1.deleteCampaignValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.deleteCampaignTemplate));
        this.router.post(`${this.path}template/detail`, (0, Validator_1.default)(Campaign_1.campaignDetailByIdValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.campaignDetailByIdTemplate));
        /* lead routes */
        this.router.post(`${this.path}lead/list`, (0, Validator_1.default)(Lead_1.leadListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.leadList));
        this.router.post(`${this.path}lead/upload`, upload_1.upload.single('file'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.addLeadCsvXlsx));
        this.router.post(`${this.path}lead/update`, (0, Validator_1.default)(Lead_1.updateLeadValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.updateLead));
        this.router.delete(`${this.path}lead/delete`, (0, Validator_1.default)(Lead_1.deleteLeadValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.deleteLead));
        this.router.post(`${this.path}lead/group/upsert`, (0, Validator_1.default)(Lead_1.leadGroupUpsertValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.leadGroupUpsert));
        this.router.post(`${this.path}lead/group/list`, (0, Validator_1.default)(Lead_1.leadGroupListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.leadGroupList));
        this.router.post(`${this.path}lead/group/global-search`, (0, Validator_1.default)(Lead_1.leadGroupGlobalSearchValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.leadGroupGlobalSearch));
        this.router.post(`${this.path}lead/group/detail`, (0, Validator_1.default)(Lead_1.leadGroupByIdValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.leadGroupById));
        this.router.delete(`${this.path}lead/group/delete`, (0, Validator_1.default)(Lead_1.leadGroupDeleteValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.lead.deleteGroup));
        this.router.post(`${this.path}lead/validate-assignment`, (0, Validator_1.default)(Campaign_1.validateAssignedLeadValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.campaign.validateAssignedLead));
        /* Call Script routes */
        this.router.post(`${this.path}call-script/upsert`, (0, Validator_1.default)(CallScript_1.addCallScriptValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.callScript.upsert));
        this.router.post(`${this.path}call-script/list`, Auth_1.Auth, (0, Validator_1.default)(CallScript_1.CallScriptPaginationSchema, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.callScript.list));
        this.router.post(`${this.path}call-script/detail`, Auth_1.Auth, (0, Validator_1.default)(CallScript_1.callScriptByIdValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.callScript.callScriptById));
        this.router.delete(`${this.path}call-script/delete`, (0, Validator_1.default)(CallScript_1.callScriptUuidValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.callScript.delete));
        /* Disposition routes */
        this.router.post(`${this.path}disposition/upsert`, (0, Validator_1.default)(Disposition_1.createDispositionValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.disposition.upsert));
        this.router.post(`${this.path}disposition/list`, Auth_1.Auth, (0, Validator_1.default)(Disposition_1.DispositionPaginationSchema, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.disposition.list));
        this.router.delete(`${this.path}disposition/delete`, (0, Validator_1.default)(Disposition_1.dispositionUuidValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.disposition.delete));
        /* campaign contact routes */
        this.router.post(`${this.path}calls/contact-activity`, (0, exports.asyncHandler)(this.campaign.contactActivityCallSave));
        this.router.post(`${this.path}calls/wallet-update-webhook`, (0, exports.asyncHandler)(this.campaign.walletUpdateWebhook));
        this.router.post(`${this.path}contact/activity-note/save`, Auth_1.Auth, (0, Validator_1.default)(Campaign_1.contactActivityNoteSave, 'body'), (0, exports.asyncHandler)(this.campaign.contactActivityNoteSave));
        /* DNC routes */
        this.router.post(`${this.path}dnc/verify`, (0, Validator_1.default)(Dnc_1.verifyDncValidation, 'body'), (0, exports.asyncHandler)(this.dnc.verifyDnc));
        this.router.post(`${this.path}dnc/sync-ftc`, (0, Validator_1.default)(Dnc_1.syncFtcDncValidation, 'body'), (0, exports.asyncHandler)(this.dnc.syncFtcDnc));
        this.router.post(`${this.path}dnc/add`, (0, Validator_1.default)(Dnc_1.addNumberToDncValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.dnc.addNumberToDnc));
        this.router.post(`${this.path}dnc/list`, (0, Validator_1.default)(Dnc_1.dncListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.dnc.dncList));
        this.router.delete(`${this.path}dnc/remove`, (0, Validator_1.default)(Dnc_1.removeDncValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.dnc.removeDnc));
        this.router.post(`${this.path}dnc/upload`, upload_1.upload.single('file'), Auth_1.Auth, (0, exports.asyncHandler)(this.dnc.addDncCsvXlsx));
        /* Notes and Disposition routes */
        this.router.post(`${this.path}notes-disposition/save`, (0, Validator_1.default)(note_1.notesDispositionSaveValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.notesDisposition.callNoteDispositionSave));
        this.router.post(`${this.path}notes/list`, Auth_1.Auth, (0, Validator_1.default)(note_1.notesListValidation, 'body'), (0, exports.asyncHandler)(this.notesDisposition.callNoteList));
        /* Campaign retry call log routes */
        this.router.post(`${this.path}retry-call-log`, (0, Validator_1.default)(Campaign_1.retryCallLogListValidation, 'body'), Auth_1.Auth, (0, exports.asyncHandler)(this.statistics.retryCallLogList));
        /**Queue Routes**/
        this.router.post(`${this.path}queue/upsert`, (0, Validator_1.default)(queue_1.createQueueValidation, "body"), Auth_1.Auth, this.queue.upsert);
        this.router.post(`${this.path}queue/list`, Auth_1.Auth, this.queue.list);
        this.router.post(`${this.path}queue/info`, (0, Validator_1.default)(queue_1.queueUuIdValidation, "body"), Auth_1.Auth, this.queue.info);
        this.router.post(`${this.path}queue/public-info`, (0, Validator_1.default)(queue_1.publicQueueInfoValidation, "body"), this.queue.publicInfo);
        this.router.delete(`${this.path}queue/delete`, (0, Validator_1.default)(queue_1.queueUuIdValidation, "body"), Auth_1.Auth, this.queue.delete);
        this.router.post(`${this.path}queue/role-based-queue`, Auth_1.Auth, this.queue.getRoleBasedQueue);
        this.router.post(`${this.path}queue/queue-involvement`, Auth_1.Auth, this.queue.getQueueInvolvement);
        this.router.post(`${this.path}queue/agent/status`, (0, Validator_1.default)(queue_1.agentStatusValidation, "body"), Auth_1.Auth, this.queue.setAgentQueueStatus);
        /**Queue Template Routes**/
        this.router.post(`${this.path}template/queue/upsert`, (0, Validator_1.default)(queue_1.createQueueValidation, "body"), Auth_1.Auth, this.queue.templateUpsert);
        this.router.post(`${this.path}template/queue/list`, Auth_1.Auth, this.queue.templateList);
        this.router.delete(`${this.path}template/queue/delete`, (0, Validator_1.default)(queue_1.queueUuIdValidation, "body"), Auth_1.Auth, this.queue.templateDelete);
        this.router.post(`${this.path}template/queue/info`, (0, Validator_1.default)(queue_1.queueUuIdValidation, "body"), Auth_1.Auth, this.queue.templateInfo);
        this.router.post(`${this.path}test/live-call-list`, (0, exports.asyncHandler)(this.campaign.liveCallList));
        this.router.post(`${this.path}test/active-campaign-list`, (0, exports.asyncHandler)(this.campaign.activeCampaignListTest));
        this.router.post(`${this.path}test/campaign-ai-agent-data`, (0, exports.asyncHandler)(this.campaign.campaignAiAgentDataTest));
        this.router.post(`${this.path}test/campaign-call-flow-funnel`, (0, exports.asyncHandler)(this.campaign.campaignCallFlowFunnelTest));
        this.router.use(`/*`, (req, res) => {
            res.status(ApiErrors_1.ApiErrors.NotFound.status).send(ApiErrors_1.ApiErrors.NotFound);
        });
    }
}
exports.ApiRoute = ApiRoute;


//# sourceURL=webpack://campaign-api/./src/routes/api.ts?
}