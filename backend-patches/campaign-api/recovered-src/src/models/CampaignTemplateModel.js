{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignTemplateSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const ICampaign_1 = __webpack_require__(/*! ./interfaces/ICampaign */ "./src/models/interfaces/ICampaign.ts");
const CampaignMemberSchema = new mongoose_1.Schema({
    user_uuid: { type: String, required: true },
    company_uuid: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    username: { type: String, default: null },
    email: { type: String, default: null },
    extension: { type: String, default: null },
    role: { type: String, default: null },
    domain: { type: String, default: null },
}, { _id: false, strict: false });
exports.CampaignTemplateSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    queue: {
        type: String,
        required: false,
    },
    domain: {
        type: String,
        required: false,
        default: null,
    },
    queue_extension: {
        type: String,
        required: false,
    },
    campaignType: {
        type: String,
        enum: Object.values(ICampaign_1.campaignTypeEnum),
        default: ICampaign_1.campaignTypeEnum.CALL,
    },
    campaignStatus: {
        type: String,
        enum: Object.values(ICampaign_1.campaignStatus),
        default: ICampaign_1.campaignStatus.NEW,
    },
    company_uuid: {
        type: String,
        required: false,
    },
    siteId: {
        type: String,
        default: null,
    },
    createdById: {
        type: String,
        required: false,
    },
    createdByName: {
        type: String,
        default: null,
    },
    updatedById: {
        type: String,
        default: null,
    },
    updatedByName: {
        type: String,
        default: null,
    },
    members: {
        type: [CampaignMemberSchema],
        default: null,
    },
    contactId: {
        type: [String],
        default: [],
    },
    groupId: {
        type: [String],
        default: [],
    },
    callerId: {
        type: [String],
        default: [],
    },
    agentDisposition: {
        type: [Object],
        default: null,
    },
    systemDisposition: {
        type: [Object],
        default: null,
    },
    script: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    rotateCallerId: {
        type: Boolean,
        default: true,
    },
    allowSkipping: {
        type: Boolean,
        default: true,
    },
    agentScripting: {
        type: Boolean,
        default: true,
    },
    timezone: {
        type: String,
        default: 'America/New_York',
    },
    startDate: {
        type: Date,
        default: null,
    },
    endDate: {
        type: Date,
        default: null,
    },
    dialMethod: {
        type: String,
        enum: Object.values(ICampaign_1.campaignDialMethod),
        default: ICampaign_1.campaignDialMethod.PREDICTIVE,
    },
    dialerSetting: {
        preview_time: { type: Number, default: 30 },
        ringing_agent_time: { type: Number, default: 30 },
        wrapup_time: { type: Number, default: 30 },
        max_ring_time: { type: Number, default: 30 },
        default_retry_period: { type: Number, default: 3 },
        default_retry_period_type: { type: String, default: "min" },
        max_attempt_per_record: { type: Number, default: 3 },
        agent_contact_limit: { type: Number, default: 10 },
        answering_detection_machine: { type: Object, default: {} },
        auto_answering: { type: Object, default: { enable: false, timeout: 2 } }
    },
    settings: {
        type: Object,
        default: {},
    },
}, {
    timestamps: true,
});
exports.CampaignTemplateSchema.index({ name: "text", dialMethod: "text", campaignStatus: "text" });
exports.CampaignTemplateSchema.index({
    company_uuid: 1,
    "members.user_uuid": 1,
    created_at: -1
});
exports.CampaignTemplateSchema.index({
    createdById: 1,
    created_at: -1
});


//# sourceURL=webpack://campaign-api/./src/models/CampaignTemplateModel.ts?
}