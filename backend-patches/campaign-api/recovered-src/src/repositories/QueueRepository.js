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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueRepository = void 0;
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const CommonHelper_1 = __importDefault(__webpack_require__(/*! @/helpers/CommonHelper */ "./src/helpers/CommonHelper.ts"));
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
class QueueRepository {
    static async getMainQueueModels() {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        return {
            QueueModel: mainDB.models.queues,
            QueueTemplateModel: mainDB.models.queue_templates,
            QueueAgentModel: mainDB.models.Agent,
            QueueMemberModel: mainDB.models.Member,
            QueueTierModel: mainDB.models.Tier,
        };
    }
    static async templateUpsert(requestData, userData) {
        try {
            const { QueueTemplateModel } = await this.getMainQueueModels();
            if (!requestData)
                throw new HttpException_1.HttpException(422, `No data received.`);
            const { name, extension, manager, members, description, settings, agentDisposition, script } = requestData;
            const companyId = userData?.company_uuid;
            const domain = userData?.domain;
            if (requestData?.uuid && !mongoose_1.Types.ObjectId.isValid(requestData?.uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Queue Template ID is invalid.`);
            }
            const [nameDuplicate, extDuplicate] = await Promise.all([
                QueueTemplateModel.exists({
                    name,
                    company_uuid: companyId,
                    _id: {
                        $ne: requestData?.uuid
                    }
                }),
                QueueTemplateModel.exists({
                    extension,
                    company_uuid: companyId,
                    _id: {
                        $ne: requestData?.uuid
                    }
                })
            ]);
            if (nameDuplicate)
                throw new HttpException_1.HttpException(422, `Call Queue template name already exists.`);
            if (extDuplicate)
                throw new HttpException_1.HttpException(422, `Extension already taken for this Queue template.`);
            const filter = requestData?.uuid ? {
                _id: requestData.uuid,
                company_uuid: companyId
            } : {
                _id: new mongoose_1.Types.ObjectId(),
                company_uuid: companyId
            };
            const queueTemplateDetail = await QueueTemplateModel.findOneAndUpdate(filter, {
                $set: {
                    name,
                    extension,
                    manager,
                    agentDisposition,
                    members,
                    settings,
                    description,
                    script,
                    domain
                },
                $setOnInsert: {
                    company_uuid: companyId,
                    user_uuid: userData?.user_uuid
                }
            }, {
                upsert: true,
                returnDocument: "after",
                runValidators: true
            });
            if (!queueTemplateDetail)
                throw new HttpException_1.HttpException(404, "Failed to save Queue template detail.");
            return {
                messages: "Call Queue template saved successfully."
            };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            throw new HttpException_1.HttpException(422, error.message || "Internal Server Error");
        }
    }
    static async upsert(requestData, userData) {
        try {
            const { QueueModel, QueueAgentModel, QueueTierModel } = await this.getMainQueueModels();
            if (!requestData)
                throw new HttpException_1.HttpException(422, `No data received.`);
            const { name, extension, manager, description, settings, agentDisposition, script, site } = requestData;
            let { members } = requestData;
            const companyId = userData?.company_uuid;
            const domain = userData?.domain;
            // Deduplicate Members
            const uniqueMembers = Array.from(new Map(members.map((m) => [m.value, m])).values());
            // members = members.map(val => ({
            //     ...val,
            //     user_uuid: new mongoose.Types.ObjectId(val.user_uuid)
            // }));
            // Validation
            if (requestData?.uuid && !mongoose_1.Types.ObjectId.isValid(requestData?.uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Queue ID is invalid.`);
            }
            // Parallel Duplicate Checks
            const [nameDuplicate, extDuplicate] = await Promise.all([
                QueueModel.exists({
                    name,
                    company_uuid: companyId,
                    type: 'QUEUE',
                    _id: {
                        $ne: requestData?.uuid
                    }
                }),
                QueueModel.exists({
                    extension,
                    company_uuid: companyId,
                    type: 'QUEUE',
                    _id: {
                        $ne: requestData?.uuid
                    }
                })
            ]);
            if (nameDuplicate)
                throw new HttpException_1.HttpException(422, `Call Queue name already exists.`);
            if (extDuplicate)
                throw new HttpException_1.HttpException(422, `Extension already taken for this Call Queue.`);
            const filter = requestData?.uuid ? {
                _id: requestData.uuid,
                company_uuid: companyId
            } : {
                _id: new mongoose_1.Types.ObjectId(),
                company_uuid: companyId
            };
            // Only add _id to the filter if we are performing an UPDATE
            // Upsert Queue (Handles both Create & Update)
            const queueDetail = await QueueModel.findOneAndUpdate(filter, // Use the dynamic filter here
            {
                $set: {
                    name,
                    extension,
                    manager,
                    agentDisposition,
                    members: members,
                    settings,
                    description,
                    script,
                    domain,
                    site_uuid: site
                },
                $setOnInsert: {
                    // If a new doc is created, MongoDB generates a new ObjectId for _id automatically
                    // because we didn't pass a null/undefined _id in the filter.
                    company_uuid: companyId,
                    user_uuid: userData?.user_uuid
                }
            }, {
                upsert: true,
                returnDocument: "after",
                runValidators: true
            });
            if (!queueDetail)
                throw new HttpException_1.HttpException(404, "Failed to save Queue detail.");
            // --- SYNCHRONIZE TIERS & AGENTS (Runs for both New and Updated Queues) ---
            const queueKey = `${extension}@${domain}`;
            // Use a Promise.all to clear and re-populate everything in parallel for speed
            await Promise.all([
                QueueTierModel.deleteMany({
                    queue: queueKey
                }),
                QueueAgentModel.deleteMany({
                    queue_uuid: queueDetail._id
                })
            ]);
            if (uniqueMembers?.length) {
                // Prepare Tier Data
                const tierOps = members.map((member, index) => ({
                    queue: queueKey,
                    agent: `${member?.extension}@${domain}`,
                    position: index,
                    level: 1,
                    state: 'Ready'
                }));
                // Prepare Agent Data
                const agentOps = members.map((member) => ({
                    queue_uuid: queueDetail._id,
                    user_detail: member,
                    type: 'callback',
                    name: `${member?.extension}@${domain}`,
                    contact: `user/${member?.extension}_web@${domain}`, // Standardized format
                    status: 'On Break',
                    state: 'Idle'
                }));
                // Bulk Insert
                await Promise.all([
                    QueueTierModel.insertMany(tierOps, {
                        ordered: false
                    }),
                    QueueAgentModel.insertMany(agentOps)
                ]);
            }
            return {
                messages: "Call Queue saved successfully."
            };
        }
        catch (error) {
            console.error("Queue Repo Error:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            throw new HttpException_1.HttpException(422, error.message || "Internal Server Error");
        }
    }
    static async templateList(requestData, userData) {
        try {
            const { QueueTemplateModel } = await this.getMainQueueModels();
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const skip = (page - 1) * limit;
            const matchStage = {
                company_uuid: userData?.company_uuid,
                type: 'QUEUE'
            };
            if (search) {
                matchStage.$or = [{
                        name: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        extension: {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ];
            }
            const pipeline = [{
                    $match: matchStage
                },
                {
                    $facet: {
                        rows: [{
                                $sort: {
                                    created_at: -1
                                }
                            },
                            {
                                $skip: skip
                            },
                            {
                                $limit: limit
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    extension: 1,
                                    description: 1,
                                    manager: 1,
                                    members: 1,
                                    site: 1,
                                    settings: 1,
                                    created_at: 1
                                }
                            }
                        ],
                        total: [{
                                $count: "count"
                            }],
                    },
                },
                {
                    $project: {
                        rows: 1,
                        total: {
                            $ifNull: [{
                                    $arrayElemAt: ["$total.count", 0]
                                }, 0]
                        },
                    },
                },
            ];
            const [result] = await QueueTemplateModel.aggregate(pipeline);
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
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
    static async list(requestData, userData) {
        try {
            const { QueueModel } = await this.getMainQueueModels();
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const skip = (page - 1) * limit;
            // 1. Precise Match Stage
            const matchStage = {
                company_uuid: userData?.company_uuid,
                type: 'QUEUE'
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [{
                        name: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        extension: {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ];
            }
            // Optimized Pipeline
            const pipeline = [{
                    $match: matchStage
                },
                {
                    $facet: {
                        rows: [{
                                $sort: {
                                    created_at: -1
                                }
                            }, // Use indexed sort field
                            {
                                $skip: skip
                            },
                            {
                                $limit: limit
                            },
                            // Project only necessary fields for the list to save memory
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    extension: 1,
                                    description: 1,
                                    manager: 1,
                                    members: 1,
                                    site_uuid: 1,
                                    settings: 1,
                                    created_at: 1
                                }
                            }
                        ],
                        total: [{
                                $count: "count"
                            }],
                    },
                },
                {
                    $project: {
                        rows: 1,
                        total: {
                            $ifNull: [{
                                    $arrayElemAt: ["$total.count", 0]
                                }, 0]
                        },
                    },
                },
            ];
            // 3. Execution
            const [result] = await QueueModel.aggregate(pipeline);
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
            console.error("Aggregation Error:", error);
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
    static async templateDelete(requestData, userData) {
        try {
            const { QueueTemplateModel } = await this.getMainQueueModels();
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(requestData?.uuid) && requestData?.uuid) {
                throw new HttpException_1.HttpException(422, `The provided Queue Template ID is invalid.`);
            }
            if (requestData?.uuid && requestData?.uuid !== '') {
                const queueTemplateExists = await QueueTemplateModel.exists({
                    _id: requestData?.uuid
                });
                if (!queueTemplateExists) {
                    throw new HttpException_1.HttpException(404, `Queue Template ID does not exist.`);
                }
            }
            const deleted = await QueueTemplateModel.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(requestData?.uuid)),
                company_uuid: String(userData?.company_uuid)
            });
            if (!deleted) {
                throw new HttpException_1.HttpException(404, 'Queue template not found');
            }
            return {
                messages: "Queue Template ID deleted successfully."
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async delete(requestData, userData) {
        try {
            const { QueueModel } = await this.getMainQueueModels();
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(requestData?.uuid) && requestData?.uuid) {
                throw new HttpException_1.HttpException(422, `The provided Call Queue ID is invalid.`);
            }
            if (requestData?.uuid && requestData?.uuid !== '') {
                const ivrExists = await QueueModel.exists({
                    _id: requestData?.uuid
                });
                if (!ivrExists) {
                    throw new HttpException_1.HttpException(404, `Call Queue ID does not exist.`);
                }
            }
            const deleted = await QueueModel.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(requestData?.uuid)),
                company_uuid: String(userData?.company_uuid)
            });
            if (!deleted) {
                throw new HttpException_1.HttpException(404, 'Call Queue  not found');
            }
            return {
                messages: "Call Queue ID deleted successfully."
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async templateInfo(requestData, userData) {
        try {
            const { QueueTemplateModel } = await this.getMainQueueModels();
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            const { uuid } = requestData;
            if (!uuid || !mongoose_1.Types.ObjectId.isValid(uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Template Call Queue ID is invalid.`);
            }
            const getData = await QueueTemplateModel.findOne({
                _id: uuid,
                company_uuid: userData?.company_uuid
            })
                .select("_id name extension manager members settings site description agentDisposition script")
                .lean();
            if (!getData) {
                throw new HttpException_1.HttpException(404, `Template Call Queue ID does not exist.`);
            }
            return getData;
        }
        catch (error) {
            console.error("Template Queue Info Error:", error);
            // If it's already an HttpException (like our 404 above), re-throw it
            if (error instanceof HttpException_1.HttpException)
                throw error;
            // Otherwise, wrap it in a 422
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async info(requestData, userData) {
        try {
            const { QueueModel } = await this.getMainQueueModels();
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            const { uuid } = requestData;
            if (!uuid || !mongoose_1.Types.ObjectId.isValid(uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Call Queue ID is invalid.`);
            }
            const getData = await QueueModel.findOne({
                _id: uuid,
                company_uuid: userData?.company_uuid
            })
                .select("_id name extension manager members settings site_uuid description agentDisposition script")
                .lean();
            if (!getData) {
                throw new HttpException_1.HttpException(404, `Call Queue ID does not exist.`);
            }
            return getData;
        }
        catch (error) {
            console.error("Queue Info Error:", error);
            // If it's already an HttpException (like our 404 above), re-throw it
            if (error instanceof HttpException_1.HttpException)
                throw error;
            // Otherwise, wrap it in a 422
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async publicInfo(requestData) {
        try {
            const { QueueModel, QueueAgentModel, QueueMemberModel, QueueTierModel, } = await this.getMainQueueModels();
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            const { queue_uuid } = requestData;
            if (!queue_uuid || !mongoose_1.Types.ObjectId.isValid(queue_uuid)) {
                throw new HttpException_1.HttpException(422, `The provided Call Queue ID is invalid.`);
            }
            const queueObjectId = new mongoose_1.Types.ObjectId(queue_uuid);
            const queueData = await QueueModel.findById(queueObjectId).lean();
            if (!queueData) {
                throw new HttpException_1.HttpException(404, `Call Queue ID does not exist.`);
            }
            const queueKey = queueData?.extension && queueData?.domain
                ? `${queueData.extension}@${queueData.domain}`
                : null;
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const [agents, tiers, members, campaign] = await Promise.all([
                QueueAgentModel.find({ queue_uuid: queueObjectId }).lean(),
                queueKey ? QueueTierModel.find({ queue: queueKey }).lean() : [],
                queueKey ? QueueMemberModel.find({ queue: queueKey }).lean() : [],
                queueData?.campaign_uuid && mongoose_1.Types.ObjectId.isValid(queueData.campaign_uuid)
                    ? CampaignModel.findById(queueData.campaign_uuid)
                        .select("_id name campaignStatus campaignType dialMethod queue queue_extension domain")
                        .lean()
                    : null,
            ]);
            return {
                queue: queueData,
                related: {
                    agents,
                    tiers,
                    members,
                    campaign,
                },
            };
        }
        catch (error) {
            console.error("Public Queue Info Error:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async setAgentQueueStatus(request, userData) {
        try {
            const { QueueModel, QueueAgentModel } = await this.getMainQueueModels();
            const { status, state, campaign_uuid } = request;
            const updateData = {};
            if (status) {
                updateData.status = CommonHelper_1.default.capitalizeFirstLetter(status);
            }
            if (state) {
                updateData.state = CommonHelper_1.default.capitalizeFirstLetter(state);
            }
            if (!Object.keys(updateData).length) {
                throw new HttpException_1.HttpException(400, 'Nothing to update');
            }
            let queue_uuid = request.queue_uuid;
            if (campaign_uuid) {
                const get_queue = await QueueModel.findOne({ campaign_uuid }, { _id: 1 }).lean();
                if (get_queue) {
                    queue_uuid = get_queue?._id;
                }
            }
            //Fetching user Skills in profile
            // const getUserSkills = await UserModel.findOne({ _id: new mongoose.Types.ObjectId(userData?.userId) }).select('language_preference').lean();
            // updateData['user_detail.skills'] = getUserSkills?.language_preference || ["en"];
            updateData['user_detail.skills'] = ["en"];
            const statusUpdate = await QueueAgentModel.findOneAndUpdate({
                'user_detail.user_uuid': userData?.user_uuid,
                queue_uuid: new mongoose_1.default.Types.ObjectId(queue_uuid)
            }, {
                $set: updateData,
            }, {
                returnDocument: "after",
                runValidators: true
            });
            const updatedDoc = await QueueModel.findOneAndUpdate({
                'members.user_uuid': userData?.user_uuid,
                _id: new mongoose_1.default.Types.ObjectId(queue_uuid)
            }, {
                $set: {
                    //The '$' operator to target the matched member
                    // 'members.$.skills': getUserSkills?.language_preference || ["en"]
                    'members.$.skills': ["en"]
                },
            }, {
                returnDocument: "after",
                runValidators: true,
                lean: true
            });
            const queueDetail = await QueueModel.findOne({ _id: new mongoose_1.default.Types.ObjectId(queue_uuid) });
            if (!queueDetail) {
                throw new Error("Queue not found");
            }
            // const queues = [queueDetail];
            // const userObjectId = new mongoose.Types.ObjectId(userData?.userId);
            return true;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message);
        }
    }
    static async getQueueInvolvement(request, userData) {
        try {
            const { QueueModel } = await this.getMainQueueModels();
            // const company_uuid = new mongoose.Types.ObjectId(userData.companyUuid);
            const company_uuid = userData?.company_uuid;
            const userId = userData?.user_uuid;
            const filters = request?.filter ?? [];
            const search = request?.search;
            const matchStage = {
                company_uuid,
                type: 'QUEUE',
                $or: [
                    { 'members.user_uuid': userId },
                    { 'manager.user_uuid': String(userData.user_uuid) },
                ],
            };
            if (filters.length > 0) {
                for (const filter of filters) {
                    matchStage[filter.key] = {
                        $regex: filter.value,
                        $options: 'i',
                    };
                }
            }
            if (search) {
                matchStage.name = {
                    $regex: search,
                    $options: 'i',
                };
            }
            const queueList = await QueueModel.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'agents',
                        let: {
                            queueId: '$_id',
                            userId: userId,
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$queue_uuid', '$$queueId'] },
                                            {
                                                $eq: [
                                                    { $toString: '$user_detail.user_uuid' },
                                                    '$$userId',
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            {
                                $project: {
                                    status: 1,
                                    state: 1,
                                },
                            },
                        ],
                        as: 'agent',
                    },
                },
                {
                    $project: {
                        uuid: '$_id',
                        name: 1,
                        site_uuid: 1,
                        manager: 1,
                        members: 1,
                        extension: 1,
                        settings: 1,
                        agent: 1,
                    },
                },
            ]);
            return queueList;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message);
        }
    }
    static async getRoleBasedQueue(request, userData) {
        try {
            const { QueueModel } = await this.getMainQueueModels();
            const { filters } = request;
            const query = { company_uuid: userData?.company_uuid };
            if (filters?.length > 0) {
                filters.forEach(({ key, value }) => {
                    if (key === 'type') {
                        query.type = value;
                    }
                });
            }
            return await QueueModel.find(query).select('uuid name site_uuid members').lean();
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
}
exports.QueueRepository = QueueRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/QueueRepository.ts?
}