{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MemberCallAnalyticsSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.MemberCallAnalyticsSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        required: true,
    },
    user_uuid: {
        type: String,
        required: true,
    },
    extension: {
        type: String,
        required: true,
    },
    totalCalls: {
        type: Number,
        default: 0,
    },
    selfTotalCall: {
        type: Number,
        default: 0,
    },
    selfCallTotalDuration: {
        type: Number,
        default: 0,
    },
    selfTotalAnsweredCall: {
        type: Number,
        default: 0,
    },
    totalCampaignCalls: {
        type: Number,
        default: 0,
    },
    totalCampaignCallDurations: {
        type: Number,
        default: 0,
    },
    totalCampaignAnsweredCalls: {
        type: Number,
        default: 0,
    },
    totalInboundCalls: {
        type: Number,
        default: 0,
    },
    totalInboundCallDurations: {
        type: Number,
        default: 0,
    },
    totalVoicemails: {
        type: Number,
        default: 0,
    },
    totalMissedCalls: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});
exports.MemberCallAnalyticsSchema.index({ user_uuid: 1 });
exports.MemberCallAnalyticsSchema.index({ company_uuid: 1 });
exports.MemberCallAnalyticsSchema.index({ extension: 1 });


//# sourceURL=webpack://campaign-api/./src/models/MemberCallAnalyticsModel.ts?
}