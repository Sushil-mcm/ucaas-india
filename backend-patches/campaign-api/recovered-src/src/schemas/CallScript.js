{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.callScriptByIdValidation = exports.CallScriptPaginationSchema = exports.callScriptUuidValidation = exports.addCallScriptValidation = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
const dialMethodFilterValues = ['PREDICTIVE', 'PROGRESSIVE', 'PREVIEW', 'QUEUE'];
exports.addCallScriptValidation = joi_1.default.object({
    name: joi_1.default.string().empty().required().trim(true).messages({
        "string.base": "Name is required",
        "string.empty": "Name is required",
        "any.required": "Name is required",
    }),
    script: joi_1.default.array()
        .items(joi_1.default.object().required())
        .min(1)
        .required()
        .messages({
        "array.base": "Call Script data format is invalid",
        "array.min": "Call Script content cannot be empty",
        "any.required": "Call Script content is required",
    }),
    dialMethod: joi_1.default.string()
        .valid('PREDICTIVE', 'PROGRESSIVE', 'PREVIEW', 'QUEUE', 'CLIENT')
        .required()
        .messages({
        'any.only': 'dialMethod must be PREVIEW, PROGRESSIVE ,PREDICTIVE or CLIENT',
        'any.required': 'dialMethod is required',
    }),
    uuid: joi_1.default.string().allow(null, ""),
    client_uuid: joi_1.default.string().trim().optional().allow(null, ""),
    userDetail: userDetailSchema
});
exports.callScriptUuidValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    uuid: joi_1.default.string().empty().required().trim(true).messages({
        'string.base': 'Call Script uuid is required.',
        "string.empty": 'Call Script uuid is required',
        "any.required": 'Call Script uuid is required',
    }),
    userDetail: userDetailSchema
});
const allowedFields = ['name', 'dialMethod'];
const strictFilters = joi_1.default.array().items(joi_1.default.object({
    key: joi_1.default.string().valid(...allowedFields).required(),
    value: joi_1.default.when('key', {
        is: 'dialMethod',
        then: joi_1.default.alternatives().try(joi_1.default.string().valid(...dialMethodFilterValues), joi_1.default.array().items(joi_1.default.string().valid(...dialMethodFilterValues)).min(1)).required(),
        otherwise: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean()).required()
    })
}));
exports.CallScriptPaginationSchema = joi_1.default.object({
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
exports.callScriptByIdValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    scriptId: joi_1.default.string().hex().length(24).required(),
    userDetail: userDetailSchema
}).unknown(false);


//# sourceURL=webpack://campaign-api/./src/schemas/CallScript.ts?
}