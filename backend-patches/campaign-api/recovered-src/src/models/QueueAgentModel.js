{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueAgentSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.QueueAgentSchema = new mongoose_1.Schema({
    instance_id: {
        type: String,
        default: 'single_box',
        required: true
    },
    queue_uuid: {
        type: mongoose_1.Schema.Types.ObjectId,
        index: true,
        default: null
    },
    name: {
        type: String,
        trim: true
    },
    user_detail: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    type: {
        type: String,
        default: 'callback'
    },
    contact: {
        type: String,
        default: 'user/1000@default',
        set: (v) => {
            // If contact looks like a pure phone number, we prepend '+'
            if (/^\d+$/.test(v))
                return `+${v}`;
            return v;
        }
    },
    status: {
        type: String,
        default: 'On Break'
    },
    state: {
        type: String,
        default: 'Idle'
    },
    // Integer mappings
    max_no_answer: {
        type: Number,
        default: 3
    },
    wrap_up_time: {
        type: Number,
        default: 0
    },
    reject_delay_time: {
        type: Number,
        default: 0
    },
    busy_delay_time: {
        type: Number,
        default: 0
    },
    no_answer_delay_time: {
        type: Number,
        default: 0
    },
    // Timestamp integers (Unix epoch)
    last_bridge_start: {
        type: Number,
        default: 0
    },
    last_bridge_end: {
        type: Number,
        default: 0
    },
    last_offered_call: {
        type: Number,
        default: 0
    },
    last_status_change: {
        type: Number,
        default: 0
    },
    // Counters
    no_answer_count: {
        type: Number,
        default: 0
    },
    calls_answered: {
        type: Number,
        default: 0
    },
    talk_time: {
        type: Number,
        default: 0
    },
    ready_time: {
        type: Number,
        default: 0
    },
    external_calls_count: {
        type: Number,
        default: 0
    }
}, {
    // Automatically handles created_at and updated_at
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// Indexes for performance (common in call center queries)
exports.QueueAgentSchema.index({
    status: 1,
    state: 1
});


//# sourceURL=webpack://campaign-api/./src/models/QueueAgentModel.ts?
}