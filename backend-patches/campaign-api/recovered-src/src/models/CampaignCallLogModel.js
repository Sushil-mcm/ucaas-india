{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignCallLogSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CampaignCallLogSchema = new mongoose_1.Schema({
    domain: { type: String, required: true },
    type: { type: String, default: 'PHONE' },
    value: { type: String, default: null },
    name: { type: String, default: null },
    member: { type: String, default: null },
    phone: { type: String, default: null },
    direction: { type: String, default: null },
    didNumber: { type: String, default: null },
    didName: { type: String, default: null },
    time: { type: Date, required: true },
    status: { type: String, default: null },
    hangupCause: { type: String, default: null },
    callSkippedByAgent: { type: [Object], default: null },
    duration: { type: Number, default: 0 },
    billsec: { type: Number, default: 0 },
    isVoicemail: { type: Boolean, default: false }, // Converts 0/1 to boolean
    recordfile: { type: String, default: null },
    transcriptedFile: { type: String, default: null },
    accountcode: { type: String, default: null },
    extension: { type: String, default: null },
    sipcallID: { type: String, default: null },
    callID: { type: String, default: null },
    campaignId: { type: String, default: null },
    contactId: { type: String, default: null },
    campaignNumberId: { type: String, default: null },
    campaignType: { type: String, default: null },
    source: { type: String, default: null },
    agent: {
        type: [Object],
        default: null,
    },
}, { timestamps: true });
exports.CampaignCallLogSchema.index({ accountcode: 1 });
exports.CampaignCallLogSchema.index({ phone: 1 });
exports.CampaignCallLogSchema.index({ CampaignNumberUuid: 1 });
exports.CampaignCallLogSchema.index({ sipcallID: 1 });
exports.CampaignCallLogSchema.index({ campaignId: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CampaignCallLogModel.ts?
}