{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueTierSchema = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
exports.QueueTierSchema = new mongoose_1.Schema({
    queue: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    agent: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    state: {
        type: String,
        default: 'Ready',
        trim: true
    },
    level: {
        type: Number,
        default: 1
    },
    position: {
        type: Number,
        default: 1
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// This matches the logic of a primary key or unique constraint in SQL.
exports.QueueTierSchema.index({
    queue: 1,
    agent: 1
});
exports.QueueTierSchema.index({
    queue: 1,
    level: 1,
    position: 1
});


//# sourceURL=webpack://campaign-api/./src/models/QueueTierModel.ts?
}