{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.QueueSchema = new mongoose_1.Schema({
    // company_uuid: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Company",
    //     default: null
    // },
    // user_uuid: {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    //     default: null,
    // },
    company_uuid: {
        type: String,
        default: null
    },
    user_uuid: {
        type: String,
        default: null,
    },
    site_uuid: {
        type: Object,
        default: null
    },
    campaign_uuid: {
        type: String,
        default: null
    },
    name: {
        type: String,
        required: true
    },
    extension: {
        type: String,
        required: true
    },
    manager: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    members: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    domain: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['CAMPAIGN', 'QUEUE'],
        default: 'QUEUE'
    },
    script_type: {
        type: String,
        enum: ['text', 'library'],
        default: 'text'
    },
    script: {
        type: String,
        default: null
    },
    script_data: {
        type: String,
        default: null
    },
    agentDisposition: {
        type: [Object],
        default: null,
    },
    systemDisposition: {
        type: [Object],
        default: null,
    },
    description: {
        type: String,
        default: null
    },
    settings: {
        type: Object,
        default: {},
    },
    // Booleans (MySQL tinyint 0/1)
    auto_answer: {
        type: Boolean,
        default: false
    },
    call_recording: {
        type: Boolean,
        default: false
    },
    config_applied: {
        type: Boolean,
        default: false
    },
    // Numbers
    max_wait_time: {
        type: Number,
        default: 0
    },
    wrap_seconds: {
        type: Number,
        default: 0
    },
    moh_sound: {
        type: String,
        default: '$${hold_music}'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
exports.QueueSchema.index({
    user_uuid: 1,
    company_uuid: 1,
    extension: 1
});
exports.QueueSchema.index({
    company_uuid: 1,
    name: 1
});
exports.QueueSchema.index({
    company_uuid: 1,
    extension: 1
});


//# sourceURL=webpack://campaign-api/./src/models/QueueModel.ts?
}