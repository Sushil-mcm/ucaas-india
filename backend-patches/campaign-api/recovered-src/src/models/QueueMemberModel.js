{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueMemberSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.QueueMemberSchema = new mongoose_1.Schema({
    queue: {
        type: String,
        required: true,
        index: true
    },
    instance_id: {
        type: String,
        default: 'single_box'
    },
    uuid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    session_uuid: {
        type: String,
        index: true
    },
    cid_number: {
        type: String,
        required: true,
        trim: true,
        set: (v) => {
            if (!v)
                return v;
            const digits = v.replace(/\D/g, ''); // Extract only digits
            return `+${digits}`; // Store as +123456789
        }
    },
    cid_name: {
        type: String,
        default: null
    },
    system_epoch: {
        type: Number,
        default: 0
    },
    joined_epoch: {
        type: Number,
        default: 0
    },
    rejoined_epoch: {
        type: Number,
        default: 0
    },
    bridge_epoch: {
        type: Number,
        default: 0
    },
    abandoned_epoch: {
        type: Number,
        default: 0
    },
    // Scoring
    base_score: {
        type: Number,
        default: 0
    },
    skill_score: {
        type: Number,
        default: 0
    },
    serving_agent: {
        type: String,
        default: null,
        index: true
    },
    serving_system: {
        type: String,
        default: null
    },
    state: {
        type: String,
        index: true // States like 'Waiting', 'Answered', 'Abandoned'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
exports.QueueMemberSchema.index({
    queue: 1,
    state: 1
});


//# sourceURL=webpack://campaign-api/./src/models/QueueMemberModel.ts?
}