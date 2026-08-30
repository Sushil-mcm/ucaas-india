{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.seedDefaultContactGroups = exports.contactGroupSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const CONTACT_GROUP_MODEL_NAME = "contact_group";
const seededContactGroups = new Set();
const buildSlug = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const defaultContactGroups = [
    {
        groupName: "DEFAULT",
        slug: "default",
        description: "System default contact group.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: true,
        isActive: true,
        sortOrder: 1,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {},
    },
    {
        groupName: "HUBSPOT",
        slug: "hubspot",
        description: "Contacts synced from HubSpot CRM.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 2,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "HUBSPOT",
        },
    },
    {
        groupName: "ZOHO",
        slug: "zoho",
        description: "Contacts synced from Zoho CRM.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 3,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "ZOHO",
        },
    },
    {
        groupName: "PIPEDRIVE",
        slug: "pipedrive",
        description: "Contacts synced from Pipedrive CRM.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 4,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "PIPEDRIVE",
        },
    },
    {
        groupName: "SALESFORCE",
        slug: "salesforce",
        description: "Contacts synced from Salesforce CRM.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 5,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "SALESFORCE",
        },
    },
    {
        groupName: "AI",
        slug: "ai",
        description: "Contacts generated or enriched by AI.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 6,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "AI",
        },
    },
    {
        groupName: "GOOGLE",
        slug: "google",
        description: "Contacts synced from Google.",
        generatedBy: "SYSTEM",
        groupMode: "SMART",
        isDefault: false,
        isActive: true,
        sortOrder: 7,
        contactIds: [],
        contactCount: 0,
        filterCriteria: {
            source: "GOOGLE",
        },
    },
];
exports.contactGroupSchema = new mongoose_1.Schema({
    groupName: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: null,
        trim: true,
    },
    companyId: {
        type: String,
        required: true,
    },
    siteId: {
        type: String,
        default: null,
    },
    createdBy: {
        type: String,
        default: null,
    },
    updatedBy: {
        type: [String],
        default: [],
    },
    generatedBy: {
        type: String,
        enum: ["SYSTEM", "COMPANY"],
        default: "COMPANY",
    },
    groupMode: {
        type: String,
        enum: ["STATIC", "SMART"],
        default: "STATIC",
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    contactIds: {
        type: [String],
        default: [],
    },
    contactCount: {
        type: Number,
        default: 0,
    },
    filterCriteria: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
}, {
    timestamps: true,
});
exports.contactGroupSchema.pre("validate", function (next) {
    if (this.groupName && !this.slug) {
        this.slug = buildSlug(this.groupName);
    }
    if (Array.isArray(this.contactIds)) {
        this.contactCount = this.contactIds.length;
    }
    next();
});
exports.contactGroupSchema.pre("findOneAndUpdate", function (next) {
    const update = (this.getUpdate() || {});
    const updateSet = (update.$set ||= {});
    const groupName = update.groupName ?? updateSet.groupName;
    const contactIds = update.contactIds ?? updateSet.contactIds;
    if (typeof groupName === "string" && groupName.trim()) {
        updateSet.slug = buildSlug(groupName);
    }
    if (Array.isArray(contactIds)) {
        updateSet.contactCount = contactIds.length;
    }
    this.setUpdate(update);
    next();
});
exports.contactGroupSchema.index({ companyId: 1, slug: 1 }, { unique: true });
exports.contactGroupSchema.index({ companyId: 1, generatedBy: 1 });
exports.contactGroupSchema.index({ companyId: 1, isDefault: 1 });
exports.contactGroupSchema.index({ companyId: 1, isActive: 1 });
const getContactGroupModel = (conn) => {
    if (conn.models[CONTACT_GROUP_MODEL_NAME]) {
        return conn.models[CONTACT_GROUP_MODEL_NAME];
    }
    return conn.model(CONTACT_GROUP_MODEL_NAME, exports.contactGroupSchema);
};
const isDuplicateSeedError = (error) => {
    const mongoError = error;
    if (mongoError?.code === 11000) {
        return true;
    }
    return Array.isArray(mongoError?.writeErrors) &&
        mongoError.writeErrors.every((writeError) => writeError.code === 11000);
};
const seedDefaultContactGroups = async (conn, seedContext) => {
    if (!seedContext?.companyId) {
        return;
    }
    const cacheKey = `${conn.name}:${seedContext.companyId}`;
    if (seededContactGroups.has(cacheKey)) {
        return;
    }
    const ContactGroupModel = getContactGroupModel(conn);
    const operations = defaultContactGroups.map((group) => ({
        updateOne: {
            filter: {
                companyId: seedContext.companyId,
                slug: group.slug,
            },
            update: {
                $setOnInsert: {
                    ...group,
                    companyId: seedContext.companyId,
                    siteId: null,
                    createdBy: null,
                    updatedBy: [],
                },
            },
            upsert: true,
        },
    }));
    try {
        await ContactGroupModel.bulkWrite(operations, { ordered: false });
    }
    catch (error) {
        if (!isDuplicateSeedError(error)) {
            throw error;
        }
    }
    seededContactGroups.add(cacheKey);
};
exports.seedDefaultContactGroups = seedDefaultContactGroups;


//# sourceURL=webpack://campaign-api/./src/models/ContactGroupModel.ts?
}