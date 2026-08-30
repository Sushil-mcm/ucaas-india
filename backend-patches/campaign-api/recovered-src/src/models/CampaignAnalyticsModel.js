{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignAnalyticsSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const ICampaign_1 = __webpack_require__(/*! ./interfaces/ICampaign */ "./src/models/interfaces/ICampaign.ts");
exports.CampaignAnalyticsSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        required: false,
    },
    // site_uuid: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'site',
    //     required: false,
    // },
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'campaigns',
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(ICampaign_1.campaignDialMethod),
        default: ICampaign_1.campaignDialMethod.PREDICTIVE,
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
exports.CampaignAnalyticsSchema.index({ campaignId: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CampaignAnalyticsModel.ts?
}