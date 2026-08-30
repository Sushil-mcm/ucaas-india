{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CompanySchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CompanySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 100,
    },
    db_name: {
        type: String,
        required: true,
        maxlength: 60,
    },
    plan_uuid: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Plan",
        required: true,
    },
    plan_duration: {
        type: Number,
        required: true,
    },
    plan_start_date: {
        type: Date,
        default: null,
    },
    plan_expiration_date: {
        type: Date,
        default: null,
    },
    is_trial: {
        type: Boolean,
        default: false,
    },
    plan_status: {
        type: String,
        enum: ["ACTIVE", "EXPIRED", "INACTIVE"],
        default: "INACTIVE",
    },
    amount: {
        type: Number,
        default: 0,
    },
    licenses: {
        type: Number,
        default: 1,
    },
    business_info: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    call_duration: {
        type: Number,
        default: 0,
    },
    call_duration_used: {
        type: Number,
        default: 0,
    },
    toll_free_duration: {
        type: Number,
        default: 0,
    },
    toll_free_duration_used: {
        type: Number,
        default: 0,
    },
    sms: {
        type: Number,
        default: 0,
    },
    sms_used: {
        type: Number,
        default: 0,
    },
    // ⭐ BEST OPTION for an array of objects
    allow_country: {
        type: [
            {
                country_name: String,
                country_prefix: String,
                country_code_iso2: String,
                country_code_iso3: String,
            }
        ],
        default: [],
    },
    // ⭐ Correct for flexible JSON object
    plan_features: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    stripe_token: {
        type: String,
        default: null,
    },
    email_verified: {
        type: Boolean,
        default: false,
    },
    payment_verified: {
        type: Boolean,
        default: false,
    },
    free_did: {
        type: Boolean,
        default: false,
    },
    purchase_plan_detail: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    deleted_at: {
        type: Date,
        default: null,
    },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
});
// Soft delete helper (similar to Sequelize paranoid)
exports.CompanySchema.methods.softDelete = function () {
    this.deleted_at = new Date();
    return this.save();
};
// Index for better query performance
exports.CompanySchema.index({ plan_uuid: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CompaniesModel.ts?
}