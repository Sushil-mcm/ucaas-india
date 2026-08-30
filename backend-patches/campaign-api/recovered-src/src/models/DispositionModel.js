{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DispositionSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.DispositionSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        default: null,
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
    disposition: {
        name: { type: String, required: true },
        //colorCode: { type: String, default: "#000000" },
        description: { type: String, default: "" }
    },
    dispositionType: {
        type: String,
        enum: ["SYSTEM", "AGENT"],
        default: null,
    },
}, {
    timestamps: true,
});
exports.DispositionSchema.index({ company_uuid: 1 });


//# sourceURL=webpack://campaign-api/./src/models/DispositionModel.ts?
}