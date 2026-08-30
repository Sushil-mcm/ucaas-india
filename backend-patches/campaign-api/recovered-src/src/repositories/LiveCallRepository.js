{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LiveCallRepository = void 0;
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const CommonHelper_1 = __importDefault(__webpack_require__(/*! @/helpers/CommonHelper */ "./src/helpers/CommonHelper.ts"));
const NatsController_1 = __webpack_require__(/*! @/nats/NatsController */ "./src/nats/NatsController.ts");
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const AIApiService_1 = __webpack_require__(/*! @/services/AIApiService */ "./src/services/AIApiService.ts");
const MainApiService_1 = __webpack_require__(/*! @/services/MainApiService */ "./src/services/MainApiService.ts");
const DirectTenantApiService_1 = __webpack_require__(/*! @/services/DirectTenantApiService */ "./src/services/DirectTenantApiService.ts");
const moment_timezone_1 = __importDefault(__webpack_require__(/*! moment-timezone */ "moment-timezone"));
const SERVICE_LEVEL_THRESHOLD_SEC = 20;
class LiveCallRepository {
    static async liveCallList(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const startOfDay = moment_timezone_1.default.tz(timezone).startOf("day").toDate();
            const endOfDay = moment_timezone_1.default.tz(timezone).endOf("day").toDate();
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const filter = {
                status: {
                    $ne: "hangup"
                },
                ended_at: {
                    $exists: false
                },
                hangup_cause: {
                    $exists: false
                },
                // created_at: {
                //     $gte: startOfDay,
                //     $lte: endOfDay,
                // },
            };
            if (requestData?.domain) {
                filter.domain = requestData.domain;
            }
            const liveCalls = await LiveCallModel.find(filter).sort({ started_at: -1 }).lean();
            const summary = await LiveCallRepository.liveCallTodaySummary(requestData);
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: [requestData?.socketId],
                emitter: "dash-live-calls-response",
                payload: {
                    success: true,
                    data: {
                        message: "Success",
                        result: liveCalls ?? [],
                        summary,
                        call_log_summary: {
                            hold_calls: summary?.hold_call_count ?? 0,
                            ongoing_calls: summary?.answered_call_count ?? 0,
                            ringing_calls: summary?.ringing_call_count ?? 0
                        }
                    },
                },
            });
            return {
                liveCalls: liveCalls ?? [],
                summary,
            };
        }
        catch (error) {
            console.error("🚀 ~ LiveCallRepository ~ liveCallList ~ error:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async getTodayCallbackData(requestData) {
        const timezone = requestData?.timezone || "UTC";
        const now = moment_timezone_1.default.tz(timezone);
        const endOfDay = now.clone().endOf("day").toDate();
        let callbackData = [];
        let companyUuid = null;
        if (requestData?.domain) {
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const UserSession = mainDB.models.user_session;
            const EventTaskModel = mainDB.models.event_tasks;
            const session = await UserSession.findOne({
                domain: requestData.domain,
                companyUuid: { $ne: null },
            })
                .sort({ updatedAt: -1 })
                .select({ companyUuid: 1 })
                .lean();
            companyUuid = session?.companyUuid ?? null;
            if (companyUuid) {
                callbackData = await EventTaskModel.find({
                    companyId: companyUuid,
                    startTime: {
                        $gte: now.toDate(),
                        $lte: endOfDay,
                    },
                })
                    .sort({ startTime: 1 })
                    .lean();
            }
        }
        return {
            callbackData,
            callbackCount: callbackData.length,
        };
    }
    static async liveCallTodaySummary(requestData) {
        try {
            const domain = requestData?.domain;
            const timezone = requestData?.timezone || "UTC";
            const connectionTenant = CommonHelper_1.default.deriveTenantDbNameFromDomain(domain);
            if (!connectionTenant) {
                throw new HttpException_1.HttpException(422, "Missing or invalid domain");
            }
            const tenantResponse = await DirectTenantApiService_1.DirectTenantApiService.callTenantApi("internal/live-call-today-summary", "POST", {
                tenantDbName: connectionTenant,
                timezone,
            });
            const tenantSummary = tenantResponse?.data?.data?.result
                ?? tenantResponse?.data?.result
                ?? {};
            const { callbackData, callbackCount } = await LiveCallRepository.getTodayCallbackData(requestData);
            return {
                ...tenantSummary,
                callback_data: callbackData,
                callback_count: callbackCount,
            };
        }
        catch (error) {
            console.error("ERROR in liveCallTodaySummary:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async liveCallTodaySummaryLegacy(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const now = moment_timezone_1.default.tz(timezone);
            const startOfDay = now.clone().startOf("day").toDate();
            const endOfDay = now.clone().endOf("day").toDate();
            const nowDate = now.toDate();
            let callbackData = [];
            let callbackCount = 0;
            let companyUuid = null;
            const toFixed2 = (value) => {
                const num = Number(value ?? 0);
                return Number.isFinite(num) ? num.toFixed(2) : "0.00";
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const mainDBUserSession = await DatabaseManager_1.default.getInstance().getMainDB();
            const UserSession = mainDBUserSession.models.user_session;
            const mainDBEventTask = await DatabaseManager_1.default.getInstance().getMainDB();
            const EventTaskModel = mainDBEventTask.models.event_tasks;
            const filter = {
                created_at: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
                $expr: {
                    $not: {
                        $and: [
                            {
                                $regexMatch: {
                                    input: {
                                        $convert: {
                                            input: "$caller_number",
                                            to: "string",
                                            onError: "",
                                            onNull: "",
                                        },
                                    },
                                    regex: "^\\d{4}$",
                                },
                            },
                            {
                                $regexMatch: {
                                    input: {
                                        $convert: {
                                            input: "$called_number",
                                            to: "string",
                                            onError: "",
                                            onNull: "",
                                        },
                                    },
                                    regex: "^\\d{4}$",
                                },
                            },
                        ],
                    },
                },
            };
            if (requestData?.domain) {
                filter.domain = requestData.domain;
                const session = await UserSession.findOne({
                    domain: requestData.domain,
                    companyUuid: { $ne: null },
                })
                    .sort({ updatedAt: -1 })
                    .select({ companyUuid: 1 })
                    .lean();
                companyUuid = session?.companyUuid ?? null;
                if (companyUuid) {
                    const callbackFilter = {
                        companyId: companyUuid,
                        startTime: {
                            $gte: nowDate,
                            $lte: endOfDay,
                        },
                    };
                    callbackData = await EventTaskModel.find(callbackFilter)
                        .sort({ startTime: 1 })
                        .lean();
                    callbackCount = callbackData.length;
                }
            }
            const summaryAgg = await LiveCallModel.aggregate([
                {
                    $match: filter,
                },
                {
                    $group: {
                        _id: null,
                        total_call: {
                            $sum: 1,
                        },
                        inbound_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$direction", "inbound"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        outbound_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$direction", "outbound"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        hold_call_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$status", "on_hold"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        ringing_call_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$status", "ringing"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        answered_call_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$status", "answered"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        missed_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $eq: ["$direction", "inbound"],
                                            },
                                            {
                                                $eq: [
                                                    {
                                                        $ifNull: ["$talk_time_sec", 0],
                                                    },
                                                    0,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        queue_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$call_type", "queue"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        abandoned_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $eq: ["$call_type", "queue"],
                                            },
                                            {
                                                $eq: ["$cause", "abandoned"],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        ivr_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: ["$forward_type", "IVR"],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        answered_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $gt: [
                                            {
                                                $ifNull: ["$talk_time_sec", 0],
                                            },
                                            0,
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        total_talk_time: {
                            $sum: {
                                $ifNull: ["$talk_time_sec", 0],
                            },
                        },
                        total_wait_time: {
                            $sum: {
                                $ifNull: ["$wait_time_sec", 0],
                            },
                        },
                        total_wrap_time: {
                            $sum: {
                                $ifNull: ["$wrap_time_sec", 0],
                            },
                        },
                        answered_wait_time: {
                            $sum: {
                                $cond: [
                                    {
                                        $gt: [
                                            {
                                                $ifNull: ["$talk_time_sec", 0],
                                            },
                                            0,
                                        ],
                                    },
                                    {
                                        $ifNull: ["$wait_time_sec", 0],
                                    },
                                    0,
                                ],
                            },
                        },
                        hold_call: {
                            $sum: {
                                $cond: [
                                    {
                                        $gt: [
                                            {
                                                $ifNull: ["$wait_time_sec", 0],
                                            },
                                            0,
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        hold_wait_time: {
                            $sum: {
                                $cond: [
                                    {
                                        $gt: [
                                            {
                                                $ifNull: ["$wait_time_sec", 0],
                                            },
                                            0,
                                        ],
                                    },
                                    {
                                        $ifNull: ["$wait_time_sec", 0],
                                    },
                                    0,
                                ],
                            },
                        },
                        max_wait_time: {
                            $max: {
                                $ifNull: ["$wait_time_sec", 0],
                            },
                        },
                        longest_active: {
                            $max: {
                                $ifNull: ["$talk_time_sec", 0],
                            },
                        },
                        answered_within_threshold: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $gt: [
                                                    {
                                                        $ifNull: ["$talk_time_sec", 0],
                                                    },
                                                    0,
                                                ],
                                            },
                                            {
                                                $lte: [
                                                    {
                                                        $ifNull: ["$wait_time_sec", 0],
                                                    },
                                                    SERVICE_LEVEL_THRESHOLD_SEC,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        total_handle_time: {
                            $sum: {
                                $add: [
                                    {
                                        $ifNull: ["$talk_time_sec", 0],
                                    },
                                    {
                                        $ifNull: ["$wait_time_sec", 0],
                                    },
                                ],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        total_call: 1,
                        inbound_call: 1,
                        outbound_call: 1,
                        missed_call: 1,
                        answered_call_count: 1,
                        hold_call_count: 1,
                        ringing_call_count: 1,
                        ivr_call: 1,
                        avg_speed_answer: {
                            $cond: [
                                {
                                    $eq: ["$answered_call", 0],
                                },
                                0,
                                {
                                    $divide: ["$answered_wait_time", "$answered_call"],
                                },
                            ],
                        },
                        avg_handle_time: {
                            $cond: [
                                {
                                    $eq: ["$total_call", 0],
                                },
                                0,
                                {
                                    $divide: ["$total_handle_time", "$total_call"],
                                },
                            ],
                        },
                        avg_talk_time: {
                            $cond: [
                                {
                                    $eq: ["$total_call", 0],
                                },
                                0,
                                {
                                    $divide: ["$total_talk_time", "$total_call"],
                                },
                            ],
                        },
                        avg_wrap_time_sec: {
                            $cond: [
                                {
                                    $eq: ["$total_call", 0],
                                },
                                0,
                                {
                                    $divide: ["$total_wrap_time", "$total_call"],
                                },
                            ],
                        },
                        avg_hold_time: {
                            $cond: [
                                {
                                    $eq: ["$hold_call", 0],
                                },
                                0,
                                {
                                    $divide: ["$hold_wait_time", "$hold_call"],
                                },
                            ],
                        },
                        max_wait_time: {
                            $ifNull: ["$max_wait_time", 0],
                        },
                        answered_within_20_sec: {
                            $ifNull: ["$answered_within_threshold", 0],
                        },
                        service_level_percent: {
                            $cond: [
                                {
                                    $eq: ["$total_call", 0],
                                },
                                0,
                                {
                                    $multiply: [
                                        {
                                            $divide: ["$answered_within_threshold", "$total_call"],
                                        },
                                        100,
                                    ],
                                },
                            ],
                        },
                        abandoned_in_call_percent: {
                            $round: [
                                {
                                    $cond: [
                                        {
                                            $eq: ["$queue_call", 0],
                                        },
                                        0,
                                        {
                                            $multiply: [
                                                {
                                                    $divide: ["$abandoned_call", "$queue_call"],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                2,
                            ],
                        },
                        longest_active: {
                            $ifNull: ["$longest_active", 0],
                        },
                    },
                },
            ]);
            if (summaryAgg && summaryAgg.length) {
                const summary = summaryAgg[0];
                return {
                    ...summary,
                    abandoned_in_call_percent: toFixed2(summary?.abandoned_in_call_percent),
                    service_level_percent: toFixed2(summary?.service_level_percent),
                    avg_handle_time: toFixed2(summary?.avg_handle_time),
                    avg_hold_time: toFixed2(summary?.avg_hold_time),
                    avg_speed_answer: toFixed2(summary?.avg_speed_answer),
                    avg_talk_time: toFixed2(summary?.avg_talk_time),
                    callback_data: callbackData,
                    callback_count: callbackCount,
                };
            }
            return {
                total_call: 0,
                inbound_call: 0,
                outbound_call: 0,
                missed_call: 0,
                ivr_call: 0,
                avg_speed_answer: toFixed2(0),
                avg_handle_time: toFixed2(0),
                avg_talk_time: toFixed2(0),
                avg_wrap_time_sec: 0,
                avg_hold_time: toFixed2(0),
                max_wait_time: 0,
                answered_within_20_sec: 0,
                service_level_percent: toFixed2(0),
                abandoned_in_call_percent: toFixed2(0),
                longest_active: 0,
                callback_data: callbackData,
                callback_count: callbackCount,
            };
        }
        catch (error) {
            console.error("ERROR in liveCallTodaySummaryLegacy:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async activeCampaignList(requestData) {
        try {
            const tenantDbName = requestData?.connectionTenant || CommonHelper_1.default.deriveTenantDbNameFromDomain(requestData?.domain);
            if (!tenantDbName) {
                throw new HttpException_1.HttpException(422, "Missing or invalid domain");
            }
            const [mainDB, tenantDB] = await Promise.all([
                DatabaseManager_1.default.getInstance().getMainDB(),
                DatabaseManager_1.default.getInstance().getTenantConnection(tenantDbName),
            ]);
            const CampaignModel = mainDB.models.campaign;
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const campaigns = await CampaignModel.find({
                domain: requestData.domain,
                campaignType: "CALL",
                campaignStatus: "PROCESSING",
            }).sort({ startDate: -1 }).select({ _id: 1, name: 1, uuid: 1 }).lean();
            const campaignIds = campaigns.map((campaign) => campaign?._id).filter(Boolean);
            let statsMap = new Map();
            if (campaignIds.length) {
                const statsMatch = {
                    campaignId: { $in: campaignIds },
                };
                if (requestData?.company_uuid) {
                    statsMatch.company_uuid = String(requestData.company_uuid);
                }
                const statsAgg = await CampaignNumberModel.aggregate([
                    {
                        $match: statsMatch,
                    },
                    {
                        $group: {
                            _id: "$campaignId",
                            dialed: {
                                $sum: {
                                    $cond: [{ $ne: ["$systemDisposition", null] }, 1, 0],
                                },
                            },
                            connected: {
                                $sum: {
                                    $cond: [{ $eq: ["$systemDisposition", "ANSWERED"] }, 1, 0],
                                },
                            },
                        },
                    },
                ]);
                statsMap = new Map((statsAgg ?? []).map((item) => [
                    String(item?._id),
                    {
                        dialed: Number(item?.dialed ?? 0),
                        connected: Number(item?.connected ?? 0),
                    },
                ]));
            }
            const result = campaigns.map((campaign) => {
                const stats = statsMap.get(String(campaign?._id)) ?? {
                    dialed: 0,
                    connected: 0,
                };
                const failed = Math.max(stats.dialed - stats.connected, 0);
                const connectedPercent = stats.dialed > 0 ? Number(((stats.connected / stats.dialed) * 100).toFixed(2)) : 0;
                return {
                    name: campaign?.name ?? "",
                    uuid: campaign?.uuid,
                    dialed: stats.dialed,
                    connected: stats.connected,
                    failed,
                    connectedPercent,
                };
            });
            if (requestData?.socketId) {
                NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                    socketId: [requestData?.socketId],
                    emitter: "dash-active-campaign-response",
                    payload: {
                        success: true,
                        data: {
                            message: "Success",
                            result,
                        },
                    },
                });
            }
            return result;
        }
        catch (error) {
            console.error("ERROR in activeCampaignList:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async campaignCallFlowFunnel(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const startOfDay = moment_timezone_1.default.tz(timezone).startOf("day").toDate();
            const endOfDay = moment_timezone_1.default.tz(timezone).endOf("day").toDate();
            const matchCondition = {
                domain: requestData?.domain,
                created_at: { $gte: startOfDay, $lte: endOfDay },
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const funnelAgg = await LiveCallModel.aggregate([
                {
                    $match: matchCondition,
                },
                {
                    $group: {
                        _id: null,
                        total_calls: { $sum: 1 },
                        entered_ivr_count: {
                            $sum: {
                                $cond: [{ $eq: ["$forward_type", "IVR"] }, 1, 0],
                            },
                        },
                        queued_count: {
                            $sum: {
                                $cond: [{ $eq: ["$call_type", "queue"] }, 1, 0],
                            },
                        },
                        assigned_calls_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $ne: [
                                            { $ifNull: ["$agent_extension", ""] },
                                            "",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        assigned_agents: {
                            $addToSet: {
                                $let: {
                                    vars: {
                                        normalizedAgentExtension: {
                                            $ifNull: ["$agent_extension", ""],
                                        },
                                    },
                                    in: {
                                        $cond: [
                                            {
                                                $ne: [
                                                    "$$normalizedAgentExtension",
                                                    "",
                                                ],
                                            },
                                            "$$normalizedAgentExtension",
                                            null,
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        total_calls: 1,
                        entered_ivr_count: 1,
                        queued_count: 1,
                        assigned_calls_count: 1,
                        assigned_agent_count: {
                            $size: {
                                $filter: {
                                    input: "$assigned_agents",
                                    as: "agent_extension",
                                    cond: {
                                        $ne: ["$$agent_extension", null],
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        entered_ivr_count: 1,
                        queued_count: 1,
                        assigned_agent_total_calls: "$assigned_calls_count",
                        assigned_agent_count: 1,
                        entered_ivr_percent: {
                            $round: [
                                {
                                    $cond: [
                                        { $eq: ["$total_calls", 0] },
                                        0,
                                        {
                                            $multiply: [
                                                {
                                                    $divide: ["$entered_ivr_count", "$total_calls"],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                2,
                            ],
                        },
                        queued_percent: {
                            $round: [
                                {
                                    $cond: [
                                        { $eq: ["$total_calls", 0] },
                                        0,
                                        {
                                            $multiply: [
                                                {
                                                    $divide: ["$queued_count", "$total_calls"],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                2,
                            ],
                        },
                        assigned_agent_percent: {
                            $round: [
                                {
                                    $cond: [
                                        { $eq: ["$assigned_calls_count", 0] },
                                        0,
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        "$assigned_agent_count",
                                                        "$assigned_calls_count",
                                                    ],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                2,
                            ],
                        },
                    },
                },
            ]);
            const result = funnelAgg && funnelAgg.length
                ? funnelAgg[0]
                : {
                    entered_ivr_count: 0,
                    entered_ivr_percent: 0,
                    queued_count: 0,
                    queued_percent: 0,
                    assigned_agent_total_calls: 0,
                    assigned_agent_count: 0,
                    assigned_agent_percent: 0,
                };
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: [requestData?.socketId],
                emitter: "dash-campaign-call-flow-funnel-response",
                payload: {
                    success: true,
                    data: {
                        message: "Success",
                        result,
                    },
                },
            });
            return result;
        }
        catch (error) {
            console.error("ERROR in campaignCallFlowFunnel:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async campaignAgentData(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const now = moment_timezone_1.default.tz(timezone);
            const startOfDayMoment = now.clone().startOf("day");
            const endOfDayMoment = now.clone().endOf("day");
            const startOfDay = startOfDayMoment.toDate();
            const endOfDay = endOfDayMoment.toDate();
            const fullDaySeconds = Math.max(1, endOfDayMoment.diff(startOfDayMoment, "seconds"));
            const matchCondition = {
                domain: requestData?.domain,
                created_at: { $gte: startOfDay, $lte: endOfDay },
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const agentData = await LiveCallModel.aggregate([
                {
                    $match: matchCondition,
                },
                {
                    $sort: {
                        agent_name: 1,
                    },
                },
                {
                    $group: {
                        _id: "$agent_extension",
                        agent_name: { $first: "$agent_name" },
                        total_calls: { $sum: 1 },
                        total_handle_time: {
                            $sum: {
                                $add: [
                                    { $ifNull: ["$talk_time_sec", 0] },
                                    { $ifNull: ["$wait_time_sec", 0] },
                                ],
                            },
                        },
                        avg_handle_time: {
                            $avg: {
                                $add: [
                                    { $ifNull: ["$talk_time_sec", 0] },
                                    { $ifNull: ["$wait_time_sec", 0] },
                                ],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        agent_extension: "$_id",
                        agent_name: 1,
                        total_calls: 1,
                        total_handle_time: 1,
                        avg_handle_time: { $round: ["$avg_handle_time", 2] },
                    },
                },
                {
                    $sort: {
                        total_calls: -1,
                        agent_name: 1,
                        agent_extension: 1,
                    },
                },
            ]);
            const sanitizedAgents = (agentData ?? []).map((agent) => {
                const extension = agent?.agent_extension ?? "";
                const rawName = agent?.agent_name ?? "";
                const nameStr = String(rawName);
                let cleanedName = nameStr;
                if (extension) {
                    const escapedExtension = String(extension).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    cleanedName = cleanedName
                        .replace(new RegExp(escapedExtension, "g"), "")
                        .trim();
                }
                if (!cleanedName) {
                    cleanedName = null;
                }
                const totalHandleTime = Number(agent?.total_handle_time ?? 0);
                const utilizationPercentRaw = fullDaySeconds > 0 ? (totalHandleTime / fullDaySeconds) * 100 : 0;
                const safeUtilizationPercent = Number.isFinite(utilizationPercentRaw)
                    ? utilizationPercentRaw
                    : 0;
                return {
                    agent_extension: agent?.agent_extension ?? "",
                    agent_name: cleanedName,
                    total_calls: agent?.total_calls ?? 0,
                    avg_handle_time: agent?.avg_handle_time ?? 0,
                    utilization_percent: Number(safeUtilizationPercent.toFixed(2)),
                };
            });
            const emptyCalls = {
                agent_extension: "",
                agent_name: "",
                total_calls: 0,
                avg_handle_time: 0,
                utilization_percent: 0,
            };
            const top_calls = sanitizedAgents && sanitizedAgents.length
                ? {
                    agent_extension: sanitizedAgents[0]?.agent_extension ?? "",
                    agent_name: sanitizedAgents[0]?.agent_name ?? "",
                    total_calls: sanitizedAgents[0]?.total_calls ?? 0,
                    avg_handle_time: sanitizedAgents[0]?.avg_handle_time ?? 0,
                    utilization_percent: sanitizedAgents[0]?.utilization_percent ?? 0,
                }
                : emptyCalls;
            const bottom_calls = sanitizedAgents && sanitizedAgents.length
                ? {
                    agent_extension: sanitizedAgents[sanitizedAgents.length - 1]?.agent_extension ??
                        "",
                    agent_name: sanitizedAgents[sanitizedAgents.length - 1]?.agent_name ?? "",
                    total_calls: sanitizedAgents[sanitizedAgents.length - 1]?.total_calls ?? 0,
                    avg_handle_time: sanitizedAgents[sanitizedAgents.length - 1]?.avg_handle_time ??
                        0,
                    utilization_percent: sanitizedAgents[sanitizedAgents.length - 1]
                        ?.utilization_percent ?? 0,
                }
                : emptyCalls;
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: [requestData?.socketId],
                emitter: "dash-campaign-agent-response",
                payload: {
                    success: true,
                    data: {
                        message: "Success",
                        result: {
                            agents: sanitizedAgents ?? [],
                            top_calls,
                            bottom_calls,
                        },
                    },
                },
            });
            return {
                agents: sanitizedAgents ?? [],
                top_calls,
                bottom_calls,
            };
        }
        catch (error) {
            console.error("ERROR in campaignAgentData:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    /* AI Dash (Start) */
    static async campaignAiLiveCall(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const startOfDay = moment_timezone_1.default.tz(timezone).startOf("day").toDate();
            const endOfDay = moment_timezone_1.default.tz(timezone).endOf("day").toDate();
            const lookbackDaysRaw = Number(requestData?.ai_chat_lookback_days ?? 30);
            const lookbackDays = Number.isFinite(lookbackDaysRaw) && lookbackDaysRaw > 0 ? lookbackDaysRaw : 30;
            const aiChatStartDate = moment_timezone_1.default.tz(timezone).subtract(lookbackDays, "days").startOf("day").toDate();
            const matchCondition = {
                domain: requestData?.domain,
                forward_type: { $in: ["AI", "ai"] },
                created_at: { $gte: startOfDay, $lte: endOfDay },
            };
            const sentimentMatchCondition = {
                domain: requestData?.domain,
                created_at: { $gte: startOfDay, $lte: endOfDay },
                sentiment_scores: { $ne: null, $exists: true },
                $expr: {
                    $in: [
                        {
                            $toLower: {
                                $trim: {
                                    input: {
                                        $ifNull: [
                                            {
                                                $convert: {
                                                    input: "$sentiment",
                                                    to: "string",
                                                    onError: "",
                                                    onNull: "",
                                                },
                                            },
                                            "",
                                        ],
                                    },
                                },
                            },
                        },
                        ["positive", "neutral", "negative"],
                    ],
                },
            };
            const intentMatchCondition = {
                ...matchCondition,
                intent: { $ne: null, $exists: true },
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const sentimentPositivePercentExpr = LiveCallRepository.buildSentimentComponentExpr("$sentiment_scores.positive");
            const sentimentNeutralPercentExpr = LiveCallRepository.buildSentimentComponentExpr("$sentiment_scores.neutral");
            const sentimentNegativePercentExpr = LiveCallRepository.buildSentimentComponentExpr("$sentiment_scores.negative");
            const [aiLiveAgg, sentimentScoreAgg, sentimentBucketAgg, intentCountAgg,] = await Promise.all([
                LiveCallModel.aggregate([
                    {
                        $match: matchCondition,
                    },
                    {
                        $addFields: {
                            ai_aht_sec: {
                                $switch: {
                                    branches: [
                                        {
                                            case: { $eq: ["$ai_agent_status", "Connected"] },
                                            then: { $ifNull: ["$talk_time_sec", 0] },
                                        },
                                        {
                                            case: { $eq: ["$ai_agent_status", "Connecting"] },
                                            then: { $ifNull: ["$talk_time_sec", 0] },
                                        },
                                        {
                                            case: { $eq: ["$ai_agent_status", "Transferred"] },
                                            then: {
                                                $cond: [
                                                    {
                                                        $and: [
                                                            { $ne: ["$bridged_at", null] },
                                                            { $ne: ["$answered_at", null] },
                                                        ],
                                                    },
                                                    {
                                                        $let: {
                                                            vars: {
                                                                diffSec: {
                                                                    $divide: [
                                                                        {
                                                                            $subtract: [
                                                                                "$bridged_at",
                                                                                "$answered_at",
                                                                            ],
                                                                        },
                                                                        1000,
                                                                    ],
                                                                },
                                                            },
                                                            in: {
                                                                $cond: [
                                                                    { $lt: ["$$diffSec", 0] },
                                                                    0,
                                                                    "$$diffSec",
                                                                ],
                                                            },
                                                        },
                                                    },
                                                    null,
                                                ],
                                            },
                                        },
                                    ],
                                    default: null,
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total_ai_calls: { $sum: 1 },
                            at_risk_calls: {
                                $sum: {
                                    $cond: [{ $eq: ["$at_risk", true] }, 1, 0],
                                },
                            },
                            ai_containment_calls: {
                                $sum: {
                                    $cond: [
                                        {
                                            $in: [
                                                "$ai_agent_status",
                                                ["Connected", "Connecting"],
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            transferred_calls: {
                                $sum: {
                                    $cond: [{ $eq: ["$ai_agent_status", "Transferred"] }, 1, 0],
                                },
                            },
                            connected_duration_total: {
                                $sum: {
                                    $cond: [
                                        {
                                            $in: [
                                                "$ai_agent_status",
                                                ["Connected", "Connecting"],
                                            ],
                                        },
                                        "$ai_aht_sec",
                                        0,
                                    ],
                                },
                            },
                            connected_duration_count: {
                                $sum: {
                                    $cond: [
                                        {
                                            $in: [
                                                "$ai_agent_status",
                                                ["Connected", "Connecting"],
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            lead_captured_counts: {
                                $sum: {
                                    $cond: [{ $eq: ["$lead_captured", true] }, 1, 0],
                                },
                            },
                            aht_0_2m: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ai_aht_sec", null] },
                                                { $lte: ["$ai_aht_sec", 120] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            aht_2_5m: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ai_aht_sec", null] },
                                                { $gt: ["$ai_aht_sec", 120] },
                                                { $lte: ["$ai_aht_sec", 300] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            aht_5_10m: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ai_aht_sec", null] },
                                                { $gt: ["$ai_aht_sec", 300] },
                                                { $lte: ["$ai_aht_sec", 600] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            aht_10_15m: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ai_aht_sec", null] },
                                                { $gt: ["$ai_aht_sec", 600] },
                                                { $lte: ["$ai_aht_sec", 900] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            aht_gt_15m: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ai_aht_sec", null] },
                                                { $gt: ["$ai_aht_sec", 900] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            total_ai_calls: 1,
                            at_risk_calls: 1,
                            ai_containment_calls: 1,
                            transferred_calls: 1,
                            lead_captured_counts: 1,
                            avg_connected_duration_sec: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$connected_duration_count", 0] },
                                            0,
                                            {
                                                $divide: [
                                                    "$connected_duration_total",
                                                    "$connected_duration_count",
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                            aht_0_2m: 1,
                            aht_2_5m: 1,
                            aht_5_10m: 1,
                            aht_10_15m: 1,
                            aht_gt_15m: 1,
                            transfer_to_agent_percent: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$total_ai_calls", 0] },
                                            0,
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: ["$transferred_calls", "$total_ai_calls"],
                                                    },
                                                    100,
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                            ai_containment_percent: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$total_ai_calls", 0] },
                                            0,
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: [
                                                            "$ai_containment_calls",
                                                            "$total_ai_calls",
                                                        ],
                                                    },
                                                    100,
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                        },
                    },
                ]),
                LiveCallModel.aggregate([
                    { $match: sentimentMatchCondition },
                    {
                        $group: {
                            _id: null,
                            positive_avg: {
                                $avg: sentimentPositivePercentExpr,
                            },
                            neutral_avg: {
                                $avg: sentimentNeutralPercentExpr,
                            },
                            negative_avg: {
                                $avg: sentimentNegativePercentExpr,
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            positive_avg: { $round: ["$positive_avg", 2] },
                            neutral_avg: { $round: ["$neutral_avg", 2] },
                            negative_avg: { $round: ["$negative_avg", 2] },
                        },
                    },
                ]),
                LiveCallModel.aggregate([
                    { $match: sentimentMatchCondition },
                    {
                        $addFields: {
                            sentiment_value: {
                                $round: [
                                    {
                                        $add: [
                                            sentimentPositivePercentExpr,
                                            {
                                                $multiply: [
                                                    sentimentNeutralPercentExpr,
                                                    0.5,
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $switch: {
                                    branches: [
                                        {
                                            case: { $gte: ["$sentiment_value", 80] },
                                            then: "Excellent",
                                        },
                                        {
                                            case: { $eq: ["$sentiment_value", 50] },
                                            then: "Neutral",
                                        },
                                        {
                                            case: { $gt: ["$sentiment_value", 50] },
                                            then: "Good",
                                        },
                                        {
                                            case: { $gte: ["$sentiment_value", 20] },
                                            then: "Poor",
                                        },
                                    ],
                                    default: "Critical",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            label: "$_id",
                            count: 1,
                        },
                    },
                ]),
                LiveCallModel.aggregate([
                    { $match: intentMatchCondition },
                    {
                        $addFields: {
                            normalized_intent: {
                                $toLower: {
                                    $trim: {
                                        input: {
                                            $ifNull: [
                                                {
                                                    $convert: {
                                                        input: "$intent",
                                                        to: "string",
                                                        onError: "",
                                                        onNull: "",
                                                    },
                                                },
                                                "",
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $match: {
                            $expr: {
                                $gt: [{ $strLenCP: "$normalized_intent" }, 0],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$normalized_intent",
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            intent: "$_id",
                            count: 1,
                        },
                    },
                    { $sort: { count: -1, intent: 1 } },
                ]),
            ]);
            const baseResult = aiLiveAgg && aiLiveAgg.length
                ? aiLiveAgg[0]
                : {
                    total_ai_calls: 0,
                    at_risk_calls: 0,
                    ai_containment_calls: 0,
                    transferred_calls: 0,
                    lead_captured_counts: 0,
                    avg_connected_duration_sec: 0,
                    transfer_to_agent_percent: 0,
                    ai_containment_percent: 0,
                    aht_0_2m: 0,
                    aht_2_5m: 0,
                    aht_5_10m: 0,
                    aht_10_15m: 0,
                    aht_gt_15m: 0,
                };
            const avgConnectedDurationSecRaw = Number(baseResult?.avg_connected_duration_sec ?? 0);
            const avgConnectedDurationSec = Number.isFinite(avgConnectedDurationSecRaw) ? Number(avgConnectedDurationSecRaw.toFixed(2)) : 0;
            const totalAhtCalls = [
                baseResult?.aht_0_2m ?? 0,
                baseResult?.aht_2_5m ?? 0,
                baseResult?.aht_5_10m ?? 0,
                baseResult?.aht_10_15m ?? 0,
                baseResult?.aht_gt_15m ?? 0,
            ].reduce((sum, value) => sum + Number(value || 0), 0);
            const safeTotalAhtCalls = Number.isFinite(totalAhtCalls) ? totalAhtCalls : 0;
            const bucketPercent = (count) => safeTotalAhtCalls > 0
                ? Number(((count / safeTotalAhtCalls) * 100).toFixed(2))
                : 0;
            const aht_buckets = [
                {
                    label: "0-2m",
                    count: baseResult?.aht_0_2m ?? 0,
                    percent: bucketPercent(baseResult?.aht_0_2m ?? 0),
                },
                {
                    label: "2-5m",
                    count: baseResult?.aht_2_5m ?? 0,
                    percent: bucketPercent(baseResult?.aht_2_5m ?? 0),
                },
                {
                    label: "5-10m",
                    count: baseResult?.aht_5_10m ?? 0,
                    percent: bucketPercent(baseResult?.aht_5_10m ?? 0),
                },
                {
                    label: "10-15m",
                    count: baseResult?.aht_10_15m ?? 0,
                    percent: bucketPercent(baseResult?.aht_10_15m ?? 0),
                },
                {
                    label: ">15m",
                    count: baseResult?.aht_gt_15m ?? 0,
                    percent: bucketPercent(baseResult?.aht_gt_15m ?? 0),
                },
            ];
            const sentiment_scoress = sentimentScoreAgg && sentimentScoreAgg.length
                ? LiveCallRepository.normalizeSentimentScores({
                    positive: sentimentScoreAgg[0]?.positive_avg ?? 0,
                    neutral: sentimentScoreAgg[0]?.neutral_avg ?? 0,
                    negative: sentimentScoreAgg[0]?.negative_avg ?? 0,
                })
                : {
                    positive: 0,
                    neutral: 0,
                    negative: 0,
                };
            const avg_sentiment = LiveCallRepository.calculateAvgSentiment(sentiment_scoress);
            const intent_count = (intentCountAgg ?? []).reduce((acc, item) => {
                const intentKey = String(item?.intent ?? "").trim();
                if (!intentKey) {
                    return acc;
                }
                acc[intentKey] = Number(item?.count ?? 0);
                return acc;
            }, {});
            const sentimentBucketTotals = (sentimentBucketAgg ?? []).reduce((sum, item) => sum + Number(item?.count ?? 0), 0);
            const sentimentBucketOrder = [
                "Excellent",
                "Good",
                "Neutral",
                "Poor",
                "Critical",
            ];
            const sentiment_buckets = sentimentBucketOrder.map((label) => {
                const match = (sentimentBucketAgg ?? []).find((item) => item?.label === label);
                const count = Number(match?.count ?? 0);
                return {
                    label,
                    count,
                    percent: sentimentBucketTotals > 0 ? Number(((count / sentimentBucketTotals) * 100).toFixed(2)) : 0,
                };
            });
            const dominantSentiment = sentiment_buckets.reduce((top, bucket) => (bucket.count > top.count ? bucket : top), { label: null, count: 0 }).label;
            const mainApiResultPromise = LiveCallRepository.getMainApiResult(requestData?.company_uuid);
            const aiChatCountsPromise = mainApiResultPromise.then((result) => LiveCallRepository.getAiChatCounts({
                aiToken: result?.ai_token ?? null,
                domain: requestData?.domain,
                startOfDay: aiChatStartDate,
                endOfDay,
            }));
            const [, aiChatCounts] = await Promise.all([
                mainApiResultPromise,
                aiChatCountsPromise,
            ]);
            const { total: total_ai_chats, perAgent: ai_chat_counts } = aiChatCounts;
            const result = {
                ...baseResult,
                avg_connected_duration_sec: avgConnectedDurationSec,
                aht_buckets,
                sentiment: dominantSentiment,
                sentiment_scoress,
                avg_sentiment,
                sentiment_buckets,
                intent_count,
                total_ai_chats,
                ai_chat_counts,
                voice_vs_text_interactions: (() => {
                    const voiceCount = Number(baseResult?.total_ai_calls ?? 0);
                    const textCount = Number(total_ai_chats ?? 0);
                    const total = voiceCount + textCount;
                    const toPercent = (count) => total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
                    return {
                        voice_count: voiceCount,
                        text_count: textCount,
                        voice_percent: toPercent(voiceCount),
                        text_percent: toPercent(textCount),
                    };
                })(),
                ai_receptionist_performance: {
                    handled_ai_only: baseResult?.ai_containment_calls ?? 0,
                    transferred_calls: baseResult?.transferred_calls ?? 0,
                    transfer_to_agent_percent: baseResult?.transfer_to_agent_percent ?? 0,
                    avg_duration_sec: avgConnectedDurationSec,
                    lead_captured_counts: baseResult?.lead_captured_counts ?? 0,
                },
            };
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: [requestData?.socketId],
                emitter: "dash-campaign-ai-live-call-response",
                payload: {
                    success: true,
                    data: {
                        message: "Success",
                        result,
                    },
                },
            });
            return result;
        }
        catch (error) {
            console.error("ERROR in campaignAiLiveCall:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async getMainApiResult(companyUuid) {
        let mainApiResult = null;
        try {
            const mainApiResponse = await MainApiService_1.MainApiService.callMainApi("ai/user/get-token-internal", // Main API endpoint
            "POST", "", { company_uuid: companyUuid });
            mainApiResult = mainApiResponse?.data?.data?.result ?? null;
        }
        catch { }
        return mainApiResult;
    }
    static async getAiChatCounts(params) {
        const { aiToken, domain, startOfDay, endOfDay } = params;
        if (!aiToken) {
            return { total: 0, perAgent: {} };
        }
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const LiveCallModel = mainDB.models.LiveCall;
        try {
            const agentMatch = {
                forward_value: { $ne: null, $exists: true },
                created_at: { $gte: startOfDay, $lte: endOfDay },
                $expr: { $gt: [{ $strLenCP: "$forward_value" }, 4] },
            };
            if (domain) {
                agentMatch.domain = domain;
            }
            const agentIds = await LiveCallModel.distinct("forward_value", agentMatch);
            const uniqueAgentIds = (agentIds ?? [])
                .map((id) => String(id).trim())
                .filter((id) => id.length > 0);
            const perAgent = {};
            if (uniqueAgentIds.length === 0) {
                return { total: 0, perAgent };
            }
            const counts = await Promise.all(uniqueAgentIds.map(async (agentId) => {
                try {
                    const agentList = await AIApiService_1.AIApiService.getCallAIProcess(`/api/agent/session/list?token=${aiToken}&agentId=${agentId}`);
                    const count = Array.isArray(agentList?.sessions)
                        ? agentList.sessions.length
                        : 0;
                    perAgent[agentId] = count;
                    return count;
                }
                catch {
                    perAgent[agentId] = 0;
                    return 0;
                }
            }));
            const total = counts.reduce((sum, count) => sum + Number(count || 0), 0);
            return { total, perAgent };
        }
        catch {
            return { total: 0, perAgent: {} };
        }
    }
    static buildSentimentComponentExpr(valueExpr) {
        return { $ifNull: [valueExpr, 0] };
    }
    static buildHasSentimentDataExpr() {
        return {
            $and: [
                {
                    $in: [
                        {
                            $toLower: {
                                $trim: {
                                    input: {
                                        $ifNull: [
                                            {
                                                $convert: {
                                                    input: "$sentiment",
                                                    to: "string",
                                                    onError: "",
                                                    onNull: "",
                                                },
                                            },
                                            "",
                                        ],
                                    },
                                },
                            },
                        },
                        ["positive", "neutral", "negative"],
                    ],
                },
                {
                    $ne: [
                        { $ifNull: ["$sentiment_scores", null] },
                        null,
                    ],
                },
            ],
        };
    }
    static sanitizeSentimentComponent(value) {
        const num = Number(value ?? 0);
        return Number.isFinite(num) ? num : 0;
    }
    static normalizeSentimentScores(scores) {
        return {
            positive: Number(LiveCallRepository.sanitizeSentimentComponent(scores?.positive).toFixed(2)),
            neutral: Number(LiveCallRepository.sanitizeSentimentComponent(scores?.neutral).toFixed(2)),
            negative: Number(LiveCallRepository.sanitizeSentimentComponent(scores?.negative).toFixed(2)),
        };
    }
    static calculateAvgSentiment(scores) {
        const positive = LiveCallRepository.sanitizeSentimentComponent(scores?.positive);
        const neutral = LiveCallRepository.sanitizeSentimentComponent(scores?.neutral);
        const positiveCents = Math.round(positive * 100);
        const neutralCents = Math.round(neutral * 100);
        const avgSentimentRounded = Math.round(positiveCents + neutralCents / 2) / 100;
        return Number.isFinite(avgSentimentRounded)
            ? avgSentimentRounded
            : 0;
    }
    static calculateSentimentCountPercents(params) {
        const positive = Math.max(0, Number(params.positive ?? 0) || 0);
        const neutral = Math.max(0, Number(params.neutral ?? 0) || 0);
        const negative = Math.max(0, Number(params.negative ?? 0) || 0);
        const providedTotal = Math.max(0, Number(params.total ?? 0) || 0);
        const fallbackTotal = positive + neutral + negative;
        const total = providedTotal > 0 ? providedTotal : fallbackTotal;
        if (total <= 0) {
            return {
                positive_percent: 0,
                neutral_percent: 0,
                negative_percent: 0,
            };
        }
        const positiveBasisPoints = Math.round((positive / total) * 10000);
        const neutralBasisPoints = Math.round((neutral / total) * 10000);
        let negativeBasisPoints = 10000 - positiveBasisPoints - neutralBasisPoints;
        if (negativeBasisPoints < 0) {
            negativeBasisPoints = 0;
        }
        return {
            positive_percent: Number((positiveBasisPoints / 100).toFixed(2)),
            neutral_percent: Number((neutralBasisPoints / 100).toFixed(2)),
            negative_percent: Number((negativeBasisPoints / 100).toFixed(2)),
        };
    }
    static calculateCombinedSentiment(params) {
        const positive = Math.max(0, Number(params.positive ?? 0) || 0);
        const neutral = Math.max(0, Number(params.neutral ?? 0) || 0);
        const negative = Math.max(0, Number(params.negative ?? 0) || 0);
        const providedTotal = Math.max(0, Number(params.total ?? 0) || 0);
        const fallbackTotal = positive + neutral + negative;
        const total = providedTotal > 0 ? providedTotal : fallbackTotal;
        if (total <= 0) {
            return null;
        }
        const positivePercent = (positive / total) * 100;
        const neutralPercent = (neutral / total) * 100;
        const negativePercent = (negative / total) * 100;
        if (positivePercent > 50) {
            return "positive";
        }
        if (negativePercent > 50) {
            return "negative";
        }
        if (neutralPercent > 50) {
            return "neutral";
        }
        return "neutral";
    }
    static async campaignAiAgentData(requestData) {
        try {
            const timezone = requestData?.timezone || "UTC";
            const now = moment_timezone_1.default.tz(timezone);
            const startOfDayMoment = now.clone().startOf("day");
            const endOfDayMoment = now.clone().endOf("day");
            const startOfDay = startOfDayMoment.toDate();
            const endOfDay = endOfDayMoment.toDate();
            const matchCondition = {
                domain: requestData?.domain,
                created_at: { $gte: startOfDay, $lte: endOfDay },
                direction: { $ne: "local" },
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const LiveCallModel = mainDB.models.LiveCall;
            const agentPositivePercentExpr = LiveCallRepository.buildSentimentComponentExpr({
                $ifNull: [
                    "$sentiment_score.positive",
                    "$sentiment_scores.positive",
                ],
            });
            const agentNeutralPercentExpr = LiveCallRepository.buildSentimentComponentExpr({
                $ifNull: [
                    "$sentiment_score.neutral",
                    "$sentiment_scores.neutral",
                ],
            });
            const agentNegativePercentExpr = LiveCallRepository.buildSentimentComponentExpr({
                $ifNull: [
                    "$sentiment_score.negative",
                    "$sentiment_scores.negative",
                ],
            });
            const hasSentimentDataExpr = LiveCallRepository.buildHasSentimentDataExpr();
            const normalizedSentimentLabelExpr = {
                $toLower: {
                    $trim: {
                        input: {
                            $ifNull: [
                                {
                                    $convert: {
                                        input: "$sentiment",
                                        to: "string",
                                        onError: "",
                                        onNull: "",
                                    },
                                },
                                "",
                            ],
                        },
                    },
                },
            };
            const normalizedSentimentCategoryExpr = {
                $switch: {
                    branches: [
                        {
                            case: { $eq: [normalizedSentimentLabelExpr, "positive"] },
                            then: "positive",
                        },
                        {
                            case: { $eq: [normalizedSentimentLabelExpr, "neutral"] },
                            then: "neutral",
                        },
                        {
                            case: {
                                $eq: [normalizedSentimentLabelExpr, "negative"],
                            },
                            then: "negative",
                        },
                    ],
                    default: null,
                },
            };
            const hasClassifiedSentimentExpr = {
                $and: [
                    hasSentimentDataExpr,
                    { $ne: [normalizedSentimentCategoryExpr, null] },
                ],
            };
            const result = await LiveCallModel.aggregate([
                { $match: matchCondition },
                { $sort: { updated_at: -1, created_at: -1 } },
                {
                    $group: {
                        _id: {
                            agent_extension: "$agent_extension",
                            domain: "$domain",
                        },
                        today_calls: { $sum: 1 },
                        today_sentiment_calls: {
                            $sum: {
                                $cond: [
                                    hasClassifiedSentimentExpr,
                                    1,
                                    0,
                                ],
                            },
                        },
                        agent_extension: { $first: "$agent_extension" },
                        agent_name: { $first: "$agent_name" },
                        agent_status: { $first: "$agent_status" },
                        ai_agent_status: { $first: "$ai_agent_status" },
                        domain: { $first: "$domain" },
                        forward_name: { $first: "$forward_name" },
                        forward_type: { $first: "$forward_type" },
                        forward_value: { $first: "$forward_value" },
                        sentiment: { $first: "$sentiment" },
                        sentiment_score_count: {
                            $sum: {
                                $cond: [
                                    hasClassifiedSentimentExpr,
                                    1,
                                    0,
                                ],
                            },
                        },
                        sentiment_positive_sum: {
                            $sum: {
                                $cond: [
                                    hasClassifiedSentimentExpr,
                                    agentPositivePercentExpr,
                                    0,
                                ],
                            },
                        },
                        sentiment_neutral_sum: {
                            $sum: {
                                $cond: [
                                    hasClassifiedSentimentExpr,
                                    agentNeutralPercentExpr,
                                    0,
                                ],
                            },
                        },
                        sentiment_negative_sum: {
                            $sum: {
                                $cond: [
                                    hasClassifiedSentimentExpr,
                                    agentNegativePercentExpr,
                                    0,
                                ],
                            },
                        },
                        positive_sentiment_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            hasClassifiedSentimentExpr,
                                            { $eq: [normalizedSentimentCategoryExpr, "positive"] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        neutral_sentiment_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            hasClassifiedSentimentExpr,
                                            { $eq: [normalizedSentimentCategoryExpr, "neutral"] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        negative_sentiment_count: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            hasClassifiedSentimentExpr,
                                            { $eq: [normalizedSentimentCategoryExpr, "negative"] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        last_activity: {
                            $max: { $ifNull: ["$updated_at", "$created_at"] },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        today_calls: 1,
                        today_sentiment_calls: 1,
                        agent_name: 1,
                        agent_extension: 1,
                        agent_status: 1,
                        ai_agent_status: 1,
                        domain: 1,
                        forward_name: 1,
                        forward_type: 1,
                        forward_value: 1,
                        sentiment: 1,
                        positive_sentiment_count: 1,
                        neutral_sentiment_count: 1,
                        negative_sentiment_count: 1,
                        sentiment_scores: {
                            positive: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$sentiment_score_count", 0] },
                                            0,
                                            {
                                                $divide: [
                                                    "$sentiment_positive_sum",
                                                    "$sentiment_score_count",
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                            neutral: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$sentiment_score_count", 0] },
                                            0,
                                            {
                                                $divide: [
                                                    "$sentiment_neutral_sum",
                                                    "$sentiment_score_count",
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                            negative: {
                                $round: [
                                    {
                                        $cond: [
                                            { $eq: ["$sentiment_score_count", 0] },
                                            0,
                                            {
                                                $divide: [
                                                    "$sentiment_negative_sum",
                                                    "$sentiment_score_count",
                                                ],
                                            },
                                        ],
                                    },
                                    2,
                                ],
                            },
                        },
                        last_activity: 1,
                    },
                },
                { $sort: { agent_name: 1, agent_extension: 1 } },
            ]);
            const idleThreshold = now.clone().subtract(5, "minutes").toDate();
            const agentsRaw = (result ?? []).map((agent) => {
                const { sentiment: _rawSentiment, sentiment_scores: rawSentimentScores, positive_sentiment_count = 0, neutral_sentiment_count = 0, negative_sentiment_count = 0, ...agentRest } = agent;
                const sentimentScores = LiveCallRepository.normalizeSentimentScores(rawSentimentScores);
                const avg_sentiment = LiveCallRepository.calculateAvgSentiment(sentimentScores);
                const sentimentCountPercents = LiveCallRepository.calculateSentimentCountPercents({
                    positive: positive_sentiment_count,
                    neutral: neutral_sentiment_count,
                    negative: negative_sentiment_count,
                    total: agentRest?.today_sentiment_calls,
                });
                const sentiment = LiveCallRepository.calculateCombinedSentiment({
                    positive: positive_sentiment_count,
                    neutral: neutral_sentiment_count,
                    negative: negative_sentiment_count,
                    total: agentRest?.today_sentiment_calls,
                });
                return {
                    ...agentRest,
                    sentiment_label: sentiment,
                    avg_sentiment,
                    sentiment_counts: {
                        positive: Number(positive_sentiment_count ?? 0),
                        neutral: Number(neutral_sentiment_count ?? 0),
                        negative: Number(negative_sentiment_count ?? 0),
                        ...sentimentCountPercents,
                    },
                };
            });
            const agents = agentsRaw.filter((agent) => {
                const extension = agent?.agent_extension;
                const extensionValue = extension !== null && extension !== undefined ? String(extension).trim() : "";
                if (extensionValue.length > 4) {
                    return false;
                }
                return extensionValue.length > 0;
            });
            const sortedBySentiment = [...agents].sort((a, b) => (b.avg_sentiment ?? 0) - (a.avg_sentiment ?? 0));
            const agent_sentiment_top = sortedBySentiment.length
                ? {
                    agent_name: sortedBySentiment[0]?.agent_name ?? null,
                    agent_extension: sortedBySentiment[0]?.agent_extension ?? null,
                    avg_sentiment: sortedBySentiment[0]?.avg_sentiment ?? 0,
                }
                : null;
            const agent_sentiment_bottom = sortedBySentiment.length
                ? {
                    agent_name: sortedBySentiment[sortedBySentiment.length - 1]?.agent_name ??
                        null,
                    agent_extension: sortedBySentiment[sortedBySentiment.length - 1]
                        ?.agent_extension ?? null,
                    avg_sentiment: sortedBySentiment[sortedBySentiment.length - 1]?.avg_sentiment ??
                        0,
                }
                : null;
            const idle_over_5_minutes = agents
                .filter((agent) => agent?.last_activity &&
                new Date(agent.last_activity) < idleThreshold)
                .map((agent) => ({
                agent_name: agent?.agent_name ?? null,
                agent_extension: agent?.agent_extension ?? null,
            }));
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: [requestData?.socketId],
                emitter: "dash-campaign-ai-agent-data-response",
                payload: {
                    success: true,
                    data: {
                        message: "Success",
                        result: {
                            agents,
                            summary: {
                                agent_sentiment_top,
                                agent_sentiment_bottom,
                                idle_over_5_minutes,
                            },
                        },
                    },
                },
            });
            return {
                agents,
                summary: {
                    agent_sentiment_top,
                    agent_sentiment_bottom,
                    idle_over_5_minutes,
                },
            };
        }
        catch (error) {
            console.error("ERROR in campaignAiAgentData:", error);
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, `${error.message}`);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
}
exports.LiveCallRepository = LiveCallRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/LiveCallRepository.ts?
}