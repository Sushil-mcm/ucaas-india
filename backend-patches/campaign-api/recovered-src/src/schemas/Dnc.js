{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.syncFtcDncValidation = exports.verifyDncValidation = exports.removeDncValidation = exports.dncListValidation = exports.addNumberToDncValidation = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
const allowedFilterKeys = ["country"];
const dncFilterSchema = joi_1.default.array().items(joi_1.default.object({
    key: joi_1.default.string().valid(...allowedFilterKeys).required(),
    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean(), joi_1.default.object({
        label: joi_1.default.string().allow("", null).optional(),
        value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number()).required(),
        prefix: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number()).optional(),
        countryPrefix: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number()).optional(),
    }).unknown(true)).required(),
}));
exports.addNumberToDncValidation = joi_1.default.object({
    name: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "name is required",
        "string.empty": "name is required",
        "any.required": "name is required",
    }),
    phone: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "phone is required",
        "string.empty": "phone is required",
        "any.required": "phone is required",
    }),
    email: joi_1.default.string().optional().messages({
        "string.base": "email should be a type of string",
        "string.empty": "email cannot be an empty field",
        "any.required": "email is required",
    }),
    source: joi_1.default.string()
        .valid("CALL", "SMS", "CAMPAIGN", "ALL")
        .optional()
        .messages({
        "string.base": "Source should be a string",
        "string.empty": "Source cannot be empty",
        "any.only": "Source must be one of CALL, SMS, CAMPAIGN, or ALL"
    }),
    userDetail: userDetailSchema,
});
exports.dncListValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    page: joi_1.default.number().integer().min(1).optional().messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be greater than or equal to 1',
    }),
    limit: joi_1.default.number().integer().min(1).max(1000).optional().messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be greater than or equal to 1',
        'number.max': 'Limit cannot be more than 1000',
    }),
    sort: joi_1.default.object({
        key: joi_1.default.string().valid('createdAt', 'updatedAt').optional().messages({
            'string.base': 'Sort key must be a string',
            'string.empty': 'Sort key is required',
            'string.valid': 'Sort key must be "created_at" or "updated_at"',
        }),
        desc: joi_1.default.boolean().optional().messages({
            'boolean.base': 'Sort descending (desc) must be a boolean',
        })
    }).optional().messages({
        'object.base': 'Sort must be an object',
    }),
    filters: joi_1.default.alternatives().try(dncFilterSchema, joi_1.default.valid(null, "")),
    filter_date: joi_1.default.object({
        from: joi_1.default.string().optional(),
        to: joi_1.default.string().optional(),
    }).optional(),
    search: joi_1.default.string().allow("").optional().messages({
        "string.base": "search should be a type of string",
        "any.required": "search is required",
    }),
    userDetail: userDetailSchema,
});
exports.removeDncValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    dncId: joi_1.default.string().empty().required().messages({
        'string.base': 'dncId is a required field',
        "string.empty": "dncId is a required field",
        'any.required': 'dncId is a required field',
    }),
    userDetail: userDetailSchema,
});
exports.verifyDncValidation = joi_1.default.object({
    phone: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "phone is required",
        "string.empty": "phone is required",
        "any.required": "phone is required",
    }),
});
exports.syncFtcDncValidation = joi_1.default.object({
    createdDateFrom: joi_1.default.string().trim().required().messages({
        "string.base": "createdDateFrom is required",
        "string.empty": "createdDateFrom is required",
        "any.required": "createdDateFrom is required",
    }),
    createdDateTo: joi_1.default.string().trim().required().messages({
        "string.base": "createdDateTo is required",
        "string.empty": "createdDateTo is required",
        "any.required": "createdDateTo is required",
    }),
});


//# sourceURL=webpack://campaign-api/./src/schemas/Dnc.ts?
}