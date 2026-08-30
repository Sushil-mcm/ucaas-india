{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CampaignNumberSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const NoteEntrySchema = new mongoose_1.Schema({
    note: { type: String, required: true },
    name: { type: String, required: true },
    extension: { type: String, required: true },
    user_uuid: { type: String, required: true },
    source: {
        type: String,
        required: true,
        enum: ['CALL', 'LEAD', 'CONTACT'], // Restricts values to these three
        uppercase: true,
        trim: true
    },
    createdAt: { type: Date, default: Date.now }
});
exports.CampaignNumberSchema = new mongoose_1.Schema({
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'campaigns',
        required: true,
    },
    campaignDetail: {
        type: Object,
        default: {},
    },
    company_uuid: {
        type: String,
        required: true,
    },
    createdById: {
        type: String,
        required: true,
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        // ref: 'lead',
        required: true
    },
    contactName: {
        type: String,
        required: true,
    },
    contactEmail: {
        type: String,
        required: false,
        default: null
    },
    contactNumber: {
        type: String,
        required: true,
    },
    didNumber: {
        type: String,
        default: null
    },
    contactNumberType: {
        type: String,
        default: null,
    },
    startExecutionDate: {
        type: Date,
        required: false,
        default: Date.now
    },
    requestStatus: {
        type: String,
        enum: [
            'SCHEDULED',
            'IN_PROCESS',
            'PAUSED',
            'CANCELLED',
            'INSUFFICIENT_CREDIT',
            'ERROR',
            'COMPLETED',
            'ATTEMPT_LIMIT_EXHAUSTED',
            'CALLBACK_SCHEDULED'
        ],
        required: false,
        default: 'SCHEDULED'
    },
    assignedTo: {
        type: String,
        default: null,
    },
    reservedTo: {
        type: String,
        default: null,
    },
    reservedAt: {
        type: Date,
        default: null,
    },
    reservationExpiresAt: {
        type: Date,
        default: null,
    },
    // leadStatus: {
    //     type: String,
    //     enum: Object.values(statusEnum),
    //     required: true,
    //     default: statusEnum.PENDING,
    // },
    billSec: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    callEndTime: {
        type: Date,
        default: null,
    },
    sipcallDetail: {
        type: [Object],
        default: null,
    },
    disposition: {
        type: Object,
        default: {
            name: null,
            extension: null,
            uuid: null,
            disposition: "No Disposition",
            createdAt: null,
        }
    },
    notes: {
        type: [NoteEntrySchema],
        default: [],
    },
    isVoicemail: { type: Boolean, default: false }, // Converts 0/1 to boolean
    recordfile: { type: String, default: null },
    transcriptedFile: { type: String, default: null },
    systemDisposition: {
        type: String,
        default: null
    },
    hangupCause: {
        type: String,
        default: null
    },
    agentActivity: {
        type: [Object],
        default: null,
    },
    callDeclinedByAgent: {
        type: [Object],
        default: null,
    },
    remainingCallAttempts: {
        type: Number,
        default: 1
    },
    totalCallAttempts: {
        type: Number,
        default: 0
    },
    isDnc: {
        type: Boolean,
        default: false,
    },
    errorResponse: {
        type: String,
        default: null,
    },
    cost: {
        type: String,
        default: '0.00'
    },
}, {
    timestamps: true,
});
exports.CampaignNumberSchema.index({ company_uuid: 1 });
exports.CampaignNumberSchema.index({ campaignId: 1, reservedTo: 1, reservationExpiresAt: 1 });
exports.CampaignNumberSchema.index({
    campaignId: 1,
    company_uuid: 1,
    assignedTo: 1,
    requestStatus: 1,
    isDnc: 1,
    startExecutionDate: 1,
});
exports.CampaignNumberSchema.index({
    campaignId: 1,
    company_uuid: 1,
    reservedTo: 1,
    reservationExpiresAt: 1,
    isDnc: 1,
});
exports.CampaignNumberSchema.index({
    campaignId: 1,
    company_uuid: 1,
    requestStatus: 1,
    isDnc: 1,
    startExecutionDate: 1,
});
exports.CampaignNumberSchema.index({
    company_uuid: 1,
    contactNumber: 1,
});


//# sourceURL=webpack://campaign-api/./src/models/CampaignNumberModel.ts?
}