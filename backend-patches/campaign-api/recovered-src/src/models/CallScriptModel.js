{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallScriptSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.CallScriptSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        required: false,
    },
    siteId: {
        type: String,
        default: null,
    },
    client_uuid: {
        type: String,
        default: null,
    },
    createdById: {
        type: String,
        required: false,
    },
    createdByName: {
        type: String,
        default: null,
    },
    updatedById: {
        type: String,
        default: null,
    },
    updatedByName: {
        type: String,
        default: null,
    },
    name: {
        type: String,
        default: null,
    },
    script: {
        type: Object,
        default: null,
    },
    dialMethod: {
        type: String,
        enum: ['PREDICTIVE', 'PROGRESSIVE', 'PREVIEW', 'QUEUE', 'CLIENT'],
        default: 'PREVIEW',
    },
}, {
    timestamps: true,
});
exports.CallScriptSchema.index({ company_uuid: 1 });
exports.CallScriptSchema.index({ name: 1 });


//# sourceURL=webpack://campaign-api/./src/models/CallScriptModel.ts?
}