{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contactSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const contactNameSchema = new mongoose_1.Schema({
    first: {
        type: String,
        default: null,
    },
    middle: {
        type: String,
        default: null,
    },
    last: {
        type: String,
        default: null,
    },
}, {
    _id: false,
});
const contactDetailsSchema = new mongoose_1.Schema({
    email: {
        type: String,
        default: null,
    },
    phone: {
        type: String,
        default: null,
    },
}, {
    _id: false,
});
const contactProfileSchema = new mongoose_1.Schema({
    gender: {
        type: String,
        default: null,
    },
    dob: {
        type: Date,
        default: null,
    },
    title: {
        type: String,
        default: null,
    },
    company: {
        type: String,
        default: null,
    },
    webpage: String,
    contactPic: String
}, {
    _id: false,
});
const contactAddressSchema = new mongoose_1.Schema({
    street: {
        type: String,
        default: null,
    },
    city: {
        type: String,
        default: null,
    },
    state: {
        type: String,
        default: null,
    },
    zipcode: {
        type: String,
        default: null,
    },
    country: {
        type: Object,
        default: {},
    },
}, {
    _id: false,
});
const contactSocialSchema = new mongoose_1.Schema({
    twitter: {
        type: String,
        default: null,
    },
    facebook: {
        type: String,
        default: null,
    },
    linkedin: {
        type: String,
        default: null,
    },
}, {
    _id: false,
});
const contactSystemSchema = new mongoose_1.Schema({
    domain: {
        type: String,
        default: null,
    },
    extension: {
        type: String,
        default: null,
    },
}, {
    _id: false,
});
const contactMetaSchema = new mongoose_1.Schema({
    createdBy: {
        type: String,
        default: null,
    },
    updatedBy: {
        type: [String],
        default: [],
    },
    createdByName: {
        type: String,
        default: null
    }
}, {
    _id: false,
});
exports.contactSchema = new mongoose_1.Schema({
    companyId: {
        type: String,
    },
    siteId: {
        type: String,
        default: null,
    },
    deletedAt: {
        type: Date,
        default: null
    },
    name: {
        type: contactNameSchema,
        default: () => ({}),
    },
    contact: {
        type: contactDetailsSchema,
        default: () => ({}),
    },
    profile: {
        type: contactProfileSchema,
        default: () => ({}),
    },
    address: {
        type: contactAddressSchema,
        default: () => ({}),
    },
    social: {
        type: contactSocialSchema,
        default: () => ({}),
    },
    system: {
        type: contactSystemSchema,
        default: () => ({}),
    },
    meta: {
        type: contactMetaSchema,
        default: () => ({}),
    },
    groupMeta: {
        type: [mongoose_1.Schema.Types.ObjectId],
        default: null
    },
    is_vip: {
        type: Boolean,
        default: false,
    },
    is_blocked: {
        type: Boolean,
        default: false,
    },
    is_dnc: {
        type: Boolean,
        default: false,
    },
    tag: {
        type: String,
        enum: ["STANDARD", "VIP", "BLOCK", "DNC"],
        default: "STANDARD",
    },
    crm: {
        crmId: String,
        fetchContactWhichCrm: String,
        pushContactWhichCrm: mongoose_1.Schema.Types.Mixed,
        hubSpotCrmDetails: mongoose_1.Schema.Types.Mixed
    },
    mode: {
        type: String
    },
    modeUuid: {
        type: String
    },
    agencyId: {
        type: String
    },
    type: {
        type: String,
        enum: ['LEAD', 'CONTACT'],
        default: "CONTACT"
    },
}, {
    timestamps: true,
});
exports.contactSchema.index({ companyId: 1 });
exports.contactSchema.index({ siteId: 1 });
exports.contactSchema.index({ "contact.phone": 1 });
exports.contactSchema.index({ "contact.email": 1 });


//# sourceURL=webpack://campaign-api/./src/models/ContactModel.ts?
}