{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallNotesWithDispositionSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const NoteEntrySchema = new mongoose_1.Schema({
    note: { type: String, required: true },
    name: { type: String, required: true },
    extension: { type: String, required: true },
    user_uuid: { type: String, required: true },
    source: {
        type: String,
        required: true,
        enum: ['CALL', 'LEAD', 'CONTACT', 'QUEUE'], // Restricts values to these four
        uppercase: true,
        trim: true
    },
    createdAt: { type: Date, default: Date.now }
});
const AgentDispositionSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    disposition: { type: String, required: true },
    fullName: { type: String, required: true },
    extension: { type: String, required: true },
    user_uuid: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.CallNotesWithDispositionSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        default: null
    },
    siteId: {
        type: String,
        default: null,
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        default: null,
        index: true
    },
    sipCallId: {
        type: String,
        default: null,
        index: true
    },
    campaignNumberId: {
        type: mongoose_1.Schema.Types.ObjectId,
        default: null,
    },
    queueUuid: {
        type: mongoose_1.Schema.Types.ObjectId,
        default: null
    },
    callbackScheduledDate: {
        type: Date,
        default: null
    },
    source: {
        type: String,
        enum: ['CALL', 'LEAD', 'CONTACT', 'QUEUE'],
        default: 'CALL',
    },
    serviceDetail: {
        type: Object,
        default: {},
    },
    contactName: { type: String, default: null },
    contactPhone: { type: String, default: null },
    contactEmail: { type: String, default: null },
    notes: {
        type: [NoteEntrySchema],
        default: [],
    },
    disposition: {
        type: AgentDispositionSchema,
        default: null,
    },
    client_uuid: {
        type: String,
        default: null
    },
    wrap_up_start_time: {
        type: Date,
        default: null
    },
    wrap_up_end_time: {
        type: Date,
        default: null
    },
}, {
    timestamps: true,
    strict: false,
});


//# sourceURL=webpack://campaign-api/./src/models/CallNotesWithDispositionModel.ts?
}