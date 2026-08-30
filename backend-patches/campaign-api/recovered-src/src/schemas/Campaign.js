{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contactActivityNoteSave = exports.retryCallLogListValidation = exports.activeCampaignListValidation = exports.validateAssignedLeadValidation = exports.memberCampaignLeadListValidation = exports.memberCampaignListValidation = exports.randomLeadValidation = exports.changeStateValidation = exports.campaignDetailByIdValidation = exports.deleteCampaignValidation = exports.upsertCampaignValidation = exports.campaignGlobalSearchValidation = exports.campaignListValidation = exports.paginationSchema = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
const allowedFields = ['campaignType', 'campaign_uuid', 'disposition_uuid', 'dialMethod', 'campaignStatus', 'totalCall', 'DialedCall', 'PendingCall', 'connected', 'DialedButNotAnswered', 'dnc', 'createdById', 'createdByName'];
const strictFilters = joi_1.default.array().items(joi_1.default.object({
    key: joi_1.default.string().valid(...allowedFields).required(),
    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number(), joi_1.default.boolean()).required()
}));
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(25),
    search: joi_1.default.string().allow('').trim().optional(),
    dialMethod: joi_1.default.string().allow('').trim().optional(),
    sort: joi_1.default.object({
        key: joi_1.default.string().required(),
        desc: joi_1.default.boolean().required()
    }).optional(),
    // Strict filters validation
    filters: strictFilters,
    filter_date: joi_1.default.object({
        from: joi_1.default.string().required().messages({
            "string.base": "filter_date.from should be a valid date string",
            "any.required": "filter_date.from is required",
        }),
        to: joi_1.default.string().required().messages({
            "string.base": "filter_date.to should be a valid date string",
            "any.required": "filter_date.to is required",
        }),
    }).optional(),
    timezone: joi_1.default.string().optional(),
    userDetail: userDetailSchema
}).unknown(false);
exports.campaignListValidation = exports.paginationSchema.append({
// memberId: Joi.string().allow('').optional()
});
exports.campaignGlobalSearchValidation = joi_1.default.object({
    searchText: joi_1.default.string().allow('').trim().optional().default(''),
    limit: joi_1.default.number().integer().min(1).max(200).default(2),
}).unknown(false);
/* ===== Campaign upsert schema starts ===== */
const baseFields = {
    campaignId: joi_1.default.string().optional().messages({
        "string.base": "campaignId should be a type of string",
        "string.empty": "campaignId cannot be an empty field",
        "any.required": "campaignId is required",
    }),
    campaignStatus: joi_1.default.string().valid('NEW', 'PROCESSING', 'PAUSE', 'COMPLETED').optional(),
    campaignType: joi_1.default.string().valid('SMS', 'MMS', 'EMAIL', 'CALL').messages({
        'any.only': 'campaignType must be one of SMS, MMS, EMAIL, CALL',
        'string.empty': 'campaignType cannot be empty',
        'any.required': 'campaignType is required',
    }),
    name: joi_1.default.string().messages({
        'string.base': 'name should be a string',
        'string.empty': 'name cannot be empty',
        'any.required': 'name is required',
    }),
    siteId: joi_1.default.string().messages({
        'string.base': 'siteId should be a string',
        'string.empty': 'siteId cannot be empty',
        'any.required': 'siteId  is required',
    }),
    members: joi_1.default.array().items(joi_1.default.object({
        user_uuid: joi_1.default.string().required(),
        first_name: joi_1.default.string().allow(null, "").required(),
        last_name: joi_1.default.string().allow(null, "").required(),
        email: joi_1.default.string().allow(null, "").required(),
        extension: joi_1.default.string().allow(null, "").required(),
        role: joi_1.default.string().allow(null, "").required(),
        domain: joi_1.default.string().allow(null, "").required(),
    }).unknown(true))
        .default([])
        .messages({
        'array.base': 'members must be an array of member objects',
    }),
    normalizeCampaignMembers: joi_1.default.array().items(joi_1.default.object({
        user_uuid: joi_1.default.string().required(),
        first_name: joi_1.default.string().allow(null, "").required(),
        last_name: joi_1.default.string().allow(null, "").required(),
        email: joi_1.default.string().allow(null, "").required(),
        extension: joi_1.default.string().allow(null, "").required(),
        role: joi_1.default.string().allow(null, "").required(),
        domain: joi_1.default.string().allow(null, "").required(),
    }).unknown(true))
        .default([])
        .messages({
        'array.base': 'normalizeCampaignMembers must be an array of member objects',
    }),
    agentDisposition: joi_1.default.array().items(joi_1.default.object({
        _id: joi_1.default.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        disposition: joi_1.default.object({
            name: joi_1.default.string().required(),
        }).required()
    })),
    script: joi_1.default.string().allow(null, ""),
    queue: joi_1.default.string().allow(null, "").optional(),
    queue_extension: joi_1.default.string().allow(null, "").optional(),
    description: joi_1.default.string().allow(null, ""),
    contactId: joi_1.default.array().items(joi_1.default.string().messages({
        'string.base': 'Each contactId should be a string',
        'string.empty': 'contactId entries cannot be empty',
    })).messages({
        'array.base': 'contactId should be an array of strings',
    }),
    groupId: joi_1.default.array().items(joi_1.default.string().messages({
        'string.base': 'Each groupId should be a string',
        'string.empty': 'groupId entries cannot be empty',
    })).messages({
        'array.base': 'groupId should be an array of strings',
        'any.required': 'groupId is required',
    }),
    callerId: joi_1.default.array().items(joi_1.default.string().messages({
        'string.base': 'Each callerId should be a string',
        'string.empty': 'callerId entries cannot be empty',
    })).messages({
        'array.base': 'callerId should be an array of strings',
        'any.required': 'callerId is required',
    }),
    rotateCallerId: joi_1.default.boolean().messages({
        'boolean.base': 'rotateCallerId should be a boolean',
    }),
    allowSkipping: joi_1.default.boolean().messages({
        'boolean.base': 'allowSkipping should be a boolean',
    }),
    agentScripting: joi_1.default.boolean().messages({
        'boolean.base': 'agentScripting should be a boolean',
    }),
    upload_leads: joi_1.default.string().allow(null, ""),
    lead_uuid: joi_1.default.array().allow(null, ""),
    upload_voice: joi_1.default.string().allow(null, ""),
    timezone: joi_1.default.string().messages({
        'string.base': 'timezone should be a string',
        'string.empty': 'timezone cannot be empty',
    }),
    startDate: joi_1.default.date().messages({
        'date.base': 'startDate should be a valid date',
    }),
    endDate: joi_1.default.date().messages({
        'date.base': 'endDate should be a valid date',
    }),
    dialMethod: joi_1.default.string().valid('PREDICTIVE', 'PROGRESSIVE', 'PREVIEW').messages({
        'any.only': 'dialMethod must be PREDICTIVE, PROGRESSIVE or PREVIEW',
        'string.empty': 'dialMethod cannot be empty',
        'any.required': 'dialMethod is required',
    }),
    dialerSetting: joi_1.default.object({
        preview_time: joi_1.default.number().integer().min(0).default(30),
        ringing_agent_time: joi_1.default.number().integer().min(0).default(30),
        wrapup_time: joi_1.default.number().integer().min(0).default(30),
        max_ring_time: joi_1.default.number().integer().min(0).default(30),
        max_attempt_per_record: joi_1.default.number().integer().min(1).default(1),
        default_retry_period: joi_1.default.number().integer().min(1).default(3),
        default_retry_period_type: joi_1.default.string().valid('min', 'hour', 'sec').default('min'),
        agent_contact_limit: joi_1.default.number().integer().allow(null).default(null),
        answering_detection_machine: joi_1.default.object({
            enabled: joi_1.default.boolean().default(false),
            type: joi_1.default.string().valid('VOICEMAIL', 'HANGUP', 'TRANSFER').allow(''),
            value: joi_1.default.string().uuid().allow(''),
            label: joi_1.default.string().allow('')
        }),
        auto_answering: joi_1.default.object({
            enable: joi_1.default.boolean().default(false),
            enabled: joi_1.default.boolean().default(false), // Included both as per your JSON
            timeout: joi_1.default.number().integer().min(0).default(2)
        })
    }),
    settings: joi_1.default.object().min(1).messages({
        'object.base': 'settings should be an object',
        'object.min': 'settings cannot be empty',
        'any.required': 'settings is required',
    }),
    userDetail: userDetailSchema,
};
const createSchema = joi_1.default.object({
    ...baseFields,
    name: baseFields.name.required(),
    siteId: baseFields.siteId.required(),
    groupId: baseFields.groupId.required(),
    callerId: baseFields.callerId.required(),
    dialMethod: baseFields.dialMethod.required(),
    settings: baseFields.settings.required(),
});
// Define schema with all fields optional (update)
const updateSchema = joi_1.default.object({
    ...baseFields,
    campaignStatus: baseFields.campaignStatus.required(),
});
// Final schema with condition
exports.upsertCampaignValidation = joi_1.default.object()
    .custom((value, helpers) => {
    if (value.campaignId) {
        const { error } = updateSchema.validate(value);
        if (error)
            return helpers.error('any.custom', { message: error.message });
    }
    else {
        const { error } = createSchema.validate(value);
        if (error)
            return helpers.error('any.custom', { message: error.message });
    }
    return value;
})
    .messages({
    'any.custom': '{{#message}}',
});
/* ===== Campaign upsert schema ends ===== */
exports.deleteCampaignValidation = joi_1.default.object().options({
    abortEarly: false
}).keys({
    campaignId: joi_1.default.string().empty().required().messages({
        "string.base": "campaignId is a required field.",
        "string.empty": "campaignId is a required field.",
        "any.required": "campaignId is a required field."
    }),
    userDetail: userDetailSchema
});
exports.campaignDetailByIdValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    campaignId: joi_1.default.string().hex().length(24).required(),
    userDetail: userDetailSchema
}).unknown(false);
exports.changeStateValidation = joi_1.default.object().options({
    abortEarly: false
}).keys({
    campaignId: joi_1.default.string().empty().required().messages({
        "string.base": "campaignId is a required field.",
        "string.empty": "campaignId is a required field.",
        "any.required": "campaignId is a required field."
    }),
    campaignStatus: joi_1.default.string().valid('NEW', 'PROCESSING', 'PAUSE', 'COMPLETED', 'RESCHEDULED').required(),
    userDetail: userDetailSchema,
});
exports.randomLeadValidation = joi_1.default.object().options({
    abortEarly: false
}).keys({
    campaignId: joi_1.default.string().empty().required().messages({
        "string.base": "campaignId is a required field.",
        "string.empty": "campaignId is a required field.",
        "any.required": "campaignId is a required field."
    }),
    contactLimit: joi_1.default.number().integer().min(1).default(1),
    userDetail: userDetailSchema
});
exports.memberCampaignListValidation = exports.paginationSchema.append({
// memberId: Joi.string().allow('').optional()
});
exports.memberCampaignLeadListValidation = exports.paginationSchema.append({
// memberId: Joi.string().allow('').optional()
});
exports.validateAssignedLeadValidation = joi_1.default.object().options({
    abortEarly: false,
}).keys({
    campaignId: joi_1.default.string().hex().length(24).required(),
    campaignNumberId: joi_1.default.string().hex().length(24).required(),
    userDetail: userDetailSchema,
}).unknown(false);
exports.activeCampaignListValidation = exports.paginationSchema.append({
// No extra fields for now
});
const retrySipcallIdItem = joi_1.default.alternatives().try(joi_1.default.string().trim().min(1), joi_1.default.object({
    sipcallId: joi_1.default.string().trim().min(1).optional(),
    sipcallID: joi_1.default.string().trim().min(1).optional(),
}).or("sipcallId", "sipcallID"));
exports.retryCallLogListValidation = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(25),
    sort: joi_1.default.object({
        key: joi_1.default.string().required(),
        desc: joi_1.default.boolean().required()
    }).optional(),
    sipcallIds: joi_1.default.array().items(retrySipcallIdItem).min(1).required(),
    userDetail: userDetailSchema
}).unknown(false);
exports.contactActivityNoteSave = joi_1.default.object().options({ abortEarly: false }).keys({
    contact_uuid: joi_1.default.string().allow(null, ""),
    campaign_number_id: joi_1.default.string().allow(null, ""),
    campaign_detail: joi_1.default.object().allow(null, ""),
    call_id: joi_1.default.string().allow(null, ""),
    sipcall_id: joi_1.default.string().allow(null, ""),
    creator_uuid: joi_1.default.string().allow(null, ""),
    note: joi_1.default.object().allow(null, ""),
    phone: joi_1.default.string().allow(null, ""),
    disposition: joi_1.default.object().allow(null, ""),
    callback_scheduled_date: joi_1.default.string().allow(null, ""),
    userDetail: userDetailSchema
});


//# sourceURL=webpack://campaign-api/./src/schemas/Campaign.ts?
}