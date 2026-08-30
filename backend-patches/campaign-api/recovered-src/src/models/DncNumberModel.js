{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DncNumberSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.DncNumberSchema = new mongoose_1.Schema({
    company_uuid: {
        type: String,
        required: false,
        default: null,
    },
    createdById: {
        type: String,
        required: true,
    },
    // contactId: {
    //     type: Schema.Types.ObjectId,
    //     required: true
    // },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
        default: null
    },
    phone: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['SYSTEM', 'PERSONAL'],
        default: "PERSONAL",
    },
}, {
    timestamps: true,
});
exports.DncNumberSchema.index({ company_uuid: 1, phone: 1 }, { unique: true, name: "uniq_dnc_company_phone" });


//# sourceURL=webpack://campaign-api/./src/models/DncNumberModel.ts?
}