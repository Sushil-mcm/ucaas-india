{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LiveCallSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.LiveCallSchema = new mongoose_1.Schema({
    call_uuid: { type: String, required: true },
    agent_extension: { type: String, default: null },
    agent_name: { type: String, default: null },
    answered_at: { type: Date, default: null },
    call_dialed: { type: Boolean, default: false },
    call_type: { type: String, required: true },
    called_number: { type: String, default: null },
    caller_number: { type: String, required: true },
    context_path: { type: [String], default: [] },
    current_context: { type: String, default: null },
    direction: { type: String, default: null },
    started_at: { type: Date, default: null },
    status: { type: String, required: true },
    at_risk: { type: Boolean, required: true },
    ai_monitoring: { type: Boolean, required: true },
    updated_at: { type: Date, default: null },
    agent_status: { type: String, default: null },
    ai_agent_status: { type: String, default: null },
    lead_captured: { type: Boolean, default: false },
    sentiment: { type: String, default: null },
    sentiment_scores: { type: mongoose_1.Schema.Types.Mixed, default: null },
    intent: { type: String, default: null },
    intent_confidence: { type: String, default: null },
    intent_provider: { type: String, default: null },
    b_leg_uuid: { type: String, default: null },
    company_uuid: { type: String, required: true },
    contact_name: { type: String, default: null },
    contact_uuid: { type: String, default: null },
    did_number: { type: String, default: null },
    domain: { type: String, default: null },
    forward_type: { type: String, default: null },
    forward_value: { type: String, default: null },
    forward_name: { type: String, default: null },
    ringing_at: { type: Date, default: null },
    bridged_at: { type: Date, default: null },
    ended_at: { type: Date, default: null },
    hangup_cause: { type: String, default: null },
    cause: { type: String, default: null },
    talk_time_sec: { type: Number, default: 0 },
    wait_time_sec: { type: Number, default: 0 },
    wrap_time_sec: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: "created_at" },
    collection: "live_calls",
});


//# sourceURL=webpack://campaign-api/./src/models/LiveCallModel.ts?
}