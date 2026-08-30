{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserSessionSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.UserSessionSchema = new mongoose_1.Schema({
    userUuid: {
        type: String,
        default: null,
        trim: true,
    },
    userId: {
        type: String,
        default: null,
        trim: true,
    },
    companyUuid: {
        type: String,
        default: null,
        trim: true,
    },
    agencyUuid: {
        type: String,
        default: null,
        trim: true,
    },
    siteId: {
        type: String,
        default: null,
        trim: true,
    },
    fullName: {
        type: String,
        default: null,
        trim: true,
    },
    email: {
        type: String,
        default: null,
        trim: true,
    },
    domain: {
        type: String,
        default: null,
        trim: true,
    },
    extension: {
        type: String,
        default: null,
        trim: true,
    },
    onCall: {
        type: Boolean,
        default: false,
    },
    online: {
        type: Boolean,
        default: false,
    },
    webOnline: {
        type: Boolean,
        default: false,
    },
    mobileOnline: {
        type: Boolean,
        default: false,
    },
    desktopOnline: {
        type: Boolean,
        default: false,
    },
    socketId: {
        type: [String],
        default: null,
        trim: true,
    },
    lastCall: {
        type: Date,
        default: null,
    },
    lastSeen: {
        type: Date,
        default: null,
    },
    callId: {
        type: String,
        default: null,
        trim: true,
    },
    sipCallId: {
        type: String,
        default: null,
        trim: true,
    },
    deviceType: {
        type: String,
        default: null,
        trim: true,
    },
    callMetadata: {
        type: Object,
        default: null,
        trim: true,
    },
    // deviceToken: {
    //     type: String,
    //     default: null,
    //     trim: true,
    // },
    // deviceTokenVoip: {
    //     type: String,
    //     default: null,
    //     trim: true,
    // },
    // settings: {
    //     type: Schema.Types.Mixed,
    //     default: null,
    // },
    status: {
        type: String,
        enum: ["online", "holiday", "away", "busy", "dnd", "offline"],
        default: "online",
        trim: true,
    },
    timeObj: {
        type: Object,
        default: null,
        trim: true,
    },
}, {
    timestamps: true,
});
exports.UserSessionSchema.index({ companyUuid: 1, online: 1 });
exports.UserSessionSchema.index({ userUuid: 1, extension: 1 });
exports.UserSessionSchema.index({ companyUuid: 1, userUuid: 1, online: 1, status: 1 });


//# sourceURL=webpack://campaign-api/./src/models/UserSessionModel.ts?
}