{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GroupSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const GroupAuditUserSchema = new mongoose_1.Schema({
    user_uuid: {
        type: String,
        default: null,
    },
    company_uuid: {
        type: String,
        default: null,
    },
    name: {
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
exports.GroupSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    company_uuid: {
        type: String,
        required: false,
    },
    createdById: {
        type: String,
        required: false,
    },
    createdByName: {
        type: String,
        required: false,
    },
    createdBy: {
        type: GroupAuditUserSchema,
        default: null,
    },
    updatedBy: {
        type: GroupAuditUserSchema,
        default: null,
    },
    leadCount: {
        type: Number,
        required: false,
        default: 0
    }
}, {
    timestamps: true,
});
exports.GroupSchema.index({ company_uuid: 1 });


//# sourceURL=webpack://campaign-api/./src/models/GroupModel.ts?
}