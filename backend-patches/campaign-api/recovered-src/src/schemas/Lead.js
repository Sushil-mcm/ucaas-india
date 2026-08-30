{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.leadGroupDeleteValidation = exports.leadGroupByIdValidation = exports.leadGroupGlobalSearchValidation = exports.leadGroupListValidation = exports.leadGroupUpsertValidation = exports.memberLeadListValidation = exports.leadListValidation = exports.deleteLeadValidation = exports.updateLeadValidation = exports.paginationSchema = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
const allowedFields = ['phone'];
const strictFilters = joi_1.default.array().items(joi_1.default.object({
    key: joi_1.default.string().valid(...allowedFields).required(),
    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean()).required()
}));
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(25),
    search: joi_1.default.string().allow('').trim().optional(),
    sort: joi_1.default.object({
        key: joi_1.default.string().required(),
        desc: joi_1.default.boolean().required()
    }).optional(),
    // Strict filters validation
    filters: strictFilters,
    userDetail: userDetailSchema
}).unknown(false);
exports.updateLeadValidation = joi_1.default.object().options({
    abortEarly: false
}).keys({
    leadId: joi_1.default.string().empty().required().messages({
        "string.base": "leadId is a required field.",
        "string.empty": "leadId is a required field.",
        "any.required": "leadId is a required field."
    }),
    firstName: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "First Name is required.",
        "string.empty": "First Name is required.",
        "any.required": "First Name is required."
    }),
    middleName: joi_1.default.string().trim(true).allow(null, ""),
    lastName: joi_1.default.string().trim(true).allow(null, ""),
    email: joi_1.default.string().trim(true).allow(null, ""),
    phone: joi_1.default.string().empty().required().messages({
        "string.base": "Phone is a required field.",
        "any.required": "Phone is a required field."
    }),
    importantDate: joi_1.default.string().trim(true).allow(null, ""),
    groupId: joi_1.default.array().allow(null, ""),
    company: joi_1.default.string().allow(null, ""),
    website: joi_1.default.string().allow(null, ""),
    title: joi_1.default.string().allow(null, ""),
    industry: joi_1.default.string().allow(null, ""),
    twitter: joi_1.default.string().allow(null, ""),
    facebook: joi_1.default.string().allow(null, ""),
    linkedin: joi_1.default.string().allow(null, ""),
    street: joi_1.default.string().allow(null, ""),
    city: joi_1.default.string().allow(null, ""),
    state: joi_1.default.string().allow(null, ""),
    zipcode: joi_1.default.string().allow(null, ""),
    description: joi_1.default.string().allow(null, ""),
    country: joi_1.default.object().allow(null, ""),
    userDetail: userDetailSchema
});
exports.deleteLeadValidation = joi_1.default.object().options({
    abortEarly: false
}).keys({
    leadId: joi_1.default.string().empty().required().messages({
        "string.base": "leadId is a required field.",
        "string.empty": "leadId is a required field.",
        "any.required": "leadId is a required field."
    }),
    userDetail: userDetailSchema
});
exports.leadListValidation = exports.paginationSchema.append({
    groupId: joi_1.default.string().allow('').optional()
});
exports.memberLeadListValidation = exports.paginationSchema.append({
// groupId: Joi.string().allow('').optional()
});
// Group Validation schema
exports.leadGroupUpsertValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    name: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "name is required",
        "string.empty": "name is required",
        "any.required": "name is required",
    }),
    groupId: joi_1.default.string().hex().length(24).optional(),
    userDetail: userDetailSchema
    // groupId: Joi.string().allow('').optional()
});
exports.leadGroupListValidation = exports.paginationSchema.append({});
exports.leadGroupGlobalSearchValidation = joi_1.default.object({
    searchText: joi_1.default.string().allow('').trim().optional().default(''),
    limit: joi_1.default.number().integer().min(1).max(200).default(2),
}).unknown(false);
exports.leadGroupByIdValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    groupId: joi_1.default.string().hex().length(24).required(),
    userDetail: userDetailSchema
}).unknown(false);
exports.leadGroupDeleteValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    groupId: joi_1.default.string().hex().length(24).required(),
    userDetail: userDetailSchema
}).unknown(false);


//# sourceURL=webpack://campaign-api/./src/schemas/Lead.ts?
}