{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.callNoteSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const uuid_1 = __webpack_require__(/*! uuid */ "uuid");
exports.callNoteSchema = new mongoose_1.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
        default: uuid_1.v4,
    },
    companyId: {
        type: String,
        default: null,
    },
    campaignNumberId: {
        type: String,
        default: null,
    },
    campaignDetail: {
        type: Object,
        default: [],
    },
    contactId: {
        type: String,
        default: null,
    },
    sipcallId: {
        type: String,
        default: null,
    },
    source: {
        type: String,
        enum: ["Contact", "Lead"],
        default: null,
    },
    notes: {
        type: [Object],
        default: [],
    }
}, {
    timestamps: true,
});


//# sourceURL=webpack://campaign-api/./src/models/CallNotesModel.ts?
}