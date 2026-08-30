{
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallScriptRepository = void 0;
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
class CallScriptRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static getAuditDisplayName(userData) {
        const fullName = [userData?.first_name, userData?.last_name]
            .map((value) => value?.toString()?.trim())
            .filter(Boolean)
            .join(" ")
            .trim();
        return fullName || userData?.username || userData?.email || null;
    }
    static async upsert(requestData, userData) {
        try {
            if (requestData?.uuid && !mongoose_1.Types.ObjectId.isValid(requestData.uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Call Script ID is invalid.`);
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CallScriptModal = tenantDB.models.call_script;
            const auditDisplayName = this.getAuditDisplayName(userData);
            if (requestData?.uuid && requestData?.uuid !== '') {
                const Exists = await CallScriptModal.exists({ _id: requestData?.uuid });
                if (!Exists) {
                    throw new HttpException_1.HttpException(404, `Call Script ID does not exist.`);
                }
            }
            const nameExists = await CallScriptModal.findOne({ name: requestData?.name, company_uuid: { $eq: userData?.company_uuid }, ...(requestData?.client_uuid && { client_uuid: requestData.client_uuid }), _id: { $ne: requestData?.uuid } });
            if (nameExists) {
                throw new HttpException_1.HttpException(422, requestData?.client_uuid
                    ? "Call Script name is already taken for this Client."
                    : "Call Script name is already taken for this Company.");
            }
            if (requestData.uuid && mongoose_1.default.Types.ObjectId.isValid(requestData.uuid)) {
                await CallScriptModal.findOneAndUpdate({
                    _id: requestData.uuid,
                    company_uuid: userData?.company_uuid,
                    ...(requestData?.client_uuid && { client_uuid: requestData.client_uuid })
                }, {
                    $set: {
                        name: requestData?.name,
                        script: requestData?.script || null,
                        dialMethod: requestData?.dialMethod || null,
                        updatedById: userData?.user_uuid,
                        updatedByName: auditDisplayName,
                        // client_uuid: requestData.client_uuid || null,
                    },
                    $setOnInsert: {
                        company_uuid: userData?.company_uuid,
                        createdById: userData?.user_uuid,
                        createdByName: auditDisplayName,
                    }
                }, {
                    upsert: true,
                    returnDocument: "after", // return updated/inserted doc
                    runValidators: true
                });
            }
            else {
                await CallScriptModal.create({
                    company_uuid: userData?.company_uuid,
                    createdById: userData?.user_uuid,
                    createdByName: auditDisplayName,
                    updatedById: userData?.user_uuid,
                    updatedByName: auditDisplayName,
                    name: requestData?.name,
                    script: requestData?.script || null,
                    dialMethod: requestData?.dialMethod || null,
                    client_uuid: requestData.client_uuid || null,
                });
            }
            return { messages: "Call script saved successfully." };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async list(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const skip = (page - 1) * limit;
            // 1. Precise Match Stage
            const matchStage = {
                company_uuid: userData?.company_uuid,
                ...(requestData?.client_uuid && { client_uuid: requestData.client_uuid })
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { extension: { $regex: search, $options: "i" } }
                ];
            }
            const dialMethodValues = Array.from(new Set(filters
                .filter((filter) => filter?.key === "dialMethod")
                .flatMap((filter) => Array.isArray(filter.value) ? filter.value : [filter.value])
                .map((value) => value?.toString()?.trim())
                .filter(Boolean)));
            if (dialMethodValues.length === 1) {
                matchStage.dialMethod = dialMethodValues[0];
            }
            else if (dialMethodValues.length > 1) {
                matchStage.dialMethod = { $in: dialMethodValues };
            }
            // Optimized Pipeline
            const pipeline = [
                { $match: matchStage },
                {
                    $facet: {
                        rows: [
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                            // Project only necessary fields for the list to save memory
                            {
                                $project: {
                                    _id: 1,
                                    createdById: 1,
                                    createdByName: 1,
                                    updatedById: 1,
                                    updatedByName: 1,
                                    name: 1,
                                    script: 1,
                                    dialMethod: 1,
                                    createdAt: 1,
                                    updatedAt: 1,
                                }
                            }
                        ],
                        total: [{ $count: "count" }],
                    },
                },
                {
                    $project: {
                        rows: 1,
                        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                    },
                },
            ];
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CallScriptModal = tenantDB.models.call_script;
            // 3. Execution
            const [result] = await CallScriptModal.aggregate(pipeline);
            const rows = result?.rows || [];
            const total = result?.total || 0;
            return {
                rows,
                total,
                page,
                limit,
                totalPages: total > 0 ? Math.ceil(total / limit) : 0,
            };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async delete(requestData, userData) {
        try {
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (requestData?.uuid && !mongoose_1.Types.ObjectId.isValid(requestData.uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Call Script ID is invalid.`);
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CallScriptModal = tenantDB.models.call_script;
            if (requestData?.uuid && requestData?.uuid !== '') {
                const callScriptExists = await CallScriptModal.exists({ _id: requestData?.uuid });
                if (!callScriptExists) {
                    throw new HttpException_1.HttpException(404, `Call Script ID does not exist.`);
                }
            }
            const deleted = await CallScriptModal.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(requestData?.uuid)),
                company_uuid: String(userData.company_uuid)
            });
            if (!deleted) {
                throw new HttpException_1.HttpException(404, 'Call Script not found');
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
        return { messages: "Call Script deleted successfully." };
    }
    static async callScriptById(requestData, userData) {
        const { scriptId } = requestData;
        if (!scriptId || !mongoose_1.Types.ObjectId.isValid(scriptId)) {
            throw new HttpException_1.HttpException(400, 'Invalid Call Script ID');
        }
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CallScriptModal = tenantDB.models.call_script;
        const callScriptDetail = await CallScriptModal.findById(scriptId).lean();
        if (!callScriptDetail) {
            throw new HttpException_1.HttpException(404, 'Call Script does not exist');
        }
        return callScriptDetail;
    }
}
exports.CallScriptRepository = CallScriptRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/CallScriptRepository.ts?
}