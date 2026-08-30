import { Router } from "express";
import { Routes } from "@/interfaces/RoutesInterface";
import { TenantAuthMiddleware } from "@/middlewares/TenantAuthMiddleware";
import { ReportController } from "@/controllers/ReportController";
import { IvrFilesController } from "@/controllers/IvrFilesController";
import { IvrController } from "@/controllers/IvrController";
import { ContactController } from "@/controllers/ContactController";
import { CallHandlingController } from "@/controllers/CallHandlingController";
import { DepartmentController } from "@/controllers/DepartmentController";
import { UserTemplateController } from "@/controllers/UserTemplateController";
import { ForwardingActionController } from "@/controllers/ForwardingActionController";
import CallController from "@/controllers/Call/CallController";
import { UserController } from "@/controllers/UserController";
import {
    callQueue,
    callQueueList,
    callVolume,
    inboundCalls,
    reportAgents,
} from "@/schemas/Calls";
import { upsertIvr } from "@/schemas/Ivr";
import Validator from "@/middlewares/TenantValidator";
import { AiController } from "@/controllers/AiController";
import { PrivateCallAuth } from "@/middlewares/PrivateCallAuth";
import { RecordingAccessFilter } from "@/middlewares/RecordingAccessFilter";
// import { RingGroupController } from "@/controllers/RingGroupController";
// import { SmsController } from "@/controllers/SmsController";

export class ApiRoute implements Routes {
    public path = "/api/v1";
    public router = Router();

    public ivrFiles = new IvrFilesController();
    public ai = new AiController();
    // public ringGroup = new RingGroupController();
    public ivr = new IvrController();
    public report = new ReportController();
    public contact = new ContactController();
    public call_handle = new CallHandlingController();
    public department = new DepartmentController();
    public user = new UserController();
    public user_template = new UserTemplateController();
    public forwarding_action = new ForwardingActionController();
    public call_history = new CallController();
    // public sms = new SmsController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        /* The company's rule about who may hear a recorded call back.
         *
         * It sits in front of everything rather than on the dozen endpoints that
         * can carry a recording, because a rule added to a dozen places is a rule
         * somebody forgets on the thirteenth. When a company has not switched
         * anything off — which is all but a handful of them — this hands the
         * request straight on, untouched. See RecordingAccessFilter for what it
         * costs and, just as importantly, what it does not cover. */
        this.router.use(RecordingAccessFilter);

        // IVR Files
        this.router.post(
            `${this.path}/greeting/create`,
            TenantAuthMiddleware,
            this.ivrFiles.createGreeting,
        );
        this.router.post(
            `${this.path}/greeting/update`,
            TenantAuthMiddleware,
            this.ivrFiles.updateGreeting,
        );
        this.router.post(
            `${this.path}/greeting/listing`,
            TenantAuthMiddleware,
            this.ivrFiles.greetingList,
        );
        this.router.post(
            `${this.path}/greeting/tts`,
            TenantAuthMiddleware,
            this.ivrFiles.textToSpeech,
        );
        this.router.delete(
            `${this.path}/greeting/delete`,
            TenantAuthMiddleware,
            this.ivrFiles.deleteGreeting,
        );

    // AI
    this.router.post(
      `${this.path}/ai/agent/create`,
      TenantAuthMiddleware,
      this.ai.createAgent,
    );
    this.router.post(
      `${this.path}/ai/agent/list`,
      TenantAuthMiddleware,
      this.ai.agentList,
    );
    this.router.post(
      `${this.path}/ai/agent/analytics`,
      TenantAuthMiddleware,
      this.ai.agentAnalytics,
    );
    this.router.post(
      `${this.path}/ai/get/agent/info`,
      TenantAuthMiddleware,
      this.ai.getAgentById,
    );
    this.router.post(
      `${this.path}/ai/agent/info`,
      TenantAuthMiddleware,
      this.ai.agentById,
    );
    this.router.post(
      `${this.path}/ai/agent/update`,
      TenantAuthMiddleware,
      this.ai.updateAiAgent,
    );
    this.router.post(
      `${this.path}/ai/agent/add-did`,
      TenantAuthMiddleware,
      this.ai.updateDIDToAiAgent,
    );
    this.router.post(
      `${this.path}/ai/agent/remove-did`,
      TenantAuthMiddleware,
      this.ai.removeDIDToAiAgent,
    );
    this.router.post(
      `${this.path}/ai/agent/delete`,
      TenantAuthMiddleware,
      this.ai.deleteAiAgent,
    );
    this.router.post(
      `${this.path}/ai/knowledge-base/create`,
      TenantAuthMiddleware,
      this.ai.createKnowledgeBase,
    );
    this.router.post(
      `${this.path}/ai/knowledge-base/update`,
      TenantAuthMiddleware,
      this.ai.updateKnowledgeBase,
    );
    this.router.post(
      `${this.path}/ai/knowledge-base/list`,
      TenantAuthMiddleware,
      this.ai.knowledgeBaseList,
    );
    this.router.post(
      `${this.path}/ai/knowledge-base/chunks`,
      TenantAuthMiddleware,
      this.ai.knowledgeChunks,
    );
    this.router.post(
      `${this.path}/ai/knowledge-base/delete`,
      TenantAuthMiddleware,
      this.ai.deleteKnowledgeBase,
    );
        // Duplicate AI routes already registered above.
        // this.router.post(
        //     `${this.path}/ai/agent/create`,
        //     TenantAuthMiddleware,
        //     this.ai.createAgent,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/list`,
        //     TenantAuthMiddleware,
        //     this.ai.agentList,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/info`,
        //     TenantAuthMiddleware,
        //     this.ai.agentById,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/update`,
        //     TenantAuthMiddleware,
        //     this.ai.updateAiAgent,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/add-did`,
        //     TenantAuthMiddleware,
        //     this.ai.updateDIDToAiAgent,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/remove-did`,
        //     TenantAuthMiddleware,
        //     this.ai.removeDIDToAiAgent,
        // );
        // this.router.post(
        //     `${this.path}/ai/agent/delete`,
        //     TenantAuthMiddleware,
        //     this.ai.deleteAiAgent,
        // );

        this.router.post(
            `${this.path}/ai/chat-agent/create`,
            TenantAuthMiddleware,
            this.ai.createChatAgent,
        );
        this.router.post(
            `${this.path}/ai/chat-agent/list`,
            TenantAuthMiddleware,
            this.ai.chatAgentList,
        );
        this.router.post(
            `${this.path}/ai/chat-agent/info`,
            TenantAuthMiddleware,
            this.ai.chatAgentById,
        );
        this.router.post(
            `${this.path}/ai/chat-agent/update`,
            TenantAuthMiddleware,
            this.ai.updateAiChatAgent,
        );
        this.router.post(
            `${this.path}/ai/chat-agent/add-did`,
            TenantAuthMiddleware,
            this.ai.updateDIDToAiChatAgent,
        );
        this.router.post(
            `${this.path}/ai/chat-agent/delete`,
            TenantAuthMiddleware,
            this.ai.deleteAiChatAgent,
        );
        this.router.post(
            `${this.path}/ai/agent/get-integrations-list`,
            TenantAuthMiddleware,
            this.ai.agentIntegrationList,
        );
        this.router.post(
            `${this.path}/ai/agent/add-integration`,
            TenantAuthMiddleware,
            this.ai.agentIntegrationAdd,
        );
        this.router.post(
            `${this.path}/ai/agent/delete-integration`,
            TenantAuthMiddleware,
            this.ai.agentIntegrationDelete,
        );

        this.router.post(`${this.path}/ai/agent-data`, this.ai.getAiAgentData);
        this.router.post(
            `${this.path}/ai/agent/status`,
            TenantAuthMiddleware,
            this.ai.updateAiAgentStatus,
        );

        // this.router.post(`${this.path}/greeting/tts`, TenantAuthMiddleware, this.ivrFiles.textToSpeech);
        // this.router.delete(`${this.path}/greeting/delete`, TenantAuthMiddleware, this.ivrFiles.deleteGreeting);

        // IVR
        this.router.post(
            `${this.path}/ivr/upsert`,
            TenantAuthMiddleware,
            Validator(upsertIvr, "body"),
            this.ivr.upsertIvr,
        );
        this.router.post(
            `${this.path}/ivr/listing`,
            TenantAuthMiddleware,
            this.ivr.ivrList,
        );
        this.router.delete(
            `${this.path}/ivr/delete`,
            TenantAuthMiddleware,
            this.ivr.ivrDelete,
        );
        this.router.post(
            `${this.path}/ivr/info/:uuid`,
            TenantAuthMiddleware,
            this.ivr.ivrInfo,
        );
        this.router.post(
            `${this.path}/ivr/delete-member-status`,
            TenantAuthMiddleware,
            this.ivr.setDeleteMemberStatusIvr,
        );

        // Reports Call
        this.router.post(
            `${this.path}/report/call-history`,
            TenantAuthMiddleware,
            this.report.callHistory,
        );
        this.router.post(
            `${this.path}/report/local-call-list`,
            TenantAuthMiddleware,
            this.report.localCallList,
        );
        this.router.post(
            `${this.path}/report/call-list`,
            TenantAuthMiddleware,
            this.report.callList,
        );
        this.router.post(
            `${this.path}/report/phone-call-list`,
            TenantAuthMiddleware,
            this.report.phoneCallList,
        );
        this.router.post(
            `${this.path}/report/call-analytics`,
            TenantAuthMiddleware,
            this.report.callAnalytics,
        );
        this.router.post(
            `${this.path}/report/inbound-calls`,
            Validator(inboundCalls, "body"),
            TenantAuthMiddleware,
            this.report.inboundCalls,
        );
        this.router.post(
            `${this.path}/report/call-volume`,
            Validator(callVolume, "body"),
            TenantAuthMiddleware,
            this.report.callVolume,
        );
        this.router.post(
            `${this.path}/report/agents`,
            Validator(reportAgents, "body"),
            TenantAuthMiddleware,
            this.report.reportAgents,
        );
        this.router.post(
            `${this.path}/report/call-queue/list`,
            Validator(callQueueList, "body"),
            TenantAuthMiddleware,
            this.report.callQueueList,
        );
        this.router.post(
            `${this.path}/report/call-queue`,
            Validator(callQueue, "body"),
            TenantAuthMiddleware,
            this.report.callQueue,
        );
        this.router.post(
            `${this.path}/report/history/:uuid`,
            TenantAuthMiddleware,
            this.report.callHistoryById,
        );
        this.router.get(
            `${this.path}/report/history/delete/:uuid`,
            TenantAuthMiddleware,
            this.report.callHistoryDelete,
        );
        this.router.post(
            `${this.path}/report/call-list-stats`,
            TenantAuthMiddleware,
            this.report.callListStats,
        );
        this.router.post(
            `${this.path}/calls/graph`,
            TenantAuthMiddleware,
            this.report.callGraph,
        );
        // this.router.post(`${this.path}/report/live-dashboard`, TenantAuthMiddleware, this.report.reportLiveDashboard);
        this.router.post(
            `${this.path}/calls/contact/activity`,
            TenantAuthMiddleware,
            this.report.callContactActivity,
        );

        // Voicemail Webhook
        this.router.post(
            `${this.path}/webhook/send-voicemail`,
            this.report.sendVoicemail,
        );
        this.router.post(
            `${this.path}/webhook/voicemail/send-email`,
            this.report.sendEmailWebhook,
        );

        //COntacts
        this.router.post(
            `${this.path}/contact/list`,
            TenantAuthMiddleware,
            this.contact.list,
        );
        this.router.post(
            `${this.path}/contact/bulk/upsert`,
            TenantAuthMiddleware,
            this.contact.bulkUpsert,
        );
        this.router.post(
            `${this.path}/contact/upsert`,
            TenantAuthMiddleware,
            this.contact.upsert,
        );
        this.router.delete(
            `${this.path}/contact/delete/:uuid`,
            TenantAuthMiddleware,
            this.contact.remove,
        );
        this.router.get(
            `${this.path}/contact/favourite/:uuid`,
            TenantAuthMiddleware,
            this.contact.markFav,
        );
        this.router.get(
            `${this.path}/contact/info/:phone`,
            TenantAuthMiddleware,
            this.contact.info,
        );

        this.router.post(
            `${this.path}/call-handling/template/listing`,
            TenantAuthMiddleware,
            this.call_handle.list,
        );
        this.router.post(
            `${this.path}/call-handling/template/upsert`,
            TenantAuthMiddleware,
            this.call_handle.upsert,
        );
        this.router.delete(
            `${this.path}/call-handling/template/delete/:uuid`,
            TenantAuthMiddleware,
            this.call_handle.remove,
        );
        this.router.get(
            `${this.path}/call-handling/template/info/:uuid`,
            TenantAuthMiddleware,
            this.call_handle.info,
        );

        this.router.post(
            `${this.path}/department/listing`,
            TenantAuthMiddleware,
            this.department.list,
        );
        this.router.post(
            `${this.path}/department/upsert`,
            TenantAuthMiddleware,
            this.department.upsert,
        );
        this.router.delete(
            `${this.path}/department/delete/:uuid`,
            TenantAuthMiddleware,
            this.department.remove,
        );
        this.router.get(
            `${this.path}/department/info/:uuid`,
            TenantAuthMiddleware,
            this.department.info,
        );
        this.router.get(
            `${this.path}/department/role-based-list`,
            TenantAuthMiddleware,
            this.department.roleBasedDepartment,
        );
        this.router.post(
            `${this.path}/department/delete-member-status/:uuid`,
            TenantAuthMiddleware,
            this.department.setDeleteMemberStatusGroup,
        );
        this.router.post(
            `${this.path}/department/profile-update-call`,
            TenantAuthMiddleware,
            this.department.profileUpdateCall,
        );

        this.router.post(
            `${this.path}/user/template/listing`,
            TenantAuthMiddleware,
            this.user_template.list,
        );
        this.router.post(
            `${this.path}/user/template/upsert`,
            TenantAuthMiddleware,
            this.user_template.upsert,
        );
        this.router.delete(
            `${this.path}/user/template/delete/:uuid`,
            TenantAuthMiddleware,
            this.user_template.remove,
        );
        this.router.get(
            `${this.path}/user/template/info/:uuid`,
            TenantAuthMiddleware,
            this.user_template.info,
        );

        this.router.post(
            `${this.path}/forwarding-action/type`,
            TenantAuthMiddleware,
            this.forwarding_action.forwardingActionList,
        );

        this.router.post(
            `${this.path}/company/:uuid/call-history`,
            TenantAuthMiddleware,
            this.call_history.list,
        ); //admin api
        this.router.post(
            `${this.path}/dashboard/call-history-graph`,
            TenantAuthMiddleware,
            this.call_history.callHistoryGraph,
        ); //without company_uuid global
        this.router.post(
            `${this.path}/internal/live-call-today-summary`,
            PrivateCallAuth,
            this.call_history.liveCallTodaySummary,
        );
        this.router.post(
            `${this.path}/xml/call-logs`,
            TenantAuthMiddleware,
            this.call_history.xmlBasedCallLogs,
        );
        this.router.post(
            `${this.path}/update/contact-data`,
            TenantAuthMiddleware,
            this.call_history.updateContactDataInCallHistory,
        );

        this.router.post(
            `${this.path}/user/involvement`,
            TenantAuthMiddleware,
            this.user.userInvolvement,
        );
        this.router.post(
            `${this.path}/tenant/company-list`,
            this.user.tenantCompanyList,
        );
    }
}
