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
exports.DispositionRepository = void 0;
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
class DispositionRepository extends BaseTenantRepository_1.BaseTenantRepository {
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
            if (!mongoose_1.Types.ObjectId.isValid(String(requestData?.uuid)) && requestData?.uuid) {
                throw new HttpException_1.HttpException(422, `The provided Disposition ID is invalid.`);
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const DispositionModal = tenantDB.models.Disposition;
            const auditDisplayName = this.getAuditDisplayName(userData);
            if (requestData?.uuid && requestData?.uuid !== '') {
                const Exists = await DispositionModal.exists({ _id: requestData?.uuid });
                if (!Exists) {
                    throw new HttpException_1.HttpException(404, `Disposition ID does not exist.`);
                }
            }
            const nameExists = await DispositionModal.findOne({ 'disposition.name': requestData?.disposition.name, company_uuid: { $eq: userData?.company_uuid }, ...(requestData?.client_uuid && { client_uuid: requestData.client_uuid }), _id: { $ne: requestData?.uuid } });
            if (nameExists) {
                throw new HttpException_1.HttpException(422, `Disposition name taken for this Company.`);
            }
            if (requestData.uuid && mongoose_1.default.Types.ObjectId.isValid(requestData.uuid)) {
                await DispositionModal.findOneAndUpdate({
                    _id: requestData.uuid,
                    company_uuid: userData?.company_uuid,
                    ...(requestData?.client_uuid && { client_uuid: requestData.client_uuid })
                }, {
                    $set: {
                        disposition: requestData?.disposition || null,
                        dispositionType: requestData?.dispositionType || null,
                        updatedById: userData?.user_uuid,
                        updatedByName: auditDisplayName,
                        //client_uuid: requestData?.client_uuid || null,
                    },
                    $setOnInsert: {
                        company_uuid: userData?.company_uuid,
                        createdById: userData?.user_uuid,
                        createdByName: auditDisplayName,
                        client_uuid: requestData?.client_uuid || null,
                    }
                }, {
                    upsert: true,
                    returnDocument: "after", // return updated/inserted doc
                    runValidators: true
                });
            }
            else {
                await DispositionModal.create({
                    company_uuid: userData?.company_uuid,
                    createdById: userData?.user_uuid,
                    createdByName: auditDisplayName,
                    updatedById: userData?.user_uuid,
                    updatedByName: auditDisplayName,
                    disposition: requestData?.disposition,
                    dispositionType: requestData?.dispositionType || null,
                    client_uuid: requestData?.client_uuid || null,
                });
            }
            return { messages: "Disposition saved successfully." };
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
    // public static async list(requestData: IPaginationQuery, userData: IUser): Promise<IPaginatedList> {
    //     try {
    //         const page = Number(requestData?.page) || 1;
    //         const limit = Number(requestData?.limit) || 25;
    //         const search = requestData?.search?.toString()?.trim() || "";
    //         const filters = Array.isArray(requestData?.filters) ? requestData.filters : [];
    //         const skip = (page - 1) * limit;
    //         // 1. Precise Match Stage
    //         // const companyScope: Record<string, any>[] = requestData?.client_uuid
    //         //     ? [
    //         //         {
    //         //             company_uuid: userData?.company_uuid,
    //         //             client_uuid: requestData.client_uuid,
    //         //         },
    //         //     ]
    //         //     : [
    //         //         {
    //         //             company_uuid: userData?.company_uuid,
    //         //         },
    //         //         {
    //         //             company_uuid: null,
    //         //         },
    //         //         {
    //         //             company_uuid: { $exists: false },
    //         //         },
    //         //     ];
    //         const companyFilter: Record<string, any> = {
    //             company_uuid: userData?.company_uuid,
    //         };
    //         if (requestData?.client_uuid) {
    //             companyFilter.client_uuid = requestData.client_uuid;
    //         }
    //         const companyScope: Record<string, any>[] = [
    //             companyFilter,
    //             { company_uuid: null },
    //             { company_uuid: { $exists: false } },
    //         ];
    //         const matchStage: Record<string, any> = {
    //             $and: [
    //                 { $or: companyScope },
    //             ],
    //         };
    //         if (search) {
    //             matchStage.$and.push({
    //                 $or: [
    //                     { "disposition.name": { $regex: search, $options: "i" } },
    //                 ],
    //             });
    //         }
    //         const dispositionTypeValues = Array.from(
    //             new Set(
    //                 filters
    //                     .filter((filter) => ["type", "dispositionType"].includes(String(filter?.key ?? "")))
    //                     .flatMap((filter) => Array.isArray(filter?.value) ? filter.value : [filter?.value])
    //                     .map((value) => String(value ?? "").trim().toUpperCase())
    //                     .filter((value) => ["SYSTEM", "AGENT"].includes(value))
    //             )
    //         );
    //         if (dispositionTypeValues.length === 1) {
    //             matchStage.$and.push({ dispositionType: dispositionTypeValues[0] });
    //         } else if (dispositionTypeValues.length > 1) {
    //             matchStage.$and.push({ dispositionType: { $in: dispositionTypeValues } });
    //         }
    //         // Optimized Pipeline
    //         const pipeline: PipelineStage[] = [
    //             { $match: matchStage },
    //             {
    //                 $facet: {
    //                     rows: [
    //                         { $sort: { createdAt: -1 } },
    //                         { $skip: skip },
    //                         { $limit: limit },
    //                         // Project only necessary fields for the list to save memory
    //                         {
    //                             $project: {
    //                                 _id: 1, dispositionType: 1, disposition: 1, company_uuid: 1, createdAt: 1
    //                             }
    //                         }
    //                     ],
    //                     total: [{ $count: "count" }],
    //                 },
    //             },
    //             {
    //                 $project: {
    //                     rows: 1,
    //                     total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
    //                 },
    //             },
    //         ];
    //         const tenantDB = await this.getTenantDBFromUser(userData);
    //         const DispositionModal = tenantDB.models.Disposition;
    //         // 3. Execution
    //         const [result] = await DispositionModal.aggregate<any>(pipeline);
    //         const rows: IDispositionList[] = result?.rows || [];
    //         const total: number = result?.total || 0;
    //         return {
    //             rows,
    //             total,
    //             page,
    //             limit,
    //             totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    //         };
    //     } catch (error: unknown) {
    //         if (error instanceof HttpException) throw error;
    //         if (error instanceof Error) {
    //             throw new HttpException(422, `${error.message}`);
    //         }
    //         throw new HttpException(500, "Internal Server Error");
    //     }
    // }
    static async list(requestData, userData) {
        try {
            const page = Math.max(Number(requestData?.page) || 1, 1);
            const limit = Math.max(Number(requestData?.limit) || 25, 1);
            const search = requestData?.search?.toString().trim() || "";
            const filters = Array.isArray(requestData?.filters)
                ? requestData.filters
                : [];
            const skip = (page - 1) * limit;
            const companyScope = [
                {
                    company_uuid: String(userData.company_uuid),
                },
                {
                    company_uuid: null,
                },
                {
                    company_uuid: { $exists: false },
                },
            ];
            const matchConditions = [
                {
                    $or: companyScope,
                },
            ];
            if (requestData?.client_uuid) {
                matchConditions.push({
                    $or: [
                        {
                            client_uuid: requestData.client_uuid,
                        },
                        {
                            client_uuid: null,
                        },
                        {
                            client_uuid: { $exists: false },
                        },
                    ],
                });
            }
            if (search) {
                matchConditions.push({
                    "disposition.name": {
                        $regex: search,
                        $options: "i",
                    },
                });
            }
            const dispositionTypeValues = Array.from(new Set(filters
                .filter((filter) => ["type", "dispositionType"].includes(String(filter?.key ?? "")))
                .flatMap((filter) => Array.isArray(filter?.value)
                ? filter.value
                : [filter?.value])
                .map((value) => String(value ?? "")
                .trim()
                .toUpperCase())
                .filter((value) => ["SYSTEM", "AGENT"].includes(value))));
            if (dispositionTypeValues.length === 1) {
                matchConditions.push({
                    dispositionType: dispositionTypeValues[0],
                });
            }
            else if (dispositionTypeValues.length > 1) {
                matchConditions.push({
                    dispositionType: {
                        $in: dispositionTypeValues,
                    },
                });
            }
            const matchStage = {
                $and: matchConditions,
            };
            const pipeline = [
                {
                    $match: matchStage,
                },
                {
                    $facet: {
                        rows: [
                            {
                                $sort: {
                                    createdAt: -1,
                                },
                            },
                            {
                                $skip: skip,
                            },
                            {
                                $limit: limit,
                            },
                            {
                                $project: {
                                    _id: 1,
                                    dispositionType: 1,
                                    disposition: 1,
                                    //company_uuid: 1,
                                    //client_uuid: 1,
                                    createdAt: 1,
                                },
                            },
                        ],
                        total: [
                            {
                                $count: "count",
                            },
                        ],
                    },
                },
                {
                    $project: {
                        rows: 1,
                        total: {
                            $ifNull: [
                                {
                                    $arrayElemAt: ["$total.count", 0],
                                },
                                0,
                            ],
                        },
                    },
                },
            ];
            const tenantDB = await this.getTenantDBFromUser(userData);
            const DispositionModel = tenantDB.models.Disposition;
            const [result] = await DispositionModel.aggregate(pipeline);
            const rows = result?.rows ?? [];
            const total = Number(result?.total ?? 0);
            return {
                rows,
                total,
                page,
                limit,
                totalPages: total > 0 ? Math.ceil(total / limit) : 0,
            };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException) {
                throw error;
            }
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, error.message);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async delete(requestData, userData) {
        try {
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(requestData?.uuid) && requestData?.uuid) {
                throw new HttpException_1.HttpException(422, `The provided Disposition ID is invalid.`);
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const DispositionModal = tenantDB.models.Disposition;
            if (requestData?.uuid && requestData?.uuid !== '') {
                const callScriptExists = await DispositionModal.exists({ _id: requestData?.uuid });
                if (!callScriptExists) {
                    throw new HttpException_1.HttpException(404, `Disposition ID does not exist.`);
                }
            }
            const deleted = await DispositionModal.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(requestData?.uuid)),
                company_uuid: String(userData.company_uuid)
            });
            if (!deleted) {
                throw new HttpException_1.HttpException(404, 'Disposition not found');
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
        return { messages: "Disposition deleted successfully." };
    }
}
exports.DispositionRepository = DispositionRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/DispositionRepository.ts?
}