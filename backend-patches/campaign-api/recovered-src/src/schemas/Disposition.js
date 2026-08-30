{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DispositionPaginationSchema = exports.dispositionUuidValidation = exports.createDispositionValidation = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
exports.createDispositionValidation = joi_1.default.object({
    disposition: joi_1.default.object({
        name: joi_1.default.string().required().trim().messages({
            "any.required": "Disposition name is required",
        }),
        // colorCode: Joi.string()
        //     .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        //     .default("#000000")
        //     .messages({
        //         "string.pattern.base": "Please provide a valid Hex color code",
        //     }),
        description: joi_1.default.string().allow(null, ""),
    }).required(),
    // Validating the top-level enum
    dispositionType: joi_1.default.string()
        .valid("SYSTEM", "AGENT")
        .required()
        .messages({
        "any.only": "Disposition Type must be either SYSTEM or AGENT",
    }),
    uuid: joi_1.default.string().allow(null, ""),
    client_uuid: joi_1.default.string().trim().optional().allow(null, ""),
    userDetail: userDetailSchema
});
exports.dispositionUuidValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    uuid: joi_1.default.string().empty().required().trim(true).messages({
        'string.base': 'Disposition uuid is required.',
        "string.empty": 'Disposition uuid is required.',
        "any.required": 'Disposition uuid is required.',
    }),
    userDetail: userDetailSchema
});
const allowedFields = ['name', 'type', 'dispositionType'];
const strictFilters = joi_1.default.array().items(joi_1.default.object({
    key: joi_1.default.string().valid(...allowedFields).required(),
    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean()).required()
}));
exports.DispositionPaginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(25),
    search: joi_1.default.string().allow('').trim().optional(),
    client_uuid: joi_1.default.string().allow('').trim().optional(),
    sort: joi_1.default.object({
        key: joi_1.default.string().required(),
        desc: joi_1.default.boolean().required()
    }).optional(),
    // Strict filters validation
    filters: strictFilters,
    userDetail: userDetailSchema
}).unknown(false);


//# sourceURL=webpack://campaign-api/./src/schemas/Disposition.ts?
}