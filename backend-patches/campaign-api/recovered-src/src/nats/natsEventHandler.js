{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NatsEventUtils = void 0;
const CampaignSocketController_1 = __webpack_require__(/*! @/controllers/CampaignSocketController */ "./src/controllers/CampaignSocketController.ts");
const LiveCallRepository_1 = __webpack_require__(/*! @/repositories/LiveCallRepository */ "./src/repositories/LiveCallRepository.ts");
let campaignSocket = new CampaignSocketController_1.CampaignSocketController();
class NatsEventUtils {
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static natsEventHandlerMap(subject) {
        const handlerMap = {
            "callcampaign.contact.list": campaignSocket.campaignPreviewContactList,
            "callcampaign.random.contact": campaignSocket.campaignRandomLead,
            "callcampaign.contact.details": campaignSocket.campaignContactDetails,
            "callcampaign.system.events": campaignSocket.systemPredictiveLeadRequest,
            "callcampaign.agent.activity.action": campaignSocket.saveCampaignAgentActivity,
            "callcampaign.skip.lead": campaignSocket.campaignSkipLead,
            "callcampaign.event.logs": campaignSocket.campaignEventLogs,
            "callcampaign.lead.wrap": campaignSocket.campaignLeadWrap,
            /** Live Call Events (start) **/
            "callcampaign.live.call": LiveCallRepository_1.LiveCallRepository.liveCallList,
            "callcampaign.active.list": LiveCallRepository_1.LiveCallRepository.activeCampaignList,
            "callcampaign.call.flow.funnel": LiveCallRepository_1.LiveCallRepository.campaignCallFlowFunnel,
            "callcampaign.agent.data": LiveCallRepository_1.LiveCallRepository.campaignAgentData,
            "callcampaign.ai.live.call": LiveCallRepository_1.LiveCallRepository.campaignAiLiveCall,
            "callcampaign.ai.agent.data": LiveCallRepository_1.LiveCallRepository.campaignAiAgentData,
            /** Live Call Events (end) **/
        };
        return handlerMap[subject];
    }
}
exports.NatsEventUtils = NatsEventUtils;


//# sourceURL=webpack://campaign-api/./src/nats/natsEventHandler.ts?
}