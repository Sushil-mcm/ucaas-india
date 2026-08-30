{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadMainModels = exports.loadTenantModels = void 0;
const CallNotesModel_1 = __webpack_require__(/*! @/models/CallNotesModel */ "./src/models/CallNotesModel.ts");
const CallNotesWithDispositionModel_1 = __webpack_require__(/*! @/models/CallNotesWithDispositionModel */ "./src/models/CallNotesWithDispositionModel.ts");
const CallScriptModel_1 = __webpack_require__(/*! @/models/CallScriptModel */ "./src/models/CallScriptModel.ts");
const CampaignAgentActivityModel_1 = __webpack_require__(/*! @/models/CampaignAgentActivityModel */ "./src/models/CampaignAgentActivityModel.ts");
const CampaignAnalyticsModel_1 = __webpack_require__(/*! @/models/CampaignAnalyticsModel */ "./src/models/CampaignAnalyticsModel.ts");
const CampaignCallLogModel_1 = __webpack_require__(/*! @/models/CampaignCallLogModel */ "./src/models/CampaignCallLogModel.ts");
const CampaignEventLogModel_1 = __webpack_require__(/*! @/models/CampaignEventLogModel */ "./src/models/CampaignEventLogModel.ts");
const CampaignMemberAnalyticsModel_1 = __webpack_require__(/*! @/models/CampaignMemberAnalyticsModel */ "./src/models/CampaignMemberAnalyticsModel.ts");
const CampaignModel_1 = __webpack_require__(/*! @/models/CampaignModel */ "./src/models/CampaignModel.ts");
const CampaignNumberModel_1 = __webpack_require__(/*! @/models/CampaignNumberModel */ "./src/models/CampaignNumberModel.ts");
const CampaignTemplateModel_1 = __webpack_require__(/*! @/models/CampaignTemplateModel */ "./src/models/CampaignTemplateModel.ts");
const CompaniesModel_1 = __webpack_require__(/*! @/models/CompaniesModel */ "./src/models/CompaniesModel.ts");
const ContactGroupModel_1 = __webpack_require__(/*! @/models/ContactGroupModel */ "./src/models/ContactGroupModel.ts");
const ContactModel_1 = __webpack_require__(/*! @/models/ContactModel */ "./src/models/ContactModel.ts");
const DispositionModel_1 = __webpack_require__(/*! @/models/DispositionModel */ "./src/models/DispositionModel.ts");
const DncNumberModel_1 = __webpack_require__(/*! @/models/DncNumberModel */ "./src/models/DncNumberModel.ts");
const EventTaskModel_1 = __webpack_require__(/*! @/models/EventTaskModel */ "./src/models/EventTaskModel.ts");
const GroupModel_1 = __webpack_require__(/*! @/models/GroupModel */ "./src/models/GroupModel.ts");
const LeadModel_1 = __webpack_require__(/*! @/models/LeadModel */ "./src/models/LeadModel.ts");
const LiveCallModel_1 = __webpack_require__(/*! @/models/LiveCallModel */ "./src/models/LiveCallModel.ts");
const MemberCallAnalyticsModel_1 = __webpack_require__(/*! @/models/MemberCallAnalyticsModel */ "./src/models/MemberCallAnalyticsModel.ts");
const QueueAgentModel_1 = __webpack_require__(/*! @/models/QueueAgentModel */ "./src/models/QueueAgentModel.ts");
const QueueMemberModel_1 = __webpack_require__(/*! @/models/QueueMemberModel */ "./src/models/QueueMemberModel.ts");
const QueueModel_1 = __webpack_require__(/*! @/models/QueueModel */ "./src/models/QueueModel.ts");
const QueueTemplateModel_1 = __webpack_require__(/*! @/models/QueueTemplateModel */ "./src/models/QueueTemplateModel.ts");
const QueueTierModel_1 = __webpack_require__(/*! @/models/QueueTierModel */ "./src/models/QueueTierModel.ts");
const UserSessionModel_1 = __webpack_require__(/*! @/models/UserSessionModel */ "./src/models/UserSessionModel.ts");
const loadTenantModels = (conn) => {
    if (conn.models.Contact)
        return; // already loaded
    // IMPORT ALL TENANT SCHEMAS
    (conn.model("Lead", LeadModel_1.LeadSchema),
        conn.model("call_script", CallScriptModel_1.CallScriptSchema),
        conn.model("Disposition", DispositionModel_1.DispositionSchema));
    conn.model("group", GroupModel_1.GroupSchema);
    conn.model("campaign_number", CampaignNumberModel_1.CampaignNumberSchema);
    conn.model("campaign_call_logs", CampaignCallLogModel_1.CampaignCallLogSchema);
    conn.model("call_note", CallNotesModel_1.callNoteSchema);
    conn.model("dnc_number", DncNumberModel_1.DncNumberSchema);
    conn.model("contact", ContactModel_1.contactSchema);
    conn.model("call_notes_with_disposition", CallNotesWithDispositionModel_1.CallNotesWithDispositionSchema);
    conn.model("contact_group", ContactGroupModel_1.contactGroupSchema);
    console.log(`Tenant models loaded for DB: ${conn.name}`);
};
exports.loadTenantModels = loadTenantModels;
const loadMainModels = (conn) => {
    // if (conn.models.Contact) return; // already loaded
    // IMPORT ALL MAIN SCHEMAS
    conn.model("Company", CompaniesModel_1.CompanySchema);
    conn.model("campaign", CampaignModel_1.CampaignSchema);
    conn.model("campaign_template", CampaignTemplateModel_1.CampaignTemplateSchema);
    conn.model("dnc_number", DncNumberModel_1.DncNumberSchema);
    conn.model("user_session", UserSessionModel_1.UserSessionSchema);
    conn.model("campaign_analytics", CampaignAnalyticsModel_1.CampaignAnalyticsSchema);
    conn.model("campaign_member_analytics", CampaignMemberAnalyticsModel_1.CampaignMemberAnalyticsSchema);
    conn.model("campaign_agent_activity", CampaignAgentActivityModel_1.CampaignAgentActivitySchema);
    conn.model("member_call_analytics", MemberCallAnalyticsModel_1.MemberCallAnalyticsSchema);
    conn.model("LiveCall", LiveCallModel_1.LiveCallSchema);
    conn.model("campaign_event_logs", CampaignEventLogModel_1.CampaignEventLogSchema);
    conn.model("event_tasks", EventTaskModel_1.EventTaskSchema);
    conn.model("queues", QueueModel_1.QueueSchema);
    conn.model("queue_templates", QueueTemplateModel_1.QueueTemplateSchema);
    conn.model("Agent", QueueAgentModel_1.QueueAgentSchema);
    conn.model("Member", QueueMemberModel_1.QueueMemberSchema);
    conn.model("Tier", QueueTierModel_1.QueueTierSchema);
    console.log(`📦 Main models loaded for DB: ${conn.name}`);
};
exports.loadMainModels = loadMainModels;


//# sourceURL=webpack://campaign-api/./src/config/ModelLoader.ts?
}