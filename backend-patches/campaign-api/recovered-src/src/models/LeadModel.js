{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LeadSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.LeadSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        default: null,
        required: false
    },
    createdById: {
        type: String,
        default: null,
        required: false
    },
    createdByName: {
        type: String,
        default: null,
        required: false
    },
    groupId: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Group',
        }],
    firstName: {
        type: String,
        default: null,
        required: true,
    },
    middleName: {
        type: String,
        default: null,
        required: false
    },
    lastName: {
        type: String,
        default: null,
        required: false
    },
    phone: {
        type: String,
        required: true
    },
    contactNumberType: {
        type: String,
        default: null
    },
    email: {
        type: String,
        required: false,
        default: null
    },
    importantDate: {
        type: String,
        default: null,
        required: false,
    },
    company: {
        type: String,
        default: null,
        required: false,
    },
    website: {
        type: String,
        default: null,
        required: false,
    },
    title: {
        type: String,
        default: null,
        required: false,
    },
    industry: {
        type: String,
        default: null,
        required: false,
    },
    twitter: {
        type: String,
        default: null,
        required: false,
    },
    facebook: {
        type: String,
        default: null,
        required: false,
    },
    linkedin: {
        type: String,
        default: null,
        required: false,
    },
    street: {
        type: String,
        default: null,
        required: false,
    },
    city: {
        type: String,
        default: null,
        required: false,
    },
    state: {
        type: String,
        default: null,
        required: false,
    },
    zipcode: {
        type: String,
        default: null,
        required: false,
    },
    description: {
        type: String,
        default: null,
        required: false,
    },
    country: {
        type: Object,
        default: null,
        required: false,
    },
    address: {
        type: Object,
        default: [],
    },
    socialMedia: {
        type: Object,
        default: null,
    },
    fetchContactWhichCrm: {
        type: String,
        default: null,
    },
    pushContactWhichCrm: {
        type: Object,
        default: null,
    },
    crmLeadInfo: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true,
});
exports.LeadSchema.index({ company_uuid: 1 });
exports.LeadSchema.index({ phone: 1 });


//# sourceURL=webpack://campaign-api/./src/models/LeadModel.ts?
}