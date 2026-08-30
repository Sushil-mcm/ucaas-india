{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.agentStatusValidation = exports.publicQueueInfoValidation = exports.queueUuIdValidation = exports.createQueueValidation = void 0;
const joi_1 = __importDefault(__webpack_require__(/*! joi */ "joi"));
const userDetailSchema = joi_1.default.object().unknown(true).optional();
// Schema for each day of the week
const dayScheduleSchema = joi_1.default.object({
    open: joi_1.default.boolean().required(),
    start: joi_1.default.string().allow(""),
    end: joi_1.default.string().allow(""),
    is_checked: joi_1.default.boolean().default(false)
});
// Schema for actions (closed hours and holidays)
const actionSchema = joi_1.default.object({
    type: joi_1.default.string().allow("").required(),
    label: joi_1.default.string().allow("").required(),
    value: joi_1.default.string().allow("").required(),
    enabled: joi_1.default.boolean().required(),
    personal: joi_1.default.boolean().required(),
    type_label: joi_1.default.string().allow(""),
    value_label: joi_1.default.string().allow("")
});
// Schema for common label/value objects (timezone, country, etc.)
const labelValueSchema = joi_1.default.object({
    label: joi_1.default.string().required().messages({
        "any.required": "Incoming label is required",
        "string.empty": "Incoming label cannot be empty"
    }),
    value: joi_1.default.boolean().required().messages({
        "any.required": "Incoming value is required",
        "string.empty": "Incoming value cannot be empty"
    }),
});
const timezone_code_label_value_schema = joi_1.default.object({
    label: joi_1.default.string().required().messages({
        "any.required": "Timezone label is required",
        "string.empty": "Timezone label cannot be empty"
    }),
    value: joi_1.default.string().required().messages({
        "any.required": "Timezone value is required",
        "string.empty": "Timezone value cannot be empty"
    }),
});
const country_code_label_value_schema = joi_1.default.object({
    label: joi_1.default.string().required().messages({
        "any.required": "Country code label is required",
        "string.empty": "Country code label cannot be empty"
    }),
    value: joi_1.default.string().required().messages({
        "any.required": "Country code value is required",
        "string.empty": "Country code value cannot be empty"
    }),
});
const country_label_value_schema = joi_1.default.object({
    label: joi_1.default.string().required().messages({
        "any.required": "Country label is required",
        "string.empty": "Country label cannot be empty"
    }),
    value: joi_1.default.string().required().messages({
        "any.required": "Country value is required",
        "string.empty": "Country value cannot be empty"
    }),
});
//Setting Json
const settingsSchema = joi_1.default.object({
    operational_hours: joi_1.default.object({
        type: joi_1.default.string().required(),
        value: joi_1.default.object({
            monday: dayScheduleSchema.required(),
            tuesday: dayScheduleSchema.required(),
            wednesday: dayScheduleSchema.required(),
            thursday: dayScheduleSchema.required(),
            friday: dayScheduleSchema.required(),
            saturday: dayScheduleSchema.required(),
            sunday: dayScheduleSchema.required()
        }).required(),
        holidays: joi_1.default.array().items(joi_1.default.any()),
        regional: joi_1.default.object({
            timezone: timezone_code_label_value_schema.required(),
            time_format: joi_1.default.number().valid(12, 24).required(),
            country_code: country_code_label_value_schema.required(),
            country: country_label_value_schema.required()
        }).required(),
        closed_hour_action: actionSchema.required(),
        holidays_action: actionSchema.required()
    }).required(),
    recording: joi_1.default.object({
        on_demand: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            recording_on: joi_1.default.string().allow("").messages({ "any.required": "On demand recording on key is required" }),
            recording_Off: joi_1.default.string().allow("").messages({ "any.required": "On demand recording Off key is required" })
        }).required(),
        automatic: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Automatic label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Automatic value key is required", }),
            recording_on: joi_1.default.string().allow("").messages({ "any.required": "Automatic recording on key is required", })
        }).required()
    }).required(),
    display_number: joi_1.default.object({
        incoming: labelValueSchema.required(),
        masking: joi_1.default.object({
            type: joi_1.default.string().allow("").required().messages({ "any.required": "Masking type key is required" }),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Masking label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Masking value key is required", })
        }).required()
    }).required(),
    ai_call_monitoring: joi_1.default.boolean().allow(null, '').optional(),
    transcription: joi_1.default.boolean().allow(null, '').optional(),
    wrapup_time: joi_1.default.number().required(),
    skills: joi_1.default.array().items(joi_1.default.string()).default([]).optional(),
    // Ring Strategy Validation
    ring_strategy: joi_1.default.object({
        value: joi_1.default.string().required(),
        leave_room_if_no_agent: joi_1.default.boolean().required(),
        max_wait_time: joi_1.default.object({
            callers: joi_1.default.number().required(),
            queue_timeout: joi_1.default.number().required(),
            after_max_wait_time: joi_1.default.object({
                type: joi_1.default.string().required(),
                value: joi_1.default.string().required(),
                name: joi_1.default.string().allow('').required(), // name is required but can be empty string
                personal: joi_1.default.boolean().required()
            }).required()
        }).required()
    }).required(),
    media: joi_1.default.object({
        welcome: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media Welcome label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media Welcome value key is required", })
        }).required(),
        hold: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media Hold label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media Hold value key is required", })
        }).required(),
        waiting: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media waiting label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media waiting value key is required", })
        }).required(),
        ring_tone: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media ring tone label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media ring tone value key is required", })
        }).required(),
        no_agent_available: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media no agent available label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media no agent available value key is required", })
        }).required(),
        all_agent_busy: joi_1.default.object({
            enabled: joi_1.default.boolean().required(),
            label: joi_1.default.string().allow("").required().messages({ "any.required": "Media all agent busy label key is required" }),
            value: joi_1.default.string().allow("").required().messages({ "any.required": "Media all agent busy value key is required", })
        }).required(),
    }).required()
});
const userSchema = joi_1.default.object({
    extension: joi_1.default.string().required(),
    name: joi_1.default.string().allow("").required(),
    email: joi_1.default.string().email().required(),
    profile: joi_1.default.any().allow(null), // Allows null or any profile data
    role: joi_1.default.string().required(),
    user_uuid: joi_1.default.string().required(),
    skills: joi_1.default.array().items(joi_1.default.string()).optional(),
    timeout: joi_1.default.number().optional()
});
exports.createQueueValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    name: joi_1.default.string().empty().required().messages({
        "string.base": "Call Queue name is required.",
        "string.empty": "Call Queue name is required.",
        "any.required": "Call Queue name is required.",
    }),
    extension: joi_1.default.string().empty().required().messages({
        "string.base": "Call Queue extension is required.",
        "string.empty": "Call Queue extension is required.",
        "any.required": "Call Queue extension is required.",
    }),
    description: joi_1.default.string().allow(null, "").min(10).optional().messages({
        "string.base": "Description must be a string.",
        "string.min": "Description must be at least 10 characters long."
    }),
    site: joi_1.default.object().required().messages({
        "object.base": "Site should be of type object",
        "object.empty": "Site can not be empty",
        "any.required": "Site is required",
    }),
    settings: settingsSchema,
    agentDisposition: joi_1.default.array().items(joi_1.default.object({
        _id: joi_1.default.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        disposition: joi_1.default.object({
            name: joi_1.default.string().required(),
        }).required()
    })),
    script: joi_1.default.string().allow(null, ""),
    members: joi_1.default.array()
        .items(userSchema)
        .min(1)
        .unique('user_uuid')
        .required()
        .messages({
        "array.base": "Members must be a list/array, not a string.",
        "array.min": "At least one member must be added.",
        "any.required": "Members list is required."
    }),
    manager: userSchema.required().messages({
        "any.required": "Manager information is required."
    }),
    script_data: joi_1.default.string().optional(),
    language: joi_1.default.string().optional(),
    uuid: joi_1.default.string().optional(),
    userDetail: userDetailSchema
});
exports.queueUuIdValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    uuid: joi_1.default.string().empty().required().messages({
        "string.base": 'Call Queue uuid is required',
        'array.empty': 'Call Queue uuid is required',
        'any.required': 'Call Queue uuid is required',
    }),
    userDetail: userDetailSchema
});
exports.publicQueueInfoValidation = joi_1.default.object().options({ abortEarly: false }).keys({
    queue_uuid: joi_1.default.string().empty().required().messages({
        "string.base": 'Call Queue uuid is required',
        'array.empty': 'Call Queue uuid is required',
        'any.required': 'Call Queue uuid is required',
    }),
});
exports.agentStatusValidation = joi_1.default.object({
    queue_uuid: joi_1.default.string().messages({
        "string.base": "Call Queue uuid must be a string",
        "string.empty": "Call Queue uuid cannot be empty",
    }),
    campaign_uuid: joi_1.default.string().messages({
        "string.base": "Campaign uuid must be a string",
        "string.empty": "Campaign uuid cannot be empty",
    }),
    status: joi_1.default.string().required().messages({
        "string.base": "Status must be a string",
        "string.empty": "Status is required",
        "any.required": "Status is required",
    }),
    state: joi_1.default.string().required().messages({
        "string.base": "State must be a string",
        "string.empty": "State is required",
        "any.required": "State is required",
    }),
    userDetail: userDetailSchema,
})
    .or('queue_uuid', 'campaign_uuid')
    .options({ abortEarly: false })
    .messages({
    "object.missing": "Either Call Queue uuid or Campaign uuid is required",
});


//# sourceURL=webpack://campaign-api/./src/schemas/queue.ts?
}