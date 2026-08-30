{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignAgentActivitySchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CampaignAgentActivitySchema = new mongoose_1.Schema({
    userDetail: {
        type: Object,
        default: {},
    },
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'campaigns',
        required: true,
    },
    campaignNumberId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'campaign_numbers',
        required: true,
    },
    companyId: {
        type: String,
        default: null,
    },
    siteId: {
        type: String,
        default: null,
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true
    },
    contactName: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        required: true,
    },
    contactEmail: {
        type: String,
        required: false,
        default: null
    },
    didNumber: {
        type: String,
        default: null,
    },
    skippingContact: {
        type: Boolean,
        default: false,
    },
    doNothing: {
        type: Boolean,
        default: false,
    },
    callDate: {
        type: Date,
        default: null
    },
    callDuration: {
        type: Number,
        default: 0
    },
    callStatus: {
        type: String,
        default: null,
    },
    isDisposition: {
        type: Boolean,
        default: false,
    },
    disposition: {
        type: Object,
        default: null
    },
    isCallSchedule: {
        type: Boolean,
        default: false,
    },
    callScheduleDate: {
        type: Date,
        default: null
    },
    isCallRetry: {
        type: Boolean,
        default: false,
    },
    callRetryDate: {
        type: Date,
        default: null
    },
    sipCallId: {
        type: String,
        default: null
    },
}, {
    timestamps: true,
});
exports.CampaignAgentActivitySchema.index({ campaignId: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CampaignAgentActivityModel.ts?
}