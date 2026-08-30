{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EventTaskSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.EventTaskSchema = new mongoose_1.Schema({
    companyId: {
        type: String,
        default: null,
    },
    siteId: {
        type: String,
        default: null,
    },
    createdById: {
        type: String,
        default: null,
    },
    name: {
        type: String,
        default: null,
    },
    startTime: {
        type: Date,
        default: null,
    },
    endTime: {
        type: Date,
        default: null,
    },
    timeRange: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    category: {
        type: String,
        default: null,
    },
    source: {
        type: String,
        default: null,
    },
    mode: {
        type: String,
        default: null,
    },
    callerId: {
        type: String,
        default: null,
    },
    didNumber: {
        type: String,
        default: null,
    },
    sipCallId: {
        type: String,
        default: null,
    },
    contactId: {
        type: String,
        default: null,
    },
    reminder: {
        type: Boolean,
        default: null,
    },
    assignTo: {
        type: [Object],
        default: null,
    },
    timezone: {
        type: String,
        default: null,
    },
    duration: {
        type: Number,
        default: null,
    },
    meetingId: {
        type: String,
        default: null,
    },
    reminderStatus: {
        type: String,
        default: null,
    },
    reminderMode: {
        type: [Object],
        default: null,
    },
    details: {
        type: Object,
        default: null,
    },
}, {
    timestamps: true,
    collection: "event_tasks",
});
// const EventTaskModel = mongoose.model<IEventTask>("EventTask", EventTaskSchema);
// export default EventTaskModel;


//# sourceURL=webpack://campaign-api/./src/models/EventTaskModel.ts?
}