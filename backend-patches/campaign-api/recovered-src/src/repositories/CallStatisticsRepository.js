{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallStatisticsRepository = void 0;
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const dayjs_1 = __importDefault(__webpack_require__(/*! dayjs */ "dayjs"));
const isBetween_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/isBetween */ "dayjs/plugin/isBetween"));
const timezone_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/timezone */ "dayjs/plugin/timezone"));
const utc_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/utc */ "dayjs/plugin/utc"));
__webpack_require__(/*! moment-timezone */ "moment-timezone");
const mongoose_1 = __importDefault(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(isBetween_1.default);
class CallStatisticsRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static async callStatisticsList(requestData, userData) {
        try {
            const page = Math.max(1, requestData.page || 1);
            const limit = Math.max(1, requestData.limit || 25);
            const skip = (page - 1) * limit;
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc === false ? 1 : -1;
            const sortObj = { [sortKey]: sortOrder };
            const matchQuery = {};
            const listMatchQuery = {};
            // Dynamic Filters
            if (requestData.filters && Array.isArray(requestData.filters)) {
                for (const filter of requestData.filters) {
                    if (filter.value === undefined || filter.value === null || filter.value === "")
                        continue;
                    if (filter.key === "campaignType") {
                        matchQuery["campaignDetail.campaignType"] = filter.value;
                    }
                    if (filter.key === "campaign_uuid") {
                        matchQuery["campaignId"] = new mongoose_1.default.Types.ObjectId(filter.value);
                    }
                    if (filter.key === "disposition_uuid") {
                        matchQuery["disposition.disposition"] = filter.value;
                    }
                    if (filter.key === "DialedCall") {
                        listMatchQuery["systemDisposition"] = { $ne: null };
                    }
                    if (filter.key === "PendingCall") {
                        listMatchQuery["requestStatus"] = "SCHEDULED";
                    }
                    if (filter.key === "connected") {
                        listMatchQuery["systemDisposition"] = "ANSWERED";
                    }
                    if (filter.key === "DialedButNotAnswered") {
                        listMatchQuery["systemDisposition"] = { $nin: [null, "ANSWERED"] };
                    }
                    if (filter.key === "dnc") {
                        listMatchQuery["isDnc"] = true;
                    }
                }
            }
            if (requestData.search?.trim()) {
                const searchValue = requestData.search.trim();
                listMatchQuery.$or = [
                    { contactName: { $regex: searchValue, $options: 'i' } },
                    { contactNumber: { $regex: searchValue, $options: 'i' } },
                    { "campaignDetail.campaignName": { $regex: searchValue, $options: "i" } },
                    { didNumber: { $regex: searchValue, $options: "i" } },
                    { systemDisposition: { $regex: searchValue, $options: "i" } },
                ];
            }
            const pipeline = [
                { $match: matchQuery },
                {
                    $facet: {
                        //The Paginated Data
                        rows: [
                            { $match: listMatchQuery },
                            { $sort: sortObj },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 0,
                                    contactName: 1,
                                    contactNumber: 1,
                                    campaignDetail: 1,
                                    notes: 1,
                                    callHistory: 1,
                                    disposition: 1,
                                    systemDisposition: 1,
                                    totalCallAttempts: 1,
                                    sipcallDetail: 1,
                                    didNumber: 1,
                                    callEndTime: 1,
                                    duration: 1,
                                    billSec: 1,
                                    isDnc: 1,
                                    createdAt: 1,
                                    requestStatus: 1,
                                    callStatus: 1,
                                    isVoicemail: 1,
                                    recordfile: 1,
                                    transcriptedFile: 1
                                }
                            }
                        ],
                        // The Total Record Count
                        totalCount: [
                            { $match: listMatchQuery },
                            { $count: "count" }
                        ],
                        //  Summary Stats (States) for the entire match
                        states: [
                            {
                                $group: {
                                    _id: null,
                                    totalCall: { $sum: 1 },
                                    DialedCall: {
                                        $sum: { $cond: [{ $ne: ["$systemDisposition", null] }, 1, 0] }
                                    },
                                    PendingCall: {
                                        $sum: { $cond: [{ $eq: ["$requestStatus", "SCHEDULED"] }, 1, 0] }
                                    },
                                    connected: {
                                        $sum: { $cond: [{ $eq: ["$systemDisposition", "ANSWERED"] }, 1, 0] }
                                    },
                                    DialedButNotAnswered: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $ne: ["$systemDisposition", "ANSWERED"] },
                                                        { $ne: ["$systemDisposition", null] }
                                                    ]
                                                },
                                                1, // If condition is met, add 1
                                                0 // Otherwise, add 0
                                            ]
                                        }
                                    },
                                    dnc: {
                                        $sum: { $cond: [{ $eq: ["$isDnc", true] }, 1, 0] }
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    $project: {
                        rows: 1,
                        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
                        states: { $ifNull: [{ $arrayElemAt: ["$states", 0] }, { totalCall: 0, DialedCall: 0, PendingCall: 0 }] }
                    }
                }
            ];
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const [result] = await CampaignNumberModel.aggregate(pipeline).allowDiskUse(true);
            const total = result?.total || 0;
            return {
                rows: result?.rows || [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                states: {
                    totalCall: result?.states?.totalCall || 0,
                    DialedCall: result?.states?.DialedCall || 0,
                    PendingCall: result?.states?.PendingCall || 0,
                    connected: result?.states?.connected || 0,
                    DialedButNotAnswered: result?.states?.DialedButNotAnswered || 0,
                    dnc: result?.states?.dnc || 0
                }
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
    static async callStatisticsCampaignList(requestData, userData) {
        try {
            const page = Math.max(1, requestData.page || 1);
            const limit = Math.max(1, requestData.limit || 25);
            const skip = (page - 1) * limit;
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc === false ? 1 : -1;
            const sortObj = { [sortKey]: sortOrder };
            const matchQuery = { company_uuid: String(userData?.company_uuid) };
            if (requestData.search?.trim()) {
                matchQuery.dialMethod = {
                    $regex: requestData.search.trim(),
                    $options: "i",
                };
            }
            const pipeline = [
                { $match: matchQuery },
                {
                    $facet: {
                        //The Paginated Data
                        rows: [
                            { $sort: sortObj },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    systemDisposition: 1,
                                    dialMethod: 1,
                                    agentDisposition: 1,
                                }
                            }
                        ],
                        // The Total Record Count
                        totalCount: [{ $count: "count" }],
                    }
                },
                {
                    $project: {
                        rows: 1,
                        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
                    }
                }
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const [result] = await CampaignModel.aggregate(pipeline).allowDiskUse(true);
            const total = result?.total || 0;
            return {
                rows: result?.rows || [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
    static async memberCallsReport(requestData, userData) {
        try {
            const page = Math.max(1, requestData.page || 1);
            const limit = Math.max(1, requestData.limit || 25);
            const skip = (page - 1) * limit;
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc === false ? 1 : -1;
            const sortObj = { [sortKey]: sortOrder };
            const matchQuery = { company_uuid: String(userData?.company_uuid) };
            if (requestData.search?.trim()) {
                matchQuery.dialMethod = {
                    $regex: requestData.search.trim(),
                    $options: "i",
                };
            }
            const pipeline = [
                { $match: matchQuery },
                {
                    $facet: {
                        //The Paginated Data
                        rows: [
                            { $sort: sortObj },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 1,
                                    user_uuid: 1,
                                    extension: 1,
                                    totalCalls: 1,
                                    selfTotalCall: 1,
                                    selfCallTotalDuration: 1,
                                    selfTotalAnsweredCall: 1,
                                    totalCampaignCalls: 1,
                                    totalCampaignCallDurations: 1,
                                    totalCampaignAnsweredCalls: 1,
                                    totalInboundCallDurations: 1,
                                    totalVoicemails: 1,
                                    totalMissedCalls: 1
                                }
                            }
                        ],
                        // The Total Record Count
                        totalCount: [{ $count: "count" }],
                    }
                },
                {
                    $project: {
                        rows: 1,
                        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
                    }
                }
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const MemberCallAnalyticsSchemaModel = mainDB.models.member_call_analytics;
            const [result] = await MemberCallAnalyticsSchemaModel.aggregate(pipeline).allowDiskUse(true);
            const total = result?.total || 0;
            return {
                rows: result?.rows || [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
    static async retryCallLogList(requestData, userData) {
        try {
            const page = Math.max(1, requestData.page || 1);
            const limit = Math.max(1, requestData.limit || 25);
            const skip = (page - 1) * limit;
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc === false ? 1 : -1;
            const sortObj = { [sortKey]: sortOrder };
            const normalizedSipcallIds = Array.isArray(requestData?.sipcallIds)
                ? requestData.sipcallIds
                    .map((item) => typeof item === "string"
                    ? item
                    : item?.sipcallId || item?.sipcallID || "")
                    .map((sipcallId) => String(sipcallId || "").trim())
                    .filter((sipcallId) => Boolean(sipcallId))
                : [];
            const uniqueSipcallIds = Array.from(new Set(normalizedSipcallIds));
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignCallLogModel = tenantDB.models.campaign_call_logs;
            if (!uniqueSipcallIds.length) {
                return {
                    rows: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                };
            }
            const matchQuery = { sipcallID: { $in: uniqueSipcallIds } };
            const [rows, total] = await Promise.all([
                CampaignCallLogModel.find(matchQuery)
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limit)
                    .select({
                    _id: 0,
                    domain: 1,
                    type: 1,
                    value: 1,
                    name: 1,
                    member: 1,
                    phone: 1,
                    direction: 1,
                    didNumber: 1,
                    didName: 1,
                    time: 1,
                    status: 1,
                    duration: 1,
                    billsec: 1,
                    isVoicemail: 1,
                    recordfile: 1,
                    transcriptedFile: 1,
                    accountcode: 1,
                    extension: 1,
                    sipcallID: 1,
                    callID: 1,
                    campaignId: 1,
                    contactId: 1,
                    campaignNumberId: 1,
                    campaignType: 1,
                    source: 1,
                    agent: 1,
                    createdAt: 1,
                    updatedAt: 1,
                })
                    .lean(),
                CampaignCallLogModel.countDocuments(matchQuery),
            ]);
            return {
                rows: rows || [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message || "Internal Server Error");
        }
    }
}
exports.CallStatisticsRepository = CallStatisticsRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/CallStatisticsRepository.ts?
}