{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignEventLogSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CampaignEventLogSchema = new mongoose_1.Schema({
    campaignDetail: {
        type: Object,
        default: {},
    },
    userDetail: {
        type: [mongoose_1.Schema.Types.Mixed],
        default: [],
    },
}, {
    timestamps: true,
});
exports.CampaignEventLogSchema.index({ "campaignDetail.campaignId": 1 });
exports.CampaignEventLogSchema.index({ "campaignDetail.companyId": 1 });
exports.CampaignEventLogSchema.index({
    "campaignDetail.campaignId": 1,
    "userDetail.user_uuid": 1,
});


//# sourceURL=webpack://campaign-api/./src/models/CampaignEventLogModel.ts?
}