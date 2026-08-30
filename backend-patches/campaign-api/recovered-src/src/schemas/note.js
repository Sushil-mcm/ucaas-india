{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.notesDispositionSaveValidation = exports.notesListValidation = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
exports.notesListValidation = joi_1.default.object({
    page: joi_1.default.number()
        .integer()
        .min(1)
        .optional(),
    limit: joi_1.default.number()
        .integer()
        .min(1)
        .max(200)
        .optional(),
    sort: joi_1.default.object({
        key: joi_1.default.string().required(),
        desc: joi_1.default.boolean().required(),
    }).optional(),
    phone: joi_1.default.string().required(),
    sipCallId: joi_1.default.string().allow(null, ""), // no use in backend for handle front end error.
    search: joi_1.default.string()
        .allow("")
        .optional(),
    filters: joi_1.default.array()
        .items(joi_1.default.object({
        key: joi_1.default.string().required(),
        value: joi_1.default.any().required(),
    }))
        .optional(),
    filter_date: joi_1.default.object({
        from: joi_1.default.string().optional(),
        to: joi_1.default.string().optional(),
    }).optional(),
    userDetail: userDetailSchema,
});
exports.notesDispositionSaveValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    contactId: joi_1.default.string().allow(null, ""),
    queueUuid: joi_1.default.string().allow(null, ""),
    client_uuid: joi_1.default.string().trim().optional().allow(null, ""),
    wrap_up_start: joi_1.default.date().optional().allow(null).messages({
        "date.base": "Wrap-up start must be a valid date.",
    }),
    wrap_up_end: joi_1.default.date().optional().allow(null).messages({
        "date.base": "Wrap-up end must be a valid date.",
    }),
    sipCallId: joi_1.default.string().allow(null, "").optional().messages({
        'any.required': 'sipcallId is required',
        'string.empty': 'sipcallId cannot be empty'
    }),
    contactName: joi_1.default.string().allow(null, ""),
    campaignNumberId: joi_1.default.string().allow(null, ""),
    contactPhone: joi_1.default.string().allow(null, "").optional().messages({
        'any.required': 'Contact Phone is required',
        'string.empty': 'Contact Phone cannot be empty'
    }),
    // contactPhone: Joi.string()
    //     .regex(/^\+?[1-9]\d{1,14}$/)
    //     .required()
    //     .messages({
    //         'string.pattern.base': 'Contact Phone must be a valid phone number (e.g. +1234567890)',
    //         'any.required': 'Contact Phone is required'
    //     }),
    contactEmail: joi_1.default.string().email().lowercase().allow(null, "").messages({
        'string.email': 'Please enter a valid email address'
    }),
    callbackScheduledDate: joi_1.default.date()
        .iso()
        .optional()
        .messages({
        "date.format": "Callback scheduled date must be in ISO format"
    }),
    source: joi_1.default.string().required(),
    wrap_time_sec: joi_1.default.number().allow(null, "").optional(),
    serviceDetail: joi_1.default.object({
        name: joi_1.default.string().allow(null, "").optional(),
        type: joi_1.default.string().allow(null, "").optional(),
        uuid: joi_1.default.string().allow(null, "").optional(),
    })
        .allow(null)
        .optional()
        .messages({
        'any.required': 'ServiceDetail is required',
        'object.base': 'ServiceDetail field must be a valid object'
    }),
    disposition: joi_1.default.object({
        _id: joi_1.default.string().required(),
        disposition: joi_1.default.string().required(),
        name: joi_1.default.string().required(),
        extension: joi_1.default.string().required(),
        uuid: joi_1.default.string().required(),
        createdAt: joi_1.default.date().iso().required()
    }),
    note: joi_1.default.object({
        note: joi_1.default.string().required().messages({
            'string.empty': 'Note text cannot be empty'
        }),
        name: joi_1.default.string().required(),
        extension: joi_1.default.string().required(),
        source: joi_1.default.string().allow(null, "").optional(),
        user_uuid: joi_1.default.string().required(),
        createdAt: joi_1.default.date().iso().required()
            .optional()
            .messages({
            'object.base': 'Disposition must be a valid object'
        }),
    })
        .optional()
        .messages({
        'any.required': 'The note is required',
        'object.base': 'The note field must be a valid object'
    }),
    userDetail: userDetailSchema
}).options({ abortEarly: false });


//# sourceURL=webpack://campaign-api/./src/schemas/note.ts?
}