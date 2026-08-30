{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignMemberAnalyticsSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CampaignMemberAnalyticsSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        required: false,
    },
    // site_uuid: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'site',
    //     required: false,
    // },
    user_uuid: {
        type: String,
        required: true,
    },
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'campaigns',
        required: true,
    },
    type: {
        type: String,
        enum: ['PREDICTIVE', 'PROGRESSIVE', 'PREVIEW'],
        default: null,
    },
    assignedLeads: {
        type: Number,
        default: 0,
    },
    dialedLeads: {
        type: Number,
        default: 0,
    },
    answeredLeads: {
        type: Number,
        default: 0,
    },
    pendingLeads: {
        type: Number,
        default: 0,
    },
    totalCallRescheduled: {
        type: Number,
        default: 0,
    },
    totalCallDuration: {
        type: Number,
        default: 0,
    },
    totalCallNotAnswered: {
        type: Number,
        default: 0,
    },
    totalRetries: {
        type: Number,
        default: 0,
    },
    retriedLeads: {
        type: Number,
        default: 0,
    },
    totalDnc: {
        type: Number,
        default: 0,
    },
    dialedPercentage: {
        type: Number,
        default: 0,
    },
    answeredPercentage: {
        type: Number,
        default: 0,
    },
    pendingPercentage: {
        type: Number,
        default: 0,
    },
    rescheduledPercentage: {
        type: Number,
        default: 0,
    },
    notAnsweredPercentage: {
        type: Number,
        default: 0,
    },
    retriesPercentage: {
        type: Number,
        default: 0,
    },
    dncPercentage: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
exports.CampaignMemberAnalyticsSchema.index({ company_uuid: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CampaignMemberAnalyticsModel.ts?
}