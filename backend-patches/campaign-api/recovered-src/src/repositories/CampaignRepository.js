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
exports.CampaignRepository = void 0;
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const redis_1 = __webpack_require__(/*! @/config/redis */ "./src/config/redis.ts");
const CommonHelper_1 = __importDefault(__webpack_require__(/*! @/helpers/CommonHelper */ "./src/helpers/CommonHelper.ts"));
const ICampaign_1 = __webpack_require__(/*! @/models/interfaces/ICampaign */ "./src/models/interfaces/ICampaign.ts");
const ICampaignNumber_1 = __webpack_require__(/*! @/models/interfaces/ICampaignNumber */ "./src/models/interfaces/ICampaignNumber.ts");
const NatsController_1 = __webpack_require__(/*! @/nats/NatsController */ "./src/nats/NatsController.ts");
const queues_1 = __webpack_require__(/*! @/queues */ "./src/queues/index.ts");
const jobOptions_1 = __webpack_require__(/*! @/queues/jobOptions */ "./src/queues/jobOptions.ts");
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const dayjs_1 = __importDefault(__webpack_require__(/*! dayjs */ "dayjs"));
const isBetween_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/isBetween */ "dayjs/plugin/isBetween"));
const timezone_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/timezone */ "dayjs/plugin/timezone"));
const utc_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/utc */ "dayjs/plugin/utc"));
const moment_1 = __importDefault(__webpack_require__(/*! moment */ "moment"));
__webpack_require__(/*! moment-timezone */ "moment-timezone");
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(isBetween_1.default);
class CampaignRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static REALTIME_RESERVATION_BATCH_SIZE = 3;
    static CAMPAIGN_LEAD_ASSIGNMENT_EMITTER = "campaign-leads-uploaded";
    static CAMPAIGN_ANALYTICS_UPDATED_EMITTER = "campaign-analytics-updated";
    static ANALYTICS_FRESHNESS_WINDOW_MS = 15000;
    static ACTIVE_RESERVATION_AGENT_STATUSES = new Set([
        "online",
        "busy",
    ]);
    static async getDncModel() {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        return mainDB.models.dnc_number;
    }
    static escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    static isRealtimeReservationDialMethod(dialMethod) {
        const normalizedDialMethod = String(dialMethod || "").toUpperCase();
        return ["PREVIEW", "PROGRESSIVE"].includes(normalizedDialMethod);
    }
    static getReservationExpiryDate() {
        const fixedReservationWindowSeconds = 120;
        return new Date(Date.now() + fixedReservationWindowSeconds * 1000);
    }
    static async isAgentEligibleForRealtimeReservations(campaignId, user_uuid, extension) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const UserSessionModel = mainDB.models.user_session;
        const CampaignEventLogModel = mainDB.models.campaign_event_logs;
        const userSession = await UserSessionModel.findOne({
            userUuid: String(user_uuid),
            ...(extension ? { extension: String(extension) } : {}),
        }, { online: 1, status: 1 }).lean();
        if (!userSession?.online) {
            return false;
        }
        const normalizedStatus = String(userSession?.status || "").toLowerCase();
        if (!this.ACTIVE_RESERVATION_AGENT_STATUSES.has(normalizedStatus)) {
            return false;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(campaignId)) {
            return false;
        }
        const campaignEventLog = await CampaignEventLogModel.findOne({
            "campaignDetail.campaignId": String(campaignId),
            userDetail: {
                $elemMatch: {
                    user_uuid: String(user_uuid),
                },
            },
        }, { _id: 1 }).lean();
        return Boolean(campaignEventLog?._id);
    }
    static async getActiveRealtimeReservationAgentCount(campaignId, companyUuid) {
        if (!mongoose_1.default.Types.ObjectId.isValid(campaignId)) {
            return 0;
        }
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignEventLogModel = mainDB.models.campaign_event_logs;
        const UserSessionModel = mainDB.models.user_session;
        const campaignEventLog = await CampaignEventLogModel.findOne({
            "campaignDetail.campaignId": String(campaignId),
        }, { userDetail: 1 }).lean();
        const activeCampaignUserIds = Array.from(new Set((Array.isArray(campaignEventLog?.userDetail)
            ? campaignEventLog.userDetail
            : [])
            .map((user) => String(user?.user_uuid || "").trim())
            .filter(Boolean)));
        if (!activeCampaignUserIds.length) {
            return 0;
        }
        return await UserSessionModel.countDocuments({
            companyUuid: String(companyUuid),
            userUuid: { $in: activeCampaignUserIds },
            online: true,
            status: { $in: Array.from(this.ACTIVE_RESERVATION_AGENT_STATUSES) },
        });
    }
    static getExpiredReservationMatch(now) {
        return [
            { reservedTo: null },
            { reservationExpiresAt: null },
            { reservationExpiresAt: { $lte: now } },
        ];
    }
    static async releaseLeadReservation(CampaignNumberModel, campaignNumberId) {
        if (!campaignNumberId || !mongoose_1.default.Types.ObjectId.isValid(campaignNumberId)) {
            return;
        }
        await CampaignNumberModel.updateOne({ _id: new mongoose_1.default.Types.ObjectId(campaignNumberId) }, {
            $set: {
                reservedTo: null,
                reservedAt: null,
                reservationExpiresAt: null,
            },
        });
    }
    static async reserveRealtimeLeadBuffer(requestData, userData, campaignDetail, desiredReservationCount = this.REALTIME_RESERVATION_BATCH_SIZE) {
        if (!this.isRealtimeReservationDialMethod(campaignDetail?.dialMethod)) {
            return;
        }
        const isAgentEligible = await this.isAgentEligibleForRealtimeReservations(requestData?.campaignId, String(userData?.user_uuid), userData?.extension);
        if (!isAgentEligible) {
            return;
        }
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const DncNumberModel = await this.getDncModel();
        const now = new Date();
        const campaignObjectId = new mongoose_1.default.Types.ObjectId(requestData.campaignId);
        const startExecutionEligibility = [
            { startExecutionDate: { $lte: now } },
            { startExecutionDate: null },
        ];
        const desiredCount = Math.max(Number(desiredReservationCount) || 0, this.REALTIME_RESERVATION_BATCH_SIZE);
        // Expired reservations should be released before we count or claim new rows.
        await CampaignNumberModel.updateMany({
            campaignId: campaignObjectId,
            reservedTo: { $ne: null },
            reservationExpiresAt: { $lte: now },
        }, {
            $set: {
                reservedTo: null,
                reservedAt: null,
                reservationExpiresAt: null,
            },
        });
        const activeReservationCount = await CampaignNumberModel.countDocuments({
            campaignId: campaignObjectId,
            company_uuid: String(userData?.company_uuid),
            reservedTo: String(userData?.user_uuid),
            reservationExpiresAt: { $gt: now },
        });
        const candidateMatch = {
            campaignId: campaignObjectId,
            company_uuid: String(userData?.company_uuid),
            requestStatus: { $in: ["SCHEDULED", "CALLBACK_SCHEDULED"] },
            isDnc: false,
            $and: [
                { $or: startExecutionEligibility },
                { $or: this.getExpiredReservationMatch(now) },
            ],
        };
        const [eligibleLeadCount, activeAgentCount] = await Promise.all([
            CampaignNumberModel.countDocuments(candidateMatch),
            this.getActiveRealtimeReservationAgentCount(requestData?.campaignId, String(userData?.company_uuid)),
        ]);
        const effectiveDesiredCount = eligibleLeadCount > 0 &&
            eligibleLeadCount <= this.REALTIME_RESERVATION_BATCH_SIZE &&
            activeAgentCount > 1
            ? 1
            : desiredCount;
        const effectiveDeficit = effectiveDesiredCount - activeReservationCount;
        if (effectiveDeficit <= 0) {
            return;
        }
        let claimedCount = 0;
        let candidateIndex = 0;
        const candidateBatchSize = Math.max(effectiveDeficit * 10, effectiveDesiredCount * 10, 20);
        let scannedCount = 0;
        // Scan a small ordered window of candidates, validate DNC just-in-time,
        // and stop as soon as we have enough reserved rows for the agent.
        while (claimedCount < effectiveDeficit) {
            const candidateLeads = await CampaignNumberModel.find(candidateMatch, {
                _id: 1,
                contactNumber: 1,
                startExecutionDate: 1,
                createdAt: 1,
            })
                .sort({ startExecutionDate: 1, createdAt: 1, _id: 1 })
                .skip(scannedCount)
                .limit(candidateBatchSize)
                .lean();
            if (!candidateLeads.length) {
                break;
            }
            for (const candidateLead of candidateLeads) {
                candidateIndex += 1;
                if (claimedCount >= effectiveDeficit) {
                    break;
                }
                try {
                    // DNC validation is intentionally per-candidate here so we avoid
                    // bulk-refreshing the whole pool on every request.
                    const isDnc = await this.isNumberInDnc(DncNumberModel, candidateLead?.contactNumber, userData?.company_uuid);
                    if (isDnc) {
                        // Persist the DNC flag for future reads and skip this lead.
                        await CampaignNumberModel.updateOne({ _id: candidateLead._id }, { $set: { isDnc: true } });
                        continue;
                    }
                    const reservationExpiresAt = this.getReservationExpiryDate();
                    // Claim the lead only if it is still eligible at update time.
                    const reservationResult = await CampaignNumberModel.updateOne({
                        _id: candidateLead._id,
                        campaignId: campaignObjectId,
                        company_uuid: String(userData?.company_uuid),
                        requestStatus: { $in: ["SCHEDULED", "CALLBACK_SCHEDULED"] },
                        isDnc: false,
                        $and: [
                            { $or: startExecutionEligibility },
                            { $or: this.getExpiredReservationMatch(now) },
                        ],
                    }, {
                        $set: {
                            assignedTo: String(userData?.user_uuid),
                            reservedTo: String(userData?.user_uuid),
                            reservedAt: now,
                            reservationExpiresAt,
                        },
                    });
                    if (!reservationResult?.modifiedCount) {
                        continue;
                    }
                    claimedCount += 1;
                }
                catch (error) {
                    throw error;
                }
            }
            scannedCount += candidateLeads.length;
            if (candidateLeads.length < candidateBatchSize) {
                break;
            }
        }
    }
    static async getReservedCampaignNumbersForUser(requestData, userData, limit) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const DncNumberModel = await this.getDncModel();
        const now = new Date();
        const campaignObjectId = new mongoose_1.default.Types.ObjectId(requestData.campaignId);
        await CampaignNumberModel.updateMany({
            campaignId: campaignObjectId,
            reservedTo: { $ne: null },
            reservationExpiresAt: { $lte: now },
        }, {
            $set: {
                reservedTo: null,
                reservedAt: null,
                reservationExpiresAt: null,
            },
        });
        const reservedRowsMatch = {
            campaignId: campaignObjectId,
            company_uuid: String(userData?.company_uuid),
            reservedTo: String(userData?.user_uuid),
            reservationExpiresAt: { $gt: now },
        };
        const reservedRows = await this.getNextNonDncReservedCampaignRows(CampaignNumberModel, DncNumberModel, userData?.company_uuid, reservedRowsMatch, limit);
        return reservedRows;
    }
    static getNextStartExecutionDate(dialerSetting, currentStartExecutionDate) {
        const retryPeriod = Number(dialerSetting?.default_retry_period || 0);
        const retryPeriodValue = Number.isFinite(retryPeriod) && retryPeriod > 0
            ? retryPeriod
            : 0;
        const retryPeriodType = String(dialerSetting?.default_retry_period_type || "min").toLowerCase();
        const currentDate = currentStartExecutionDate
            ? new Date(currentStartExecutionDate)
            : null;
        const now = new Date();
        const shouldUpdate = !currentDate ||
            Number.isNaN(currentDate.getTime()) ||
            currentDate <= now;
        if (!shouldUpdate) {
            return {
                shouldUpdate,
                nextStartExecutionDate: currentDate,
            };
        }
        const nextStartExecutionDate = (0, moment_1.default)();
        if (retryPeriodType === "hour") {
            nextStartExecutionDate.add(retryPeriodValue, "hours");
        }
        else if (retryPeriodType === "sec") {
            nextStartExecutionDate.add(retryPeriodValue, "seconds");
        }
        else {
            nextStartExecutionDate.add(retryPeriodValue, "minutes");
        }
        return {
            shouldUpdate,
            nextStartExecutionDate: nextStartExecutionDate.toDate(),
        };
    }
    static getDefaultRuntimeAnalytics() {
        return {
            assignedLeads: 0,
            dialedLeads: 0,
            answeredLeads: 0,
            pendingLeads: 0,
            totalCallRescheduled: 0,
            totalCallNotAnswered: 0,
            totalRetries: 0,
            retriedLeads: 0,
            totalDnc: 0,
            answeredPercentage: 0,
            pendingPercentage: 0,
            rescheduledPercentage: 0,
            notAnsweredPercentage: 0,
            retriesPercentage: 0,
            dncPercentage: 0,
        };
    }
    static async enqueueCampaignLeadAssignment(members, campaignId, isNewCampaign, userData) {
        if (!redis_1.isRedisEnabled || !queues_1.Queues.CAMPAIGN_LEAD_ASSIGNMENT) {
            return false;
        }
        await queues_1.Queues.CAMPAIGN_LEAD_ASSIGNMENT.add("process", {
            members,
            campaignId: campaignId.toString(),
            isNewCampaign,
            userData,
        }, jobOptions_1.defaultJobOptions);
        return true;
    }
    static async notifyCampaignLeadAssignmentCompletion(campaignId, userData, success, errorMessage) {
        try {
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const UserSessionModel = mainDB.models.user_session;
            const userSession = await UserSessionModel.findOne({
                userUuid: userData?.user_uuid,
                extension: userData?.extension,
            }).lean();
            const socketIds = Array.isArray(userSession?.socketId)
                ? userSession.socketId
                : userSession?.socketId
                    ? [userSession.socketId]
                    : [];
            if (!socketIds.length) {
                return;
            }
            await NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: socketIds,
                emitter: this.CAMPAIGN_LEAD_ASSIGNMENT_EMITTER,
                payload: {
                    campaignId,
                    success,
                    message: success
                        ? "Campaign leads uploaded successfully"
                        : "Campaign lead upload failed",
                    error: success ? null : errorMessage || "Lead assignment failed",
                },
            });
        }
        catch (error) {
            console.error("Campaign lead assignment notification failed:", error?.message || error);
        }
    }
    static async getOnlineCompanySocketIds(companyUuid) {
        if (!companyUuid) {
            return [];
        }
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const UserSessionModel = mainDB.models.user_session;
        const userSessions = await UserSessionModel.find({
            companyUuid: String(companyUuid),
            online: true,
        })
            .select("socketId -_id")
            .lean();
        return [...new Set(userSessions.flatMap((session) => Array.isArray(session?.socketId)
                ? session.socketId
                : session?.socketId
                    ? [session.socketId]
                    : []))];
    }
    static async notifyCampaignAnalyticsSyncCompletion(campaignId, userData) {
        try {
            const socketIds = await this.getOnlineCompanySocketIds(userData?.company_uuid);
            if (!socketIds.length) {
                return;
            }
            await NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: socketIds,
                emitter: this.CAMPAIGN_ANALYTICS_UPDATED_EMITTER,
                payload: {
                    campaignId,
                },
            });
        }
        catch (error) {
            console.error("Campaign analytics sync notification failed:", error?.message || error);
        }
    }
    static buildCampaignAnalyticsSyncJobId(campaignId) {
        return `campaign-analytics-sync-${campaignId}`;
    }
    static async enqueueCampaignAnalyticsSync(campaignId, userData, options) {
        if (!redis_1.isRedisEnabled || !queues_1.Queues.CAMPAIGN_ANALYTICS_SYNC) {
            return false;
        }
        await queues_1.Queues.CAMPAIGN_ANALYTICS_SYNC.add("process", {
            campaignId,
            userData,
            options: {
                refreshDncStatus: options?.refreshDncStatus !== false,
            },
        }, {
            ...jobOptions_1.defaultJobOptions,
            jobId: this.buildCampaignAnalyticsSyncJobId(campaignId),
        });
        return true;
    }
    static async reconcileCampaignDncStatus(campaignId, userData) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const DncNumberModel = await this.getDncModel();
        await this.refreshDncStatusForCampaignNumbers(tenantDB.models.campaign_number, DncNumberModel, userData?.company_uuid, {
            campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
            company_uuid: String(userData?.company_uuid),
        });
    }
    static async queueOrRunCampaignAnalyticsSync(campaignId, userData, options) {
        const queued = await this.enqueueCampaignAnalyticsSync(campaignId, userData, options);
        if (!queued) {
            await this.syncCampaignAnalyticsAndMembers(campaignId, userData, options);
            await this.notifyCampaignAnalyticsSyncCompletion(campaignId, userData);
        }
    }
    static async getStoredCampaignRuntimeAnalytics(campaignId, userData) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignModel = mainDB.models.campaign;
        const CampaignAnalyticsModel = mainDB.models.campaign_analytics;
        const campaign = await CampaignModel.findOne({
            _id: new mongoose_1.default.Types.ObjectId(campaignId),
            company_uuid: String(userData?.company_uuid),
        }).select({ _id: 1 }).lean();
        if (!campaign) {
            throw new HttpException_1.HttpException(422, "Campaign does not exist.");
        }
        const analytics = await CampaignAnalyticsModel.findOne({
            campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
            company_uuid: String(userData?.company_uuid),
        }).lean();
        if (!analytics) {
            return await this.syncCampaignAnalyticsAndMembers(campaignId, userData, { refreshDncStatus: true });
        }
        const analyticsUpdatedAt = analytics?.updatedAt
            ? new Date(analytics.updatedAt)
            : null;
        const analyticsAgeMs = analyticsUpdatedAt?.getTime?.()
            ? Date.now() - analyticsUpdatedAt.getTime()
            : Number.POSITIVE_INFINITY;
        const isAnalyticsFresh = Number.isFinite(analyticsAgeMs) &&
            analyticsAgeMs <= this.ANALYTICS_FRESHNESS_WINDOW_MS;
        if (!isAnalyticsFresh) {
            return await this.syncCampaignAnalyticsAndMembers(campaignId, userData, { refreshDncStatus: true });
        }
        return {
            assignedLeads: analytics?.assignedLeads || 0,
            dialedLeads: analytics?.dialedLeads || 0,
            answeredLeads: analytics?.answeredLeads || 0,
            pendingLeads: analytics?.pendingLeads || 0,
            totalCallRescheduled: analytics?.totalCallRescheduled || 0,
            totalCallNotAnswered: analytics?.totalCallNotAnswered || 0,
            totalCallDuration: analytics?.totalCallDuration || 0,
            totalRetries: analytics?.totalRetries || 0,
            retriedLeads: analytics?.retriedLeads || 0,
            totalDnc: analytics?.totalDnc || 0,
            answeredPercentage: analytics?.answeredPercentage || 0,
            pendingPercentage: analytics?.pendingPercentage || 0,
            rescheduledPercentage: analytics?.rescheduledPercentage || 0,
            notAnsweredPercentage: analytics?.notAnsweredPercentage || 0,
            retriesPercentage: analytics?.retriesPercentage || 0,
            dncPercentage: analytics?.dncPercentage || 0,
        };
    }
    static async validateAssignedLead(requestData, userData) {
        const { campaignId, campaignNumberId } = requestData;
        if (!mongoose_1.default.Types.ObjectId.isValid(campaignId) ||
            !mongoose_1.default.Types.ObjectId.isValid(campaignNumberId)) {
            throw new HttpException_1.HttpException(422, "Invalid campaignId or campaignNumberId");
        }
        const tenantDB = await this.getTenantDBFromUser(userData);
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const CampaignModel = mainDB.models.campaign;
        const now = new Date();
        const [campaignDetailResult, leadResult] = await Promise.all([
            CampaignModel.findById(new mongoose_1.default.Types.ObjectId(campaignId), { dialMethod: 1 }).lean(),
            CampaignNumberModel.findOne({
                _id: new mongoose_1.default.Types.ObjectId(campaignNumberId),
                campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
                company_uuid: String(userData?.company_uuid),
            }, {
                assignedTo: 1,
                reservedTo: 1,
                reservationExpiresAt: 1,
                requestStatus: 1,
                isDnc: 1,
            }).lean(),
        ]);
        const campaignDetail = campaignDetailResult;
        const lead = leadResult;
        if (!campaignDetail) {
            return {
                valid: false,
                code: "CAMPAIGN_NOT_FOUND",
                message: "This campaign is no longer available. Please refresh and try again.",
                shouldRefresh: true,
            };
        }
        if (!lead) {
            return {
                valid: false,
                code: "LEAD_NOT_FOUND",
                message: "This lead is no longer available. Please refresh to get the latest lead.",
                shouldRefresh: true,
            };
        }
        if (lead?.isDnc) {
            return {
                valid: false,
                code: "LEAD_DNC",
                message: "This lead is marked as DNC and cannot be called. Please refresh to continue.",
                shouldRefresh: true,
            };
        }
        const currentUserId = String(userData?.user_uuid || "");
        const assignedTo = String(lead?.assignedTo || "");
        const reservedTo = String(lead?.reservedTo || "");
        const requestStatus = String(lead?.requestStatus || "").toUpperCase();
        const terminalStatuses = new Set([
            "COMPLETED",
            "ATTEMPT_LIMIT_EXHAUSTED",
            "CANCELLED",
            "ERROR",
        ]);
        if (terminalStatuses.has(requestStatus)) {
            return {
                valid: false,
                code: "LEAD_UNAVAILABLE",
                message: "This lead is no longer available for calling. Please refresh to continue.",
                shouldRefresh: true,
            };
        }
        if (assignedTo && assignedTo !== currentUserId) {
            return {
                valid: false,
                code: "LEAD_ASSIGNED_TO_ANOTHER_AGENT",
                message: "This lead has already been assigned to another agent. Please refresh to get the latest lead.",
                shouldRefresh: true,
            };
        }
        const isRealtimeReservationLead = this.isRealtimeReservationDialMethod(campaignDetail?.dialMethod);
        if (isRealtimeReservationLead) {
            if (reservedTo && reservedTo !== currentUserId) {
                return {
                    valid: false,
                    code: "LEAD_RESERVED_TO_ANOTHER_AGENT",
                    message: "This lead is currently reserved by another agent. Please refresh to continue.",
                    shouldRefresh: true,
                };
            }
            const reservationExpiresAt = lead?.reservationExpiresAt
                ? new Date(lead.reservationExpiresAt)
                : null;
            const reservationExpired = !reservationExpiresAt || reservationExpiresAt <= now;
            if (reservationExpired) {
                return {
                    valid: false,
                    code: "LEAD_RESERVATION_EXPIRED",
                    message: "This lead is no longer active on your screen. Please refresh to get the latest lead.",
                    shouldRefresh: true,
                };
            }
        }
        return {
            valid: true,
            code: "LEAD_VALID",
            message: "Lead assignment is valid.",
            shouldRefresh: false,
        };
    }
    static getDefaultMemberRuntimeAnalytics() {
        return {
            assignedLeads: 0,
            dialedLeads: 0,
            answeredLeads: 0,
            pendingLeads: 0,
            totalCallRescheduled: 0,
            totalCallNotAnswered: 0,
            totalRetries: 0,
            retriedLeads: 0,
            totalDnc: 0,
            dialedPercentage: 0,
            answeredPercentage: 0,
            pendingPercentage: 0,
            rescheduledPercentage: 0,
            notAnsweredPercentage: 0,
            retriesPercentage: 0,
            dncPercentage: 0,
        };
    }
    static async computeMemberCampaignRuntimeAnalytics(campaignIds, userData) {
        const validCampaignIds = campaignIds
            .map((campaignId) => String(campaignId))
            .filter((campaignId) => mongoose_1.default.Types.ObjectId.isValid(campaignId))
            .map((campaignId) => new mongoose_1.default.Types.ObjectId(campaignId));
        if (!validCampaignIds.length) {
            return new Map();
        }
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const companyId = String(userData.company_uuid);
        const userId = String(userData.user_uuid);
        const memberAnalytics = await CampaignNumberModel.aggregate([
            {
                $match: {
                    campaignId: { $in: validCampaignIds },
                    company_uuid: companyId,
                    assignedTo: userId,
                },
            },
            {
                $group: {
                    _id: {
                        campaignId: "$campaignId",
                        contactId: "$contactId",
                    },
                    totalCallAttempts: { $max: { $ifNull: ["$totalCallAttempts", 0] } },
                    isAnswered: {
                        $max: {
                            $cond: [{ $eq: ["$systemDisposition", "ANSWERED"] }, 1, 0],
                        },
                    },
                    isRescheduled: {
                        $max: {
                            $cond: [{ $eq: ["$requestStatus", "CALLBACK_SCHEDULED"] }, 1, 0],
                        },
                    },
                    isDnc: {
                        $max: {
                            $cond: [{ $eq: ["$isDnc", true] }, 1, 0],
                        },
                    },
                    isPending: {
                        $max: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $ifNull: ["$totalCallAttempts", 0] }, 0] },
                                        { $eq: ["$isDnc", false] },
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
                $addFields: {
                    isDialed: {
                        $cond: [{ $gt: ["$totalCallAttempts", 0] }, 1, 0],
                    },
                    retriedLead: {
                        $cond: [{ $gt: ["$totalCallAttempts", 1] }, 1, 0],
                    },
                    retryAttempts: {
                        $cond: [
                            { $gt: ["$totalCallAttempts", 1] },
                            { $subtract: ["$totalCallAttempts", 1] },
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: "$_id.campaignId",
                    assignedLeads: { $sum: 1 },
                    dialedLeads: { $sum: "$isDialed" },
                    answeredLeads: { $sum: "$isAnswered" },
                    pendingLeads: { $sum: "$isPending" },
                    totalCallRescheduled: { $sum: "$isRescheduled" },
                    totalDnc: { $sum: "$isDnc" },
                    totalRetries: { $sum: "$retryAttempts" },
                    retriedLeads: { $sum: "$retriedLead" },
                },
            },
            {
                $addFields: {
                    totalCallNotAnswered: {
                        $max: [
                            {
                                $subtract: [
                                    "$assignedLeads",
                                    { $add: ["$answeredLeads", "$pendingLeads", "$totalDnc"] },
                                ],
                            },
                            0,
                        ],
                    },
                    dialedPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$dialedLeads", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    answeredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$answeredLeads", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    pendingPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$pendingLeads", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    rescheduledPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$totalCallRescheduled", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    notAnsweredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$totalCallNotAnswered", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    retriesPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$retriedLeads", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                    dncPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$totalDnc", "$assignedLeads"] }, 100] }, 2] },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    campaignId: "$_id",
                    assignedLeads: 1,
                    dialedLeads: 1,
                    answeredLeads: 1,
                    pendingLeads: 1,
                    totalCallRescheduled: 1,
                    totalCallNotAnswered: 1,
                    totalRetries: 1,
                    retriedLeads: 1,
                    totalDnc: 1,
                    dialedPercentage: 1,
                    answeredPercentage: 1,
                    pendingPercentage: 1,
                    rescheduledPercentage: 1,
                    notAnsweredPercentage: 1,
                    retriesPercentage: 1,
                    dncPercentage: 1,
                },
            },
        ]);
        return new Map(memberAnalytics.map((item) => [
            item.campaignId.toString(),
            {
                assignedLeads: item.assignedLeads || 0,
                dialedLeads: item.dialedLeads || 0,
                answeredLeads: item.answeredLeads || 0,
                pendingLeads: item.pendingLeads || 0,
                totalCallRescheduled: item.totalCallRescheduled || 0,
                totalCallNotAnswered: item.totalCallNotAnswered || 0,
                totalRetries: item.totalRetries || 0,
                retriedLeads: item.retriedLeads || 0,
                totalDnc: item.totalDnc || 0,
                dialedPercentage: item.dialedPercentage || 0,
                answeredPercentage: item.answeredPercentage || 0,
                pendingPercentage: item.pendingPercentage || 0,
                rescheduledPercentage: item.rescheduledPercentage || 0,
                notAnsweredPercentage: item.notAnsweredPercentage || 0,
                retriesPercentage: item.retriesPercentage || 0,
                dncPercentage: item.dncPercentage || 0,
            },
        ]));
    }
    static async computeCampaignRuntimeAnalytics(campaignId, userData) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignModel = mainDB.models.campaign;
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const campaignObjectId = new mongoose_1.default.Types.ObjectId(campaignId);
        const companyId = String(userData.company_uuid);
        const campaignExists = await CampaignModel.findOne({
            _id: campaignObjectId,
            company_uuid: companyId,
        }, { _id: 1, dialMethod: 1, company_uuid: 1, members: 1 }).lean();
        if (!campaignExists) {
            throw new HttpException_1.HttpException(404, "Campaign does not exist.");
        }
        const [analytics] = await CampaignNumberModel.aggregate([
            {
                $match: {
                    campaignId: campaignObjectId,
                    company_uuid: companyId,
                },
            },
            {
                $group: {
                    _id: "$contactId",
                    totalCallAttempts: { $max: { $ifNull: ["$totalCallAttempts", 0] } },
                    isAnswered: {
                        $max: {
                            $cond: [{ $eq: ["$systemDisposition", "ANSWERED"] }, 1, 0],
                        },
                    },
                    isRescheduled: {
                        $max: {
                            $cond: [{ $eq: ["$requestStatus", "CALLBACK_SCHEDULED"] }, 1, 0],
                        },
                    },
                    isDnc: {
                        $max: {
                            $cond: [{ $eq: ["$isDnc", true] }, 1, 0],
                        },
                    },
                    isPending: {
                        $max: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $ifNull: ["$totalCallAttempts", 0] }, 0] },
                                        { $eq: ["$isDnc", false] },
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
                $addFields: {
                    isDialed: {
                        $cond: [{ $gt: ["$totalCallAttempts", 0] }, 1, 0],
                    },
                    retriedLead: {
                        $cond: [{ $gt: ["$totalCallAttempts", 1] }, 1, 0],
                    },
                    retryAttempts: {
                        $cond: [
                            { $gt: ["$totalCallAttempts", 1] },
                            { $subtract: ["$totalCallAttempts", 1] },
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    assignedLeads: { $sum: 1 },
                    dialedLeads: { $sum: "$isDialed" },
                    answeredLeads: { $sum: "$isAnswered" },
                    pendingLeads: { $sum: "$isPending" },
                    totalCallRescheduled: { $sum: "$isRescheduled" },
                    totalDnc: { $sum: "$isDnc" },
                    totalRetries: { $sum: "$retryAttempts" },
                    retriedLeads: { $sum: "$retriedLead" },
                },
            },
            {
                $addFields: {
                    totalCallNotAnswered: {
                        $max: [
                            {
                                $subtract: [
                                    "$assignedLeads",
                                    { $add: ["$answeredLeads", "$pendingLeads", "$totalDnc"] },
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $addFields: {
                    answeredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$answeredLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    pendingPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$pendingLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    rescheduledPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: ["$totalCallRescheduled", "$assignedLeads"],
                                            },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    notAnsweredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: ["$totalCallNotAnswered", "$assignedLeads"],
                                            },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    retriesPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$retriedLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    dncPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$totalDnc", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    assignedLeads: 1,
                    dialedLeads: 1,
                    answeredLeads: 1,
                    pendingLeads: 1,
                    totalCallRescheduled: 1,
                    totalCallNotAnswered: 1,
                    totalRetries: 1,
                    retriedLeads: 1,
                    totalDnc: 1,
                    answeredPercentage: 1,
                    pendingPercentage: 1,
                    rescheduledPercentage: 1,
                    notAnsweredPercentage: 1,
                    retriesPercentage: 1,
                    dncPercentage: 1,
                },
            },
        ]);
        return {
            analytics: analytics || this.getDefaultRuntimeAnalytics(),
            campaign: campaignExists,
        };
    }
    static async syncCampaignAnalyticsModel(campaignId, userData) {
        const { analytics, campaign } = await this.computeCampaignRuntimeAnalytics(campaignId, userData);
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignAnalyticsModel = mainDB.models.campaign_analytics;
        await CampaignAnalyticsModel.updateOne({
            campaignId: campaign._id,
            company_uuid: campaign.company_uuid,
        }, {
            $set: {
                type: campaign.dialMethod,
                assignedLeads: analytics.assignedLeads,
                dialedLeads: analytics.dialedLeads,
                answeredLeads: analytics.answeredLeads,
                pendingLeads: analytics.pendingLeads,
                totalCallRescheduled: analytics.totalCallRescheduled,
                totalCallNotAnswered: analytics.totalCallNotAnswered,
                totalCallDuration: 0,
                totalRetries: analytics.totalRetries,
                retriedLeads: analytics.retriedLeads,
                totalDnc: analytics.totalDnc,
                answeredPercentage: analytics.answeredPercentage,
                pendingPercentage: analytics.pendingPercentage,
                rescheduledPercentage: analytics.rescheduledPercentage,
                notAnsweredPercentage: analytics.notAnsweredPercentage,
                retriesPercentage: analytics.retriesPercentage,
                dncPercentage: analytics.dncPercentage,
            },
        }, { upsert: true });
        return analytics;
    }
    static async syncCampaignMemberAnalyticsModel(campaignId, userData) {
        const { campaign } = await this.computeCampaignRuntimeAnalytics(campaignId, userData);
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignMemberAnalyticsModel = mainDB.models.campaign_member_analytics;
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const campaignObjectId = new mongoose_1.default.Types.ObjectId(campaignId);
        const companyId = String(userData.company_uuid);
        const memberIds = Array.isArray(campaign?.members)
            ? campaign.members
                .map((member) => typeof member === "string" ? member : member?.user_uuid)
                .map((memberId) => memberId?.toString?.().trim())
                .filter((memberId) => Boolean(memberId))
            : [];
        const memberAnalytics = await CampaignNumberModel.aggregate([
            {
                $match: {
                    campaignId: campaignObjectId,
                    company_uuid: companyId,
                    assignedTo: { $ne: null },
                },
            },
            {
                $group: {
                    _id: {
                        user_uuid: "$assignedTo",
                        contactId: "$contactId",
                    },
                    totalCallAttempts: { $max: { $ifNull: ["$totalCallAttempts", 0] } },
                    isAnswered: {
                        $max: {
                            $cond: [{ $eq: ["$systemDisposition", "ANSWERED"] }, 1, 0],
                        },
                    },
                    isRescheduled: {
                        $max: {
                            $cond: [{ $eq: ["$requestStatus", "CALLBACK_SCHEDULED"] }, 1, 0],
                        },
                    },
                    isDnc: {
                        $max: {
                            $cond: [{ $eq: ["$isDnc", true] }, 1, 0],
                        },
                    },
                    isPending: {
                        $max: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $ifNull: ["$totalCallAttempts", 0] }, 0] },
                                        { $eq: ["$isDnc", false] },
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
                $addFields: {
                    isDialed: {
                        $cond: [{ $gt: ["$totalCallAttempts", 0] }, 1, 0],
                    },
                    retriedLead: {
                        $cond: [{ $gt: ["$totalCallAttempts", 1] }, 1, 0],
                    },
                    retryAttempts: {
                        $cond: [
                            { $gt: ["$totalCallAttempts", 1] },
                            { $subtract: ["$totalCallAttempts", 1] },
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: "$_id.user_uuid",
                    assignedLeads: { $sum: 1 },
                    dialedLeads: { $sum: "$isDialed" },
                    answeredLeads: { $sum: "$isAnswered" },
                    pendingLeads: { $sum: "$isPending" },
                    totalCallRescheduled: { $sum: "$isRescheduled" },
                    totalDnc: { $sum: "$isDnc" },
                    totalRetries: { $sum: "$retryAttempts" },
                    retriedLeads: { $sum: "$retriedLead" },
                },
            },
            {
                $addFields: {
                    totalCallNotAnswered: {
                        $max: [
                            {
                                $subtract: [
                                    "$assignedLeads",
                                    { $add: ["$answeredLeads", "$pendingLeads", "$totalDnc"] },
                                ],
                            },
                            0,
                        ],
                    },
                    dialedPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$dialedLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    answeredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$answeredLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    pendingPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$pendingLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    rescheduledPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: ["$totalCallRescheduled", "$assignedLeads"],
                                            },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    notAnsweredPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: ["$totalCallNotAnswered", "$assignedLeads"],
                                            },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    retriesPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$retriedLeads", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                    dncPercentage: {
                        $cond: [
                            { $gt: ["$assignedLeads", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$totalDnc", "$assignedLeads"] },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    user_uuid: "$_id",
                    assignedLeads: 1,
                    dialedLeads: 1,
                    answeredLeads: 1,
                    pendingLeads: 1,
                    totalCallRescheduled: 1,
                    totalCallNotAnswered: 1,
                    totalCallDuration: { $literal: 0 },
                    totalRetries: 1,
                    retriedLeads: 1,
                    totalDnc: 1,
                    dialedPercentage: 1,
                    answeredPercentage: 1,
                    pendingPercentage: 1,
                    rescheduledPercentage: 1,
                    notAnsweredPercentage: 1,
                    retriesPercentage: 1,
                    dncPercentage: 1,
                },
            },
        ]);
        const analyticsMap = new Map(memberAnalytics.map((item) => [item.user_uuid?.toString(), item]));
        const activeReservations = this.isRealtimeReservationDialMethod(campaign?.dialMethod)
            ? await CampaignNumberModel.aggregate([
                {
                    $match: {
                        campaignId: campaignObjectId,
                        company_uuid: companyId,
                        reservedTo: { $ne: null },
                        reservationExpiresAt: { $gt: new Date() },
                    },
                },
                {
                    $group: {
                        _id: "$reservedTo",
                        assignedLeads: { $sum: 1 },
                    },
                },
            ])
            : [];
        const reservationCountMap = new Map(activeReservations.map((item) => [
            String(item?._id),
            Number(item?.assignedLeads || 0),
        ]));
        const bulkOps = memberIds.map((memberId) => {
            const item = analyticsMap.get(memberId);
            const assignedLeads = this.isRealtimeReservationDialMethod(campaign?.dialMethod)
                ? reservationCountMap.get(memberId) || 0
                : item?.assignedLeads || 0;
            return {
                updateOne: {
                    filter: {
                        campaignId: campaignObjectId,
                        company_uuid: companyId,
                        user_uuid: String(memberId),
                    },
                    update: {
                        $set: {
                            type: campaign.dialMethod,
                            assignedLeads,
                            dialedLeads: item?.dialedLeads || 0,
                            answeredLeads: item?.answeredLeads || 0,
                            pendingLeads: item?.pendingLeads || 0,
                            totalCallRescheduled: item?.totalCallRescheduled || 0,
                            totalCallNotAnswered: item?.totalCallNotAnswered || 0,
                            totalCallDuration: 0,
                            totalRetries: item?.totalRetries || 0,
                            retriedLeads: item?.retriedLeads || 0,
                            totalDnc: item?.totalDnc || 0,
                            dialedPercentage: item?.dialedPercentage || 0,
                            answeredPercentage: item?.answeredPercentage || 0,
                            pendingPercentage: item?.pendingPercentage || 0,
                            rescheduledPercentage: item?.rescheduledPercentage || 0,
                            notAnsweredPercentage: item?.notAnsweredPercentage || 0,
                            retriesPercentage: item?.retriesPercentage || 0,
                            dncPercentage: item?.dncPercentage || 0,
                        },
                    },
                    upsert: true,
                },
            };
        });
        if (bulkOps.length) {
            await CampaignMemberAnalyticsModel.bulkWrite(bulkOps);
        }
        await CampaignMemberAnalyticsModel.deleteMany({
            campaignId: campaignObjectId,
            company_uuid: companyId,
            user_uuid: {
                $nin: memberIds,
            },
        });
    }
    static async syncCampaignAnalyticsAndMembers(campaignId, userData, options) {
        const shouldRefreshDncStatus = options?.refreshDncStatus !== false;
        if (shouldRefreshDncStatus) {
            await this.reconcileCampaignDncStatus(campaignId, userData);
        }
        const analytics = await this.syncCampaignAnalyticsModel(campaignId, userData);
        await this.syncCampaignMemberAnalyticsModel(campaignId, userData);
        return analytics;
    }
    static buildDncCompanyScope(companyUuid) {
        const companyScope = [{ company_uuid: null }];
        if (!companyUuid) {
            return companyScope;
        }
        companyScope.push({ company_uuid: String(companyUuid) });
        return companyScope;
    }
    static async isNumberInDnc(DncNumberModel, phone, companyUuid) {
        const normalizedPhone = await CommonHelper_1.default.normalizePhone(phone || "");
        if (!normalizedPhone) {
            return false;
        }
        const separatorTolerantSuffix = normalizedPhone.split("").join("\\D*");
        const dncEntry = await DncNumberModel.findOne({
            phone: { $regex: new RegExp(`${separatorTolerantSuffix}$`) },
            $or: this.buildDncCompanyScope(companyUuid),
        }).lean();
        return Boolean(dncEntry);
    }
    static async getScopedDncNormalizedPhoneSet(DncNumberModel, companyUuid) {
        const dncEntries = await DncNumberModel.find({
            $or: this.buildDncCompanyScope(companyUuid),
        }, {
            phone: 1,
        }).lean();
        const normalizedPhoneSet = new Set();
        for (const entry of dncEntries) {
            const normalizedPhone = CommonHelper_1.default.normalizePhoneForDuplicateCheck(entry?.phone || "");
            if (normalizedPhone) {
                normalizedPhoneSet.add(normalizedPhone);
            }
        }
        return normalizedPhoneSet;
    }
    static async getNextNonDncAssignedCampaignRows(CampaignNumberModel, DncNumberModel, companyUuid, assignmentMatch, assignmentSortObj, page, limit) {
        const rows = [];
        const batchSize = Math.max(limit * 10, 20);
        const validOffset = Math.max((page - 1) * limit, 0);
        let scannedCount = 0;
        let validRowCount = 0;
        while (true) {
            const candidateBatch = await CampaignNumberModel.aggregate([
                {
                    $match: assignmentMatch,
                },
                {
                    $addFields: {
                        startExecutionDateNullFirst: {
                            $cond: [{ $eq: ["$startExecutionDate", null] }, 0, 1],
                        },
                    },
                },
                { $sort: assignmentSortObj },
                { $skip: scannedCount },
                { $limit: batchSize },
                { $project: { startExecutionDateNullFirst: 0 } },
            ]);
            if (!candidateBatch.length) {
                break;
            }
            for (const candidateRow of candidateBatch) {
                const isDnc = await this.isNumberInDnc(DncNumberModel, candidateRow?.contactNumber, companyUuid);
                if (isDnc) {
                    await CampaignNumberModel.updateOne({ _id: candidateRow?._id }, { $set: { isDnc: true } });
                    continue;
                }
                if (validRowCount >= validOffset && rows.length < limit) {
                    rows.push(candidateRow);
                }
                validRowCount += 1;
            }
            scannedCount += candidateBatch.length;
            if (candidateBatch.length < batchSize) {
                break;
            }
        }
        return {
            rows,
            total: validRowCount,
        };
    }
    static async getNextNonDncReservedCampaignRows(CampaignNumberModel, DncNumberModel, companyUuid, reservedRowsMatch, limit) {
        const rows = [];
        const batchSize = Math.max(limit * 10, 20);
        let scannedCount = 0;
        while (rows.length < limit) {
            const candidateBatch = await CampaignNumberModel.find(reservedRowsMatch)
                .sort({ reservedAt: 1, _id: 1 })
                .skip(scannedCount)
                .limit(batchSize)
                .lean();
            if (!candidateBatch.length) {
                break;
            }
            for (const candidateRow of candidateBatch) {
                const isDnc = await this.isNumberInDnc(DncNumberModel, candidateRow?.contactNumber, companyUuid);
                if (isDnc) {
                    await CampaignNumberModel.updateOne({ _id: candidateRow?._id }, {
                        $set: {
                            isDnc: true,
                            reservedTo: null,
                            reservedAt: null,
                            reservationExpiresAt: null,
                        },
                    });
                    continue;
                }
                rows.push(candidateRow);
                if (rows.length >= limit) {
                    break;
                }
            }
            scannedCount += candidateBatch.length;
            if (candidateBatch.length < batchSize) {
                break;
            }
        }
        return rows;
    }
    static async refreshDncStatusForCampaignNumbers(CampaignNumberModel, DncNumberModel, companyUuid, matchFilter) {
        const assignedNumbers = await CampaignNumberModel.find(matchFilter, {
            _id: 1,
            contactNumber: 1,
        }).lean();
        const dncNormalizedPhoneSet = await this.getScopedDncNormalizedPhoneSet(DncNumberModel, companyUuid);
        const dncCampaignNumberIds = [];
        const nonDncCampaignNumberIds = [];
        let assignmentIndex = 0;
        for (const assignment of assignedNumbers) {
            assignmentIndex += 1;
            const normalizedAssignmentPhone = CommonHelper_1.default.normalizePhoneForDuplicateCheck(assignment?.contactNumber || "");
            const isDnc = normalizedAssignmentPhone &&
                dncNormalizedPhoneSet.has(normalizedAssignmentPhone);
            const assignmentId = assignment?._id?.toString?.();
            if (assignmentId && mongoose_1.default.Types.ObjectId.isValid(assignmentId)) {
                const normalizedAssignmentId = new mongoose_1.default.Types.ObjectId(assignmentId);
                if (isDnc) {
                    dncCampaignNumberIds.push(normalizedAssignmentId);
                }
                else {
                    nonDncCampaignNumberIds.push(normalizedAssignmentId);
                }
            }
        }
        if (dncCampaignNumberIds.length) {
            await CampaignNumberModel.updateMany({ _id: { $in: dncCampaignNumberIds } }, { $set: { isDnc: true } });
        }
        if (nonDncCampaignNumberIds.length) {
            await CampaignNumberModel.updateMany({ _id: { $in: nonDncCampaignNumberIds } }, { $set: { isDnc: false } });
        }
        return dncCampaignNumberIds;
    }
    static async campaignList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const filterDateFrom = String(requestData?.filter_date?.from || "").trim();
            const filterDateTo = String(requestData?.filter_date?.to || "").trim();
            const filterTimezone = String(requestData?.timezone || "").trim();
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc ? -1 : 1;
            const skip = (page - 1) * limit;
            const andConditions = [];
            // 1. Precise Match Stage
            const matchStage = {
                company_uuid: String(userData?.company_uuid),
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { dialMethod: { $regex: search, $options: "i" } },
                    { campaignStatus: { $regex: search, $options: "i" } },
                ];
            }
            // filter
            for (let filter of filters) {
                if (filter.key === "dialMethod") {
                    matchStage["dialMethod"] = { $regex: filter.value, $options: "i" };
                }
                if (filter.key === "campaignStatus") {
                    matchStage["campaignStatus"] = {
                        $regex: filter.value,
                        $options: "i",
                    };
                }
                if (filter.key === "createdById") {
                    matchStage["createdById"] = String(filter.value);
                }
                if (filter.key === "createdByName") {
                    matchStage["createdByName"] = { $regex: String(filter.value), $options: "i" };
                }
            }
            if (filterDateFrom || filterDateTo || filterTimezone) {
                const rangeStart = moment_1.default.tz(filterDateFrom, filterTimezone);
                const rangeEnd = moment_1.default.tz(filterDateTo, filterTimezone);
                if (!filterDateFrom ||
                    !filterDateTo ||
                    !filterTimezone ||
                    !moment_1.default.tz.zone(filterTimezone) ||
                    !rangeStart.isValid() ||
                    !rangeEnd.isValid()) {
                    throw new HttpException_1.HttpException(422, "filter_date and timezone should contain valid from, to and timezone values.");
                }
                if (rangeStart.isAfter(rangeEnd)) {
                    throw new HttpException_1.HttpException(422, "filter_date.from cannot be later than filter_date.to.");
                }
                andConditions.push({
                    startDate: { $lte: rangeEnd.clone().endOf("day").toDate() },
                });
                andConditions.push({
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: rangeStart.clone().startOf("day").toDate() } },
                    ],
                });
            }
            if (andConditions.length) {
                matchStage.$and = [...(Array.isArray(matchStage.$and) ? matchStage.$and : []), ...andConditions];
            }
            const pipeline = [
                { $match: matchStage },
                { $sort: { [sortKey]: sortOrder } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "campaign_analytics",
                        localField: "_id",
                        foreignField: "campaignId",
                        as: "campaignAnalytics",
                    },
                },
                {
                    $addFields: {
                        campaignAnalytics: { $arrayElemAt: ["$campaignAnalytics", 0] },
                        campaignAnalyticsStatus: {
                            $cond: [
                                { $gt: [{ $size: "$campaignAnalytics" }, 0] },
                                "READY",
                                "PENDING",
                            ],
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        queue: 1,
                        campaignType: 1,
                        campaignStatus: 1,
                        siteId: 1,
                        createdById: 1,
                        createdByName: 1,
                        members: 1,
                        timezone: 1,
                        script: 1,
                        groupId: 1,
                        callerId: 1,
                        startDate: 1,
                        endDate: 1,
                        dialMethod: 1,
                        settings: 1,
                        createdAt: 1,
                        campaignAnalyticsStatus: 1,
                        "campaignAnalytics.assignedLeads": 1,
                        "campaignAnalytics.dialedLeads": 1,
                        "campaignAnalytics.answeredLeads": 1,
                        "campaignAnalytics.pendingLeads": 1,
                        "campaignAnalytics.totalCallRescheduled": 1,
                        "campaignAnalytics.totalCallNotAnswered": 1,
                        "campaignAnalytics.totalRetries": 1,
                        "campaignAnalytics.retriedLeads": 1,
                        "campaignAnalytics.totalDnc": 1,
                        "campaignAnalytics.answeredPercentage": 1,
                        "campaignAnalytics.pendingPercentage": 1,
                        "campaignAnalytics.rescheduledPercentage": 1,
                        "campaignAnalytics.notAnsweredPercentage": 1,
                        "campaignAnalytics.retriesPercentage": 1,
                        "campaignAnalytics.dncPercentage": 1,
                    },
                },
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const CampaignAnalyticsModel = mainDB.models.campaign_analytics;
            const [rows, total] = await Promise.all([
                CampaignModel.aggregate(pipeline),
                CampaignModel.countDocuments(matchStage),
            ]);
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
    static async campaignGlobalSearch(requestData, userData) {
        try {
            const limit = Number(requestData?.limit) || 2;
            const searchText = requestData?.searchText?.toString().trim() || "";
            const matchStage = {
                company_uuid: new mongoose_1.default.Types.ObjectId(userData.company_uuid),
            };
            if (searchText) {
                const search = this.escapeRegex(searchText);
                matchStage.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { campaignStatus: { $regex: search, $options: "i" } },
                    { campaignType: { $regex: search, $options: "i" } },
                    { createdByName: { $regex: search, $options: "i" } },
                    { dialMethod: { $regex: search, $options: "i" } },
                ];
            }
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const rows = await CampaignModel.find(matchStage)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select({
                _id: 1,
                name: 1,
                campaignStatus: 1,
                campaignType: 1,
                createdByName: 1,
                members: 1,
                dialMethod: 1,
                dialerSetting: 1,
            })
                .lean();
            return { rows };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, error.message);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async campaignUpsert(requestData, userData) {
        try {
            const { campaignId, campaignType, name, siteId, timezone, startDate, endDate, contactId, groupId, members, rotateCallerId, allowSkipping, agentScripting, dialMethod, callerId, agentDisposition, script, description, dialerSetting, settings, } = requestData;
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignNumberModel = tenantDB.models.campaign;
            const ContactModel = tenantDB.models.contact;
            const CampaignModel = mainDB.models.campaign;
            const CampaignAnalyticsModel = mainDB.models.campaign_analytics;
            const CampaignMemberAnalyticsModel = mainDB.models.campaign_member_analytics;
            const QueueModel = mainDB.models.queues;
            const QueueAgentModel = mainDB.models.Agent;
            const QueueTierModel = mainDB.models.Tier;
            const { company_uuid } = userData;
            let queueUuid;
            let queue_extension;
            let queue_name;
            let domain = userData?.domain;
            const campaignMembers = members;
            let extension = await CommonHelper_1.default.generateRandomExtension(userData?.company_uuid, campaignId);
            if (dialMethod === 'PREDICTIVE') {
                if (!Array.isArray(campaignMembers)) {
                    throw new HttpException_1.HttpException(422, "members must be an array for predictive campaign.");
                }
                const memberWithoutExtension = campaignMembers.find((member) => !member?.extension);
                if (memberWithoutExtension) {
                    throw new HttpException_1.HttpException(422, "Each predictive campaign member must have an extension.");
                }
                let queue;
                if (campaignId) {
                    // Update existing queue
                    await QueueModel.updateOne({ campaign_uuid: String(campaignId) }, {
                        $set: {
                            name: name,
                            script_data: script,
                            members: campaignMembers,
                            agentDisposition: agentDisposition,
                            settings: settings,
                            domain: domain,
                        },
                    });
                    queue = await QueueModel.findOne({
                        campaign_uuid: String(campaignId),
                    });
                }
                else {
                    // Create new queue
                    queue = await QueueModel.create({
                        user_uuid: userData?.user_uuid,
                        company_uuid: userData?.company_uuid,
                        type: 'CAMPAIGN',
                        name: name,
                        extension: extension,
                        script_data: script,
                        members: campaignMembers,
                        agentDisposition: agentDisposition,
                        settings: settings,
                        domain: domain,
                    });
                }
                queueUuid = queue?._id ?? null;
                if (!queueUuid) {
                    throw new HttpException_1.HttpException(404, "Predictive campaign queue does not exist.");
                }
                if (campaignMembers?.length) {
                    // Remove existing agents + tiers
                    await QueueAgentModel.deleteMany({ queue_uuid: queueUuid });
                    await QueueTierModel.deleteMany({ queue: `${extension}@${domain}` });
                    // Prepare Agents
                    const agentPayloads = campaignMembers.map((member) => ({
                        queue_uuid: queueUuid,
                        user_detail: member,
                        type: 'callback',
                        name: `${member.extension}@${domain}`,
                        contact: `user/${member.extension}_web@${domain}`,
                    }));
                    // Prepare Tiers
                    const tiers = campaignMembers.map((member, index) => ({
                        queue: `${extension}@${domain}`,
                        agent: `${member.extension}@${domain}`,
                        level: index,
                    }));
                    // Insert in bulk
                    await Promise.all([
                        QueueAgentModel.insertMany(agentPayloads),
                        QueueTierModel.insertMany(tiers, { ordered: false }), // ignores duplicates
                    ]);
                }
                const queueName = `${extension}@${domain}`;
                queue_name = queueName;
                queue_extension = extension;
            }
            const normalizedCallerIds = Array.from(new Set((Array.isArray(callerId) ? callerId : [callerId]).filter(Boolean)));
            const effectiveCallerIds = normalizedCallerIds;
            const createdByName = [userData?.first_name, userData?.last_name]
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
                .join(" ")
                || String(userData?.username ?? "").trim()
                || null;
            const isUpdate = !!campaignId;
            let createdCampaignObjId = null;
            let existingCampaign = null;
            let removedMembers = [];
            // Validate ObjectId if update
            if (isUpdate && !mongoose_1.default.Types.ObjectId.isValid(campaignId)) {
                throw new HttpException_1.HttpException(422, "The provided campaign ID is invalid.");
            }
            if (isUpdate) {
                existingCampaign = await CampaignModel.findOne({ _id: campaignId, company_uuid }, { groupId: 1, campaignStatus: 1, callerId: 1, members: 1 }).lean();
                if (!existingCampaign) {
                    throw new HttpException_1.HttpException(404, "Campaign does not exist.");
                }
                const existingGroupIds = (existingCampaign?.groupId || []).map((id) => id?.toString());
                const incomingGroupIds = (groupId || []).map((id) => id?.toString());
                const incomingGroupSet = new Set(incomingGroupIds);
                const incomingMemberIds = new Set((Array.isArray(campaignMembers) ? campaignMembers : [])
                    .map((member) => member?.user_uuid?.toString?.())
                    .filter(Boolean));
                removedMembers = (existingCampaign?.members || []).filter((member) => !incomingMemberIds.has(member?.user_uuid?.toString?.()));
                const removedGroupIds = existingGroupIds.filter((id) => !incomingGroupSet.has(id));
                if (existingCampaign?.campaignStatus !== "NEW" &&
                    removedGroupIds.length > 0) {
                    throw new HttpException_1.HttpException(422, "You cannot remove existing contact groups after campaign start. You can only add new contact groups.");
                }
            }
            // Check duplicate campaign name within the same company
            const nameExists = await CampaignModel.findOne({
                name,
                company_uuid,
                ...(isUpdate && { _id: { $ne: campaignId } }),
            });
            if (nameExists) {
                throw new HttpException_1.HttpException(422, "Campaign name already taken for this Company.");
            }
            const normalizedGroupIds = Array.from(new Set((Array.isArray(groupId) ? groupId : [groupId])
                .map((id) => String(id))
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)))).map((id) => new mongoose_1.default.Types.ObjectId(id));
            const contactExists = await ContactModel.findOne({
                companyId: String(userData?.company_uuid),
                deletedAt: null,
                groupMeta: { $in: normalizedGroupIds },
                "contact.phone": { $nin: [null, ""] },
            })
                .select({ _id: 1 })
                .lean();
            if (!contactExists) {
                throw new HttpException_1.HttpException(422, "Please add contacts in the contact group.");
            }
            const startDateUtc = await CommonHelper_1.default.toUtcConversion(`${(0, dayjs_1.default)(startDate).format("YYYY-MM-DD")} 00:00:00`, timezone);
            const endDateUtc = await CommonHelper_1.default.toUtcConversion(`${(0, dayjs_1.default)(endDate).format("YYYY-MM-DD")} 00:00:00`, timezone);
            const campaignData = {
                company_uuid: userData?.company_uuid,
                createdById: userData?.user_uuid,
                createdByName,
                name,
                domain: domain,
                timezone,
                startDate: startDateUtc,
                endDate: endDateUtc,
                contactId,
                groupId,
                members: campaignMembers,
                campaignType,
                callerId: effectiveCallerIds,
                agentDisposition,
                systemDisposition: {},
                script,
                description,
                rotateCallerId,
                allowSkipping,
                agentScripting,
                dialMethod,
                dialerSetting,
                settings,
                queue: queue_name,
                queue_extension
            };
            if (siteId !== undefined) {
                campaignData.siteId = siteId || null;
            }
            let campaignResult;
            if (isUpdate) {
                campaignResult = await CampaignModel.findOneAndUpdate({ _id: campaignId, company_uuid }, { $set: campaignData }, { returnDocument: "after" });
                if (!campaignResult) {
                    throw new HttpException_1.HttpException(404, "Campaign does not exist.");
                }
            }
            else {
                campaignData.queue = queue_name;
                campaignData.queue_extension = queue_extension;
                campaignResult = await CampaignModel.create(campaignData);
                createdCampaignObjId = new mongoose_1.default.Types.ObjectId(campaignResult._id);
            }
            const campaignObjId = new mongoose_1.default.Types.ObjectId(campaignResult._id);
            const isNewCampaign = !isUpdate || existingCampaign?.campaignStatus === "NEW";
            if (isNewCampaign && dialMethod === 'PREDICTIVE') {
                await QueueModel.updateOne({ _id: new mongoose_1.default.Types.ObjectId(queueUuid) }, {
                    $set: {
                        campaign_uuid: String(campaignResult._id),
                    },
                });
            }
            let leadAssignmentQueued = false;
            try {
                leadAssignmentQueued = await this.enqueueCampaignLeadAssignment(campaignMembers, campaignObjId, isNewCampaign, userData);
                if (!leadAssignmentQueued) {
                    await this.LeadAssignmentHandler(campaignMembers, campaignObjId, isNewCampaign, userData);
                }
            }
            catch (assignmentError) {
                if (createdCampaignObjId) {
                    await Promise.allSettled([
                        CampaignModel.deleteOne({
                            _id: createdCampaignObjId,
                            company_uuid: userData?.company_uuid,
                        }),
                        CampaignAnalyticsModel.deleteOne({
                            campaignId: createdCampaignObjId,
                            company_uuid: userData?.company_uuid,
                        }),
                        CampaignMemberAnalyticsModel.deleteMany({
                            campaignId: createdCampaignObjId,
                            company_uuid: userData?.company_uuid,
                        }),
                        CampaignNumberModel.deleteMany({
                            campaignId: createdCampaignObjId,
                            company_uuid: userData?.company_uuid,
                        }),
                    ]);
                }
                throw assignmentError;
            }
            return {
                campaignObjId,
                members: removedMembers,
                leadAssignmentQueued,
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
    static async deleteCampaign(requestData, userData) {
        try {
            const { campaignId } = requestData;
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(campaignId) && campaignId) {
                throw new HttpException_1.HttpException(422, `The provided Campaign ID is invalid.`);
            }
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const CampaignAnalyticsModel = mainDB.models.campaign_analytics;
            const CampaignMemberAnalyticsModel = mainDB.models.campaign_member_analytics;
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const companyId = String(userData.company_uuid);
            if (campaignId && campaignId !== "") {
                const contactExists = await CampaignModel.exists({ _id: campaignId });
                if (!contactExists) {
                    throw new HttpException_1.HttpException(404, `Campaign does not exist.`);
                }
            }
            const deletedCampaign = await CampaignModel.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(campaignId)),
                company_uuid: String(userData.company_uuid),
            });
            if (deletedCampaign) {
                // DELETE related data
                await CampaignNumberModel.deleteMany({
                    campaignId: new mongoose_1.Types.ObjectId(String(campaignId)),
                    company_uuid: String(userData.company_uuid),
                });
                await CampaignAnalyticsModel.findOneAndDelete({
                    campaignId: new mongoose_1.Types.ObjectId(String(campaignId)),
                    company_uuid: String(userData.company_uuid),
                });
                await CampaignMemberAnalyticsModel.deleteMany({
                    campaignId: new mongoose_1.Types.ObjectId(String(campaignId)),
                    company_uuid: String(userData.company_uuid),
                });
            }
            else {
                throw new HttpException_1.HttpException(404, "Campaign not found");
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
        return { messages: "Campaign deleted successfully." };
    }
    static async campaignTemplateList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc ? -1 : 1;
            const skip = (page - 1) * limit;
            // 1. Precise Match Stage
            const matchStage = {
                company_uuid: String(userData?.company_uuid),
                $or: [
                    {
                        $expr: {
                            $anyElementTrue: {
                                $map: {
                                    input: "$members",
                                    as: "m",
                                    in: {
                                        $and: [
                                            { $eq: ["$$m.user_uuid", userData?.user_uuid] },
                                            { $eq: ["$$m.extension", userData?.extension] },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                    {
                        createdById: String(userData?.user_uuid),
                    },
                ],
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { dialMethod: { $regex: search, $options: "i" } },
                    { campaignStatus: { $regex: search, $options: "i" } },
                ];
            }
            // filter
            for (let filter of filters) {
                if (filter.key === "dialMethod") {
                    matchStage["dialMethod"] = { $regex: filter.value, $options: "i" };
                }
                if (filter.key === "campaignStatus") {
                    matchStage["campaignStatus"] = {
                        $regex: filter.value,
                        $options: "i",
                    };
                }
            }
            const pipeline = [
                { $match: matchStage },
                { $sort: { [sortKey]: sortOrder } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        queue: 1,
                        campaignType: 1,
                        campaignStatus: 1,
                        siteId: 1,
                        createdById: 1,
                        createdByName: 1,
                        updatedById: 1,
                        updatedByName: 1,
                        members: 1,
                        timezone: 1,
                        script: 1,
                        groupId: 1,
                        callerId: 1,
                        startDate: 1,
                        endDate: 1,
                        dialMethod: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        created_at: "$createdAt",
                        updated_at: "$updatedAt",
                    },
                },
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignTemplateModel = mainDB.models.campaign_template;
            const [rows, total] = await Promise.all([
                CampaignTemplateModel.aggregate(pipeline),
                CampaignTemplateModel.countDocuments(matchStage),
            ]);
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
    static async campaignTemplateUpsert(requestData, userData) {
        try {
            const { campaignId, campaignType, queue, queue_extension, name, siteId, timezone, startDate, endDate, contactId, groupId, members, rotateCallerId, allowSkipping, agentScripting, dialMethod, callerId, agentDisposition, script, description, dialerSetting, settings, campaignStatus, } = requestData;
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignTemplateModel = mainDB.models.campaign_template;
            const { company_uuid } = userData;
            const isUpdate = !!campaignId;
            if (isUpdate && !mongoose_1.default.Types.ObjectId.isValid(campaignId)) {
                throw new HttpException_1.HttpException(422, "The provided campaign template ID is invalid.");
            }
            const createdByName = [userData?.first_name, userData?.last_name]
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
                .join(" ")
                || String(userData?.username ?? "").trim()
                || null;
            const nameExists = await CampaignTemplateModel.findOne({
                name,
                company_uuid,
                ...(isUpdate && { _id: { $ne: campaignId } }),
            });
            if (nameExists) {
                throw new HttpException_1.HttpException(422, "Campaign template already taken for this Company.");
            }
            const startDateUtc = startDate
                ? await CommonHelper_1.default.toUtcConversion(`${(0, dayjs_1.default)(startDate).format("YYYY-MM-DD")} 00:00:00`, timezone)
                : null;
            const endDateUtc = endDate
                ? await CommonHelper_1.default.toUtcConversion(`${(0, dayjs_1.default)(endDate).format("YYYY-MM-DD")} 00:00:00`, timezone)
                : null;
            const campaignTemplateData = {
                company_uuid: userData?.company_uuid,
                name,
                domain: userData?.domain,
                timezone,
                startDate: startDateUtc,
                endDate: endDateUtc,
                contactId,
                groupId,
                members,
                campaignType,
                campaignStatus,
                callerId,
                agentDisposition,
                systemDisposition: {},
                script,
                description,
                rotateCallerId,
                allowSkipping,
                agentScripting,
                dialMethod,
                updatedById: userData?.user_uuid,
                updatedByName: createdByName,
                dialerSetting,
                settings,
            };
            if (siteId !== undefined) {
                campaignTemplateData.siteId = siteId || null;
            }
            let campaignTemplateResult;
            if (isUpdate) {
                campaignTemplateResult = await CampaignTemplateModel.findOneAndUpdate({ _id: campaignId, company_uuid }, { $set: campaignTemplateData }, { returnDocument: "after" });
                if (!campaignTemplateResult) {
                    throw new HttpException_1.HttpException(404, "Campaign template does not exist.");
                }
            }
            else {
                campaignTemplateData.createdById = userData?.user_uuid;
                campaignTemplateData.createdByName = createdByName;
                campaignTemplateData.queue = queue;
                campaignTemplateData.queue_extension = queue_extension;
                campaignTemplateResult =
                    await CampaignTemplateModel.create(campaignTemplateData);
            }
            const campaignTemplateObjId = new mongoose_1.default.Types.ObjectId(campaignTemplateResult._id);
            return { campaignTemplateObjId };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, error.message);
            }
            throw new HttpException_1.HttpException(500, "Internal Server Error");
        }
    }
    static async deleteCampaignTemplate(requestData, userData) {
        try {
            const { campaignId } = requestData;
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(campaignId) && campaignId) {
                throw new HttpException_1.HttpException(422, `The provided Campaign Template ID is invalid.`);
            }
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignTemplateModel = mainDB.models.campaign_template;
            if (campaignId && campaignId !== "") {
                const templateExists = await CampaignTemplateModel.exists({
                    _id: campaignId,
                });
                if (!templateExists) {
                    throw new HttpException_1.HttpException(404, `Campaign template does not exist.`);
                }
            }
            const deletedTemplate = await CampaignTemplateModel.findOneAndDelete({
                _id: new mongoose_1.Types.ObjectId(String(campaignId)),
                company_uuid: String(userData.company_uuid),
            });
            if (!deletedTemplate) {
                throw new HttpException_1.HttpException(404, "Campaign template not found");
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
        return { messages: "Campaign template deleted successfully." };
    }
    static async campaignDetailByIdTemplate(requestData, userData) {
        const { campaignId } = requestData;
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignTemplateModel = mainDB.models.campaign_template;
        if (!campaignId || !mongoose_1.Types.ObjectId.isValid(campaignId)) {
            throw new HttpException_1.HttpException(400, "Invalid template campaign id");
        }
        const checkCampaignExist = await CampaignTemplateModel.findOne({
            _id: new mongoose_1.default.Types.ObjectId(campaignId),
        });
        if (!checkCampaignExist) {
            throw new HttpException_1.HttpException(422, `Campaign template does not exist.`);
        }
        const campaignDetail = await CampaignTemplateModel.aggregate([
            {
                $match: {
                    _id: new mongoose_1.default.Types.ObjectId(campaignId),
                },
            },
            { $limit: 1 },
        ]);
        return campaignDetail[0];
    }
    static async campaignDetailById(requestData, userData) {
        const { campaignId } = requestData;
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignModel = mainDB.models.campaign;
        if (!campaignId || !mongoose_1.Types.ObjectId.isValid(campaignId)) {
            throw new HttpException_1.HttpException(400, "Invalid campaign id");
        }
        const checkCampaignExist = await CampaignModel.findOne({
            _id: new mongoose_1.default.Types.ObjectId(campaignId),
        });
        if (!checkCampaignExist) {
            throw new HttpException_1.HttpException(422, `Campaign does not exist.`);
        }
        const campaignDetail = await CampaignModel.aggregate([
            {
                $match: {
                    _id: new mongoose_1.default.Types.ObjectId(campaignId),
                },
            },
            { $limit: 1 },
        ]);
        return campaignDetail[0];
    }
    static async campaignRuntimeAnalytics(requestData, userData) {
        const { campaignId } = requestData;
        if (!campaignId || !mongoose_1.Types.ObjectId.isValid(campaignId)) {
            throw new HttpException_1.HttpException(400, "Invalid campaign id");
        }
        return await this.getStoredCampaignRuntimeAnalytics(campaignId, userData);
    }
    static async changeCampaignState(requestData, userData) {
        try {
            const { campaignId, campaignStatus: requestedCampaignStatus } = requestData;
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const UserSessionModel = mainDB.models.user_session;
            const checkCampaignExist = await CampaignModel.findOne({
                _id: new mongoose_1.default.Types.ObjectId(campaignId),
            });
            if (!checkCampaignExist) {
                throw new HttpException_1.HttpException(422, `Campaign does not exist.`);
            }
            const isRescheduled = requestedCampaignStatus === "RESCHEDULED";
            const updatePayload = {
                campaignStatus: isRescheduled ? ICampaign_1.campaignStatus.PROCESSING : requestedCampaignStatus,
            };
            if (isRescheduled) {
                const startDate = (0, dayjs_1.default)().startOf("day").toDate();
                const endDate = (0, dayjs_1.default)(startDate).add(1, "month").toDate();
                updatePayload.startDate = startDate;
                updatePayload.endDate = endDate;
            }
            const updatedCampaign = await CampaignModel.findByIdAndUpdate(campaignId, { $set: updatePayload }, { returnDocument: "after" });
            if (updatedCampaign && ["PAUSE", "COMPLETED"].includes(requestedCampaignStatus)) {
                await this.queueOrRunCampaignAnalyticsSync(campaignId, userData, { refreshDncStatus: true });
            }
            let socketIdArr = [];
            for (let member of checkCampaignExist?.members) {
                const userSession = await UserSessionModel.findOne({
                    userUuid: member?.user_uuid,
                    extension: member?.value,
                });
                socketIdArr = socketIdArr.concat(userSession?.socketId || []);
            }
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: socketIdArr,
                emitter: "campaign-state-update",
                payload: updatedCampaign,
            });
            return true;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async campaignRandomLead(requestData, userData, contactNumberLimit = null, campaignType = null) {
        try {
            let { campaignId, contactLimit } = requestData;
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const campaignDetail = await CampaignModel.findById(new mongoose_1.default.Types.ObjectId(campaignId), {
                dialMethod: 1,
                dialerSetting: 1,
                campaignStatus: 1,
                callerId: 1,
                name: 1,
                siteId: 1,
                domain: 1,
                queue_extension: 1,
            }).lean();
            let contactLimitRevised = contactLimit ?? contactNumberLimit ?? 5;
            if (this.isRealtimeReservationDialMethod(campaignDetail?.dialMethod)) {
                await this.reserveRealtimeLeadBuffer(requestData, userData, campaignDetail, contactLimitRevised);
                const rows = await this.getReservedCampaignNumbersForUser(requestData, userData, contactLimitRevised);
                return { rows, campaignDetail };
            }
            const { randomContacts, campaignDetail: fallbackCampaignDetail } = await this.campaignRandomContacts(userData, contactLimitRevised, campaignId, campaignType);
            const rows = randomContacts || [];
            return { rows, campaignDetail: fallbackCampaignDetail };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async companyActiveCampaignList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc ? -1 : 1;
            const skip = (page - 1) * limit;
            const { openCampaignIds } = await this.openCampaignList(userData?.company_uuid);
            if (!openCampaignIds?.length) {
                return { rows: [], total: 0, page, limit, totalPages: 0 };
            }
            const matchStage = {
                _id: { $in: openCampaignIds },
                company_uuid: String(userData?.company_uuid),
                campaignStatus: ICampaign_1.campaignStatus.PROCESSING,
            };
            if (search) {
                matchStage.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { dialMethod: { $regex: search, $options: "i" } },
                    { campaignStatus: { $regex: search, $options: "i" } },
                ];
            }
            for (let filter of filters) {
                if (filter.key === "dialMethod") {
                    matchStage["dialMethod"] = { $regex: filter.value, $options: "i" };
                }
                if (filter.key === "campaignStatus") {
                    matchStage["campaignStatus"] = {
                        $regex: filter.value,
                        $options: "i",
                    };
                }
            }
            const pipeline = [
                { $match: matchStage },
                { $sort: { [sortKey]: sortOrder } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "campaign_analytics",
                        localField: "_id",
                        foreignField: "campaignId",
                        as: "campaignAnalytics",
                    },
                },
                {
                    $addFields: {
                        campaignAnalytics: { $arrayElemAt: ["$campaignAnalytics", 0] },
                        campaignAnalyticsStatus: {
                            $cond: [
                                { $gt: [{ $size: "$campaignAnalytics" }, 0] },
                                "READY",
                                "PENDING",
                            ],
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        queue: 1,
                        campaignType: 1,
                        campaignStatus: 1,
                        siteId: 1,
                        createdByName: 1,
                        members: 1,
                        timezone: 1,
                        script: 1,
                        groupId: 1,
                        callerId: 1,
                        startDate: 1,
                        endDate: 1,
                        dialMethod: 1,
                        createdAt: 1,
                        campaignAnalyticsStatus: 1,
                        "campaignAnalytics.assignedLeads": 1,
                        "campaignAnalytics.dialedLeads": 1,
                        "campaignAnalytics.answeredLeads": 1,
                        "campaignAnalytics.pendingLeads": 1,
                        "campaignAnalytics.totalCallRescheduled": 1,
                        "campaignAnalytics.totalCallNotAnswered": 1,
                        "campaignAnalytics.totalRetries": 1,
                        "campaignAnalytics.retriedLeads": 1,
                        "campaignAnalytics.totalDnc": 1,
                        "campaignAnalytics.answeredPercentage": 1,
                        "campaignAnalytics.pendingPercentage": 1,
                        "campaignAnalytics.rescheduledPercentage": 1,
                        "campaignAnalytics.notAnsweredPercentage": 1,
                        "campaignAnalytics.retriesPercentage": 1,
                        "campaignAnalytics.dncPercentage": 1,
                    },
                },
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const [rows, total] = await Promise.all([
                CampaignModel.aggregate(pipeline),
                CampaignModel.countDocuments(matchStage),
            ]);
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
    static async memberCampaign(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const skip = (page - 1) * limit;
            const { openCampaignList, openCampaignIds } = await this.openCampaignList(userData?.company_uuid);
            const matchStage = {
                _id: { $in: openCampaignIds },
                company_uuid: String(userData?.company_uuid),
                campaignStatus: ICampaign_1.campaignStatus.PROCESSING,
                $expr: {
                    $anyElementTrue: {
                        $map: {
                            input: { $ifNull: ["$members", []] },
                            as: "m",
                            in: { $eq: ["$$m.user_uuid", String(userData.user_uuid)] },
                        },
                    },
                },
            };
            if (search) {
                matchStage.$or = [{ name: { $regex: search, $options: "i" } }];
            }
            // filter
            for (let filter of filters) {
                if (filter.key === "dialMethod") {
                    matchStage["dialMethod"] = { $regex: filter.value, $options: "i" };
                }
            }
            const pipeline = [
                { $match: matchStage },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        companyId: 1,
                        name: 1,
                        queue: 1,
                        campaignType: 1,
                        campaignStatus: 1,
                        siteId: 1,
                        createdByName: 1,
                        members: 1,
                        timezone: 1,
                        script: 1,
                        groupId: 1,
                        callerId: 1,
                        startDate: 1,
                        endDate: 1,
                        dialMethod: 1,
                        dialerSetting: 1,
                        agentDisposition: 1,
                        agentScripting: 1,
                        allowSkipping: 1,
                        settings: 1,
                        createdAt: 1,
                    },
                },
            ];
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const [rows, total] = await Promise.all([
                CampaignModel.aggregate(pipeline),
                CampaignModel.countDocuments(matchStage),
            ]);
            const memberAnalyticsMap = await this.computeMemberCampaignRuntimeAnalytics(rows.map((row) => row._id), userData);
            const rowsWithRuntimeAnalytics = rows.map((row) => ({
                ...row,
                campaignMemberAnalytics: memberAnalyticsMap.get(row._id.toString()) ||
                    this.getDefaultMemberRuntimeAnalytics(),
            }));
            return {
                rows: rowsWithRuntimeAnalytics,
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
    static async memberCampaignLeadList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = requestData?.filters || [];
            const skip = (page - 1) * limit;
            const matchStage = {
                company_uuid: String(userData?.company_uuid),
                assignedTo: String(userData?.user_uuid),
            };
            if (search) {
                matchStage.$or = [{ name: { $regex: search, $options: "i" } }];
            }
            // filter
            for (let filter of filters) {
                // if (filter.key === "dialMethod") {
                //   matchStage["dialMethod"] = { $regex: filter.value, $options: "i" };
                // }
            }
            const pipeline = [
                { $match: matchStage },
                { $sort: { created_at: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        contactName: 1,
                        contactEmail: 1,
                        contactNumber: 1,
                        requestStatus: 1,
                        leadStatus: 1,
                        sipcallDetail: 1,
                        systemDisposition: 1,
                        remainingCallAttempts: 1,
                        totalCallAttempts: 1,
                        isDnc: 1,
                        cost: 1,
                        createdAt: 1,
                    },
                },
            ];
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const [rows, total] = await Promise.all([
                CampaignNumberModel.aggregate(pipeline),
                CampaignNumberModel.countDocuments(matchStage),
            ]);
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
    static async campaignContactDetails(requestData, userData) {
        try {
            const tenantDB = await this.getTenantDBFromUser(userData);
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const UserSessionModel = mainDB.models.user_session;
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const ContactModel = tenantDB.models.contact;
            const contactCollectionName = ContactModel.collection.name;
            const result = await CampaignNumberModel.aggregate([
                {
                    $match: {
                        _id: new mongoose_1.default.Types.ObjectId(requestData.campaignNumberUuid),
                    },
                },
                {
                    $lookup: {
                        from: contactCollectionName,
                        localField: "contactId",
                        foreignField: "_id",
                        as: "contacts",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyId: 0,
                                    siteId: 0,
                                    deletedAt: 0,
                                    meta: 0,
                                    groupMeta: 0,
                                    __v: 0,
                                },
                            },
                        ],
                    },
                },
                // {
                //   $project: {
                //     contactName: 0,
                //     contactEmail: 0,
                //     contactNumber: 0,
                //     requestStatus: 0,
                //     contactNumberType: 0,
                //     callStatus: 0,
                //     agentActivity: 0,
                //     errorResponse: 0,
                //     disposition: 0,
                //     cost: 0,
                //     createdById: 0,
                //   },
                // }
            ]);
            let socketIdArr = [];
            const userSession = await UserSessionModel.findOne({
                userUuid: userData?.user_uuid,
                extension: userData?.extension,
            });
            socketIdArr = socketIdArr.concat(userSession?.socketId || []);
            NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: socketIdArr,
                emitter: "contact-detail-response",
                payload: {
                    success: true,
                    data: result,
                },
            });
            return result;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async getCampaignAssignmentsForUsers(requestData, userData) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const DncNumberModel = await this.getDncModel();
        try {
            const page = requestData.page || 1;
            // const limit = requestData.limit || 1;
            const limit = 1;
            const sort = requestData?.sort
                ? requestData?.sort
                : { key: "createdAt", desc: true };
            const sortBy = sort?.key
                ? sort?.key == "created_at"
                    ? "createdAt"
                    : sort?.key
                : "createdAt";
            const sortOrder = sort?.desc === undefined ? "DESC" : sort?.desc ? "DESC" : "ASC";
            const sortObj = {
                [sortBy]: sortOrder === "ASC" ? 1 : -1,
            };
            const assignmentSortObj = {
                startExecutionDateNullFirst: 1,
                ...sortObj,
            };
            const { openCampaignList, openCampaignIds } = await this.openCampaignList(requestData?.company_uuid);
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            // Filter current campaign from all running campaigns
            const currentCampaign = openCampaignIds.filter((campaignId) => campaignId.toString() === requestData?.campaignId.toString());
            const currentCampaignDetail = await CampaignModel.findById(new mongoose_1.default.Types.ObjectId(requestData?.campaignId), { campaignStatus: 1, dialMethod: 1, dialerSetting: 1 }).lean();
            const currentCampaignStatus = currentCampaignDetail?.campaignStatus ?? null;
            if (this.isRealtimeReservationDialMethod(currentCampaignDetail?.dialMethod)) {
                await this.reserveRealtimeLeadBuffer(requestData, userData, currentCampaignDetail, this.REALTIME_RESERVATION_BATCH_SIZE);
                const rows = await this.getReservedCampaignNumbersForUser(requestData, userData, 1);
                return {
                    limit: 1,
                    currentPage: requestData.page || 1,
                    total: rows.length,
                    totalPages: rows.length ? 1 : 0,
                    campaignStatus: currentCampaignStatus,
                    rows,
                };
            }
            const nowUTC = new Date();
            const baseAssignmentMatch = {
                campaignId: { $in: currentCampaign },
                requestStatus: { $in: ["SCHEDULED", "CALLBACK_SCHEDULED"] },
                assignedTo: String(requestData?.user_uuid),
                $or: [{ startExecutionDate: { $lte: nowUTC } }, { startExecutionDate: null }],
            };
            const assignmentMatch = {
                ...baseAssignmentMatch,
                isDnc: false,
            };
            const { rows, total: totalItems } = await this.getNextNonDncAssignedCampaignRows(CampaignNumberModel, DncNumberModel, userData?.company_uuid, assignmentMatch, assignmentSortObj, page, limit);
            const totalPages = Math.ceil(totalItems / limit);
            const response = {
                limit,
                currentPage: page,
                total: totalItems,
                totalPages,
                campaignStatus: currentCampaignStatus,
                rows,
            };
            return response;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async systemPredictiveLeadRequest(requestData, userData) {
        try {
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignModel = mainDB.models.campaign;
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const getCampaignDetail = await CampaignModel.findOne({
                queue: requestData?.queue,
            });
            let campaignId = getCampaignDetail?._id;
            requestData.campaignId = campaignId;
            const { rows, campaignDetail } = await CampaignRepository.campaignRandomLead(requestData, userData, 1, "PREDICTIVE");
            const resolvedCampaignStatus = campaignDetail?.campaignStatus ?? getCampaignDetail?.campaignStatus ?? null;
            const legacyFormattedResponse = rows.map((record) => ({
                companyId: record?.company_uuid,
                siteId: campaignDetail?.siteId ?? null,
                campaignName: campaignDetail?.name,
                campaignId: record?.campaignId,
                campaignNumberId: record?._id,
                domain: campaignDetail?.domain,
                forwardValue: campaignDetail?.queue_extension,
                campaignType: campaignDetail?.dialMethod,
                amd: campaignDetail?.dialerSetting?.answering_detection_machine,
                autoAnswer: campaignDetail?.dialerSetting?.auto_answering,
                campaignStatus: resolvedCampaignStatus,
                contactName: record?.contactName,
                contactId: record?.contactId,
                callerId: campaignDetail?.callerId[Math.floor(Math.random() * campaignDetail?.callerId?.length)],
                contactPhone: record?.contactNumber,
            }));
            let formattedResponse = rows.map((record) => ({
                hasData: true,
                companyId: record?.company_uuid,
                siteId: campaignDetail?.siteId ?? null,
                campaignName: campaignDetail?.name,
                campaignId: record?.campaignId,
                campaignNumberId: record?._id,
                domain: campaignDetail?.domain,
                forwardValue: campaignDetail?.queue_extension,
                campaignType: campaignDetail?.dialMethod,
                amd: campaignDetail?.dialerSetting?.answering_detection_machine,
                autoAnswer: campaignDetail?.dialerSetting?.auto_answering,
                campaignStatus: resolvedCampaignStatus,
                contactName: record?.contactName,
                contactId: record?.contactId,
                callerId: campaignDetail?.callerId[Math.floor(Math.random() * campaignDetail?.callerId?.length)],
                contactPhone: record?.contactNumber,
            }));
            if (!formattedResponse.length) {
                formattedResponse = [
                    {
                        hasData: false,
                        companyId: userData?.company_uuid || null,
                        siteId: campaignDetail?.siteId ?? getCampaignDetail?.siteId ?? null,
                        campaignName: campaignDetail?.name ?? getCampaignDetail?.name ?? null,
                        campaignId: requestData?.campaignId || getCampaignDetail?._id || null,
                        campaignNumberId: null,
                        domain: campaignDetail?.domain ?? null,
                        forwardValue: campaignDetail?.queue_extension ?? null,
                        campaignType: campaignDetail?.dialMethod ?? "PREDICTIVE",
                        amd: campaignDetail?.dialerSetting?.answering_detection_machine ?? null,
                        autoAnswer: campaignDetail?.dialerSetting?.auto_answering ?? null,
                        campaignStatus: resolvedCampaignStatus,
                        contactName: null,
                        contactId: null,
                        callerId: null,
                        contactPhone: null,
                    },
                ];
            }
            NatsController_1.NatsController.publishEvent("campaign-system-events-response", legacyFormattedResponse);
            // Updating number intent after successful broadcast
            if (legacyFormattedResponse.length) {
                for (let number of legacyFormattedResponse) {
                    if (!number?.campaignNumberId)
                        continue;
                    await CampaignNumberModel.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(number?.campaignNumberId) }, { $set: { requestStatus: "IN_PROCESS" } });
                }
            }
            return formattedResponse;
        }
        catch (error) {
            console.error("[systemPredictiveLeadRequest] Failed", {
                queue: requestData?.queue || null,
                message: error?.message || String(error),
            });
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async saveCampaignAgentActivity(requestData, userData) {
        try {
            const campaignData = {
                userDetail: requestData?.userDetail,
                companyId: requestData?.companyId,
                campaignId: requestData?.campaignId,
                campaignNumberId: requestData?.campaignNumberId,
                siteId: requestData?.siteId,
                contactId: requestData?.contactId,
                contactName: requestData?.contactName,
                contactNumber: requestData?.contactNumber,
                contactEmail: requestData?.contactEmail,
                didNumber: requestData?.didNumber,
                skippingContact: requestData?.skippingContact,
                doNothing: requestData?.doNothing,
                callDate: requestData?.callDate,
                callDuration: requestData?.callDuration,
                callStatus: requestData?.callStatus,
                isDisposition: requestData?.isDisposition,
                disposition: requestData?.disposition,
                isCallSchedule: requestData?.isCallSchedule,
                callScheduleDate: requestData?.callScheduleDate,
                sipCallId: requestData?.sipCallId,
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignAgentActivityModel = mainDB.models.campaign_agent_activity;
            const UserSessionModel = mainDB.models.user_session;
            await CampaignAgentActivityModel.create(campaignData);
            let socketIdArr = [];
            const userSession = await UserSessionModel.findOne({
                userUuid: userData?.user_uuid,
                extension: userData?.extension,
            });
            socketIdArr = socketIdArr.concat(userSession?.socketId || []);
            return true;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async campaignSkipLead(requestData, userData) {
        try {
            const { campaignId, campaignNumberId } = requestData;
            const tenantDB = await this.getTenantDBFromUser(userData);
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const CampaignModel = mainDB.models.campaign;
            const CampaignMemberAnalyticsModel = mainDB.models.campaign_member_analytics;
            const existingLead = await CampaignNumberModel.findById(campaignNumberId, { assignedTo: 1, startExecutionDate: 1, requestStatus: 1 });
            if (!existingLead) {
                console.error("[campaignSkipLead] Lead not found", campaignNumberId);
                throw new HttpException_1.HttpException(404, "Campaign lead not found.");
            }
            const previousAssignedTo = existingLead.assignedTo;
            const campaignDetail = await CampaignModel.findById(campaignId, { dialerSetting: 1, dialMethod: 1 }).lean();
            const { shouldUpdate: shouldUpdateStartExecutionDate, nextStartExecutionDate } = this.getNextStartExecutionDate(campaignDetail?.dialerSetting, existingLead?.startExecutionDate);
            await this.releaseLeadReservation(CampaignNumberModel, campaignNumberId);
            if (this.isRealtimeReservationDialMethod(campaignDetail?.dialMethod)) {
                const setPayload = {
                    assignedTo: null,
                    requestStatus: existingLead?.requestStatus === "IN_PROCESS"
                        ? "SCHEDULED"
                        : existingLead?.requestStatus,
                };
                if (shouldUpdateStartExecutionDate) {
                    setPayload.startExecutionDate = nextStartExecutionDate;
                }
                await CampaignNumberModel.updateOne({ _id: campaignNumberId }, { $set: setPayload });
                await this.syncCampaignMemberAnalyticsModel(campaignId.toString(), userData);
                return true;
            }
            console.log("[campaignSkipLead] Previous assigned user", previousAssignedTo);
            const memberFilter = {
                campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
            };
            if (previousAssignedTo) {
                memberFilter.user_uuid = { $ne: previousAssignedTo };
            }
            const leastLoadedMember = await CampaignMemberAnalyticsModel.findOne(memberFilter, { user_uuid: 1, assignedLeads: 1 }).sort({ assignedLeads: 1 });
            if (!leastLoadedMember) {
                console.error("[campaignSkipLead] No eligible member found", memberFilter);
                if (shouldUpdateStartExecutionDate) {
                    await CampaignNumberModel.updateOne({ _id: campaignNumberId }, { $set: { startExecutionDate: nextStartExecutionDate } });
                }
                // throw new HttpException(
                //   404,
                //   "No eligible campaign member found for reassignment."
                // );
                return true;
            }
            const setPayload = {
                assignedTo: leastLoadedMember.user_uuid,
            };
            if (shouldUpdateStartExecutionDate) {
                setPayload.startExecutionDate = nextStartExecutionDate;
            }
            await CampaignNumberModel.updateOne({ _id: campaignNumberId }, { $set: setPayload });
            await this.syncCampaignMemberAnalyticsModel(campaignId.toString(), userData);
            return true;
        }
        catch (error) {
            console.error("[campaignSkipLead] Error occurred", {
                message: error.message,
                stack: error.stack,
            });
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async campaignEventLogs(req) {
        try {
            let { campaignDetail, eventType } = req;
            const userDetail = CommonHelper_1.default.createUserObject(req);
            campaignDetail = {
                ...campaignDetail,
                companyId: userDetail.company_uuid,
            };
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignEventLogModel = mainDB.models.campaign_event_logs;
            const UserSessionModel = mainDB.models.user_session;
            if (eventType === "INSERT") {
                await CampaignEventLogModel.findOneAndUpdate({
                    "campaignDetail.campaignId": campaignDetail?.campaignId,
                    userDetail: {
                        $not: {
                            $elemMatch: { user_uuid: userDetail.user_uuid },
                        },
                    },
                }, {
                    $setOnInsert: {
                        campaignDetail: campaignDetail,
                    },
                    $push: {
                        userDetail: userDetail,
                    },
                }, {
                    upsert: true,
                    returnDocument: "after",
                });
            }
            if (eventType === "DELETE") {
                await CampaignEventLogModel.updateOne({ "campaignDetail.campaignId": campaignDetail?.campaignId }, {
                    $pull: {
                        userDetail: { user_uuid: userDetail.user_uuid },
                    },
                });
            }
            const getfetchDetail = await CampaignEventLogModel.find({
                "campaignDetail.companyId": userDetail.company_uuid,
            }).lean();
            // If no campaign found, return early
            if (!getfetchDetail?.length) {
                return [];
            }
            // Fetch all user sessions for this company
            const userSessions = await UserSessionModel.find({
                companyUuid: userDetail.company_uuid,
                online: true,
            })
                .select("socketId -_id")
                .lean();
            const allSocketIds = userSessions.flatMap((s) => Array.isArray(s.socketId) ? s.socketId : s.socketId ? [s.socketId] : []);
            //  Remove duplicates
            const uniqueSocketIds = [...new Set(allSocketIds)];
            // Emit to all socket IDs
            if (uniqueSocketIds.length > 0) {
                await NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                    socketId: uniqueSocketIds,
                    emitter: "campaign-global-event-logs",
                    payload: getfetchDetail,
                });
            }
            // Return the fetched campaign details
            return getfetchDetail;
        }
        catch (error) {
            console.error("CampaignRepository ~ campaignEventLogs ~ error:", error);
            return {
                message: error.message,
            };
        }
    }
    static async campaignLeadWrap(req, userData) {
        try {
            const type = String(req?.type || "").toUpperCase();
            const campaignId = req?.campaignId;
            const campaignNumberId = req?.campaignNumberId;
            if (!["CONNECTING", "RINGING", "ANSWERED"].includes(type)) {
                return {
                    success: false,
                    message: "type must be CONNECTING, RINGING or ANSWERED",
                };
            }
            if (!campaignId || !campaignNumberId) {
                return {
                    success: false,
                    message: "campaignId and campaignNumberId are required",
                };
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(campaignId) ||
                !mongoose_1.default.Types.ObjectId.isValid(campaignNumberId)) {
                return {
                    success: false,
                    message: "Invalid campaignId or campaignNumberId",
                };
            }
            const campaignObjectId = new mongoose_1.default.Types.ObjectId(campaignId);
            const campaignNumberObjectId = new mongoose_1.default.Types.ObjectId(campaignNumberId);
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const CampaignModel = mainDB.models.campaign;
            const campaignDetail = await CampaignModel.findById(campaignObjectId, { dialerSetting: 1 }).lean();
            if (!campaignDetail) {
                return {
                    success: false,
                    message: "Campaign not found",
                };
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CampaignNumberModel = tenantDB.models.campaign_number;
            if (type === "ANSWERED") {
                const updateResult = await CampaignNumberModel.updateOne({
                    _id: campaignNumberObjectId,
                    campaignId: campaignObjectId,
                }, {
                    $set: {
                        requestStatus: "COMPLETED",
                    },
                });
                if (!updateResult?.matchedCount) {
                    return {
                        success: false,
                        message: "Campaign number not found",
                    };
                }
                await this.releaseLeadReservation(CampaignNumberModel, campaignNumberObjectId);
                return {
                    success: true,
                    message: "Campaign number marked as COMPLETED",
                };
            }
            const campaignNumber = await CampaignNumberModel.findOne({
                _id: campaignNumberObjectId,
                campaignId: campaignObjectId,
            }, { startExecutionDate: 1, requestStatus: 1, sipcallDetail: 1 }).lean();
            if (!campaignNumber) {
                return {
                    success: false,
                    message: "Campaign number not found",
                };
            }
            const terminalStatuses = new Set([
                "COMPLETED",
                "ATTEMPT_LIMIT_EXHAUSTED",
            ]);
            const currentRequestStatus = String(campaignNumber?.requestStatus || "");
            const existingSipcallDetail = Array.isArray(campaignNumber?.sipcallDetail)
                ? campaignNumber.sipcallDetail
                : [];
            const sameCallLegAlreadyRecorded = Boolean(req?.sipcallID) &&
                existingSipcallDetail.some((entry) => entry?.sipcallId === req?.sipcallID);
            // Don't let CONNECTING/RINGING override terminal state
            // or regress same call leg after terminal webhook processing.
            if (type !== "ANSWERED" &&
                (terminalStatuses.has(currentRequestStatus) || sameCallLegAlreadyRecorded)) {
                return {
                    success: true,
                    message: `${type} ignored for terminal/already-processed call leg`,
                    startExecutionDate: campaignNumber?.startExecutionDate || null,
                    requestStatus: currentRequestStatus || null,
                };
            }
            const { shouldUpdate: shouldIncreaseStartExecutionDate, nextStartExecutionDate, } = this.getNextStartExecutionDate(campaignDetail?.dialerSetting, campaignNumber?.startExecutionDate);
            const setPayload = {};
            if (shouldIncreaseStartExecutionDate) {
                setPayload.startExecutionDate = nextStartExecutionDate;
            }
            if (type === "RINGING") {
                setPayload.requestStatus = "IN_PROCESS";
            }
            const updateResult = await CampaignNumberModel.updateOne({
                _id: campaignNumberObjectId,
                campaignId: campaignObjectId,
            }, {
                ...(Object.keys(setPayload).length ? { $set: setPayload } : {}),
            });
            if (!updateResult?.matchedCount) {
                return {
                    success: false,
                    message: "Campaign number not found",
                };
            }
            return {
                success: true,
                message: type === "RINGING"
                    ? "RINGING handled and number set to IN_PROCESS"
                    : "CONNECTING handled",
                startExecutionDate: nextStartExecutionDate,
            };
        }
        catch (error) {
            console.error("CampaignRepository ~ campaignLeadWrap ~ error:", error);
            return {
                message: error.message,
            };
        }
    }
    static async contactActivityCallSave(request) {
        try {
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const { campaign: CampaignModel } = mainDB.models;
            const existingUserDetail = request?.userDetail && typeof request.userDetail === "object" ? request.userDetail : {};
            request.userDetail = {
                ...existingUserDetail,
                company_uuid: existingUserDetail?.company_uuid ?? request?.company_uuid ?? request?.accountcode ?? null,
                user_uuid: existingUserDetail?.user_uuid ?? request?.user_uuid ?? request?.user?.user_uuid ?? null,
                first_name: existingUserDetail?.first_name ?? request?.user?.first_name ?? request?.user?.firstName ?? null,
                last_name: existingUserDetail?.last_name ?? request?.user?.last_name ?? request?.user?.lastName ?? null,
                email: existingUserDetail?.email ?? request?.user?.email ?? null,
            };
            request.company_uuid = request.userDetail.company_uuid;
            request.user_uuid = request.userDetail.user_uuid;
            const userData = CommonHelper_1.default.callActivityUserObject(request);
            const companyId = userData?.company_uuid ? String(userData.company_uuid) : null;
            const userId = userData?.user_uuid ? String(userData.user_uuid) : null;
            const isCampaignType = String(request?.type || "").toUpperCase() === "CAMPAIGN";
            let campaignId = isCampaignType && request?.value && mongoose_1.default.Types.ObjectId.isValid(request.value)
                ? new mongoose_1.default.Types.ObjectId(request.value)
                : null;
            const campaignNumberId = request?.CampaignNumberUuid ? new mongoose_1.default.Types.ObjectId(request.CampaignNumberUuid) : null;
            const callReceivers = [];
            const agentDetail = CommonHelper_1.default.createAgentDetail(request, userData);
            if (userId) {
                callReceivers.push(agentDetail);
            }
            if (userData?.connectionTenant) {
                // if (userId) {
                //     const saveAnalyticsResult = await this.saveMemberCallAnalytics(request, userId);
                // }
                let totalRetries = 0;
                const tenantDB = await this.getTenantDBFromUser(userData);
                const { campaign_number: CampaignNumberModel, campaign_call_logs: CampaignCallLogModel } = tenantDB.models;
                const normalizedSipcallId = String(request?.sipcallID || "").trim();
                const normalizedTranscriptedFile = String(request?.transcriptedFile || "").trim();
                const normalizedRecordfile = String(request?.recordfile || "").trim();
                /** For add/update transcript, record file (Start) **/
                if (normalizedSipcallId) {
                    const sipCallAssetUpdatePayload = {};
                    if (normalizedTranscriptedFile) {
                        sipCallAssetUpdatePayload.transcriptedFile = normalizedTranscriptedFile;
                    }
                    if (normalizedRecordfile) {
                        sipCallAssetUpdatePayload.recordfile = normalizedRecordfile;
                    }
                    if (Object.keys(sipCallAssetUpdatePayload).length) {
                        await Promise.all([
                            CampaignNumberModel.updateMany({ "sipcallDetail.sipcallId": normalizedSipcallId }, { $set: sipCallAssetUpdatePayload }),
                            CampaignCallLogModel.updateMany({ sipcallID: normalizedSipcallId }, { $set: sipCallAssetUpdatePayload }),
                        ]);
                    }
                }
                /** For add/update transcript, record file (End) **/
                // Some predictive webhooks send extension in `value` (not campaign ObjectId).
                // In that case, recover campaignId from CampaignNumberUuid so downstream status updates still run.
                if (!campaignId && campaignNumberId) {
                    const campaignNumberMeta = await CampaignNumberModel.findById(campaignNumberId, { campaignId: 1 }).lean();
                    campaignId = campaignNumberMeta?.campaignId
                        ? new mongoose_1.default.Types.ObjectId(campaignNumberMeta.campaignId)
                        : null;
                }
                const billedDuration = Number(request?.duration ?? request?.duration ?? request?.duration ?? 0);
                const billedSecond = Number(request?.billsec ?? request?.billsec ?? request?.billsec ?? 0);
                const answered = billedSecond > 0;
                const normalizedRequestStatus = request?.status ? String(request.status).toUpperCase() : "";
                const getStatus = ["COMPLETED", "COMPLETE"].includes(normalizedRequestStatus) ? "COMPLETED" : normalizedRequestStatus;
                const agentDisconnectCallStatus = answered && !request?.extension?.trim() && ["ANSWERED", "ANSWER"].includes(normalizedRequestStatus);
                let shouldUpdateAnalytics = false;
                const normalizedCallId = String(request?.callID || "").trim();
                const contactActivityData = {
                    domain: request?.domain,
                    type: request?.type,
                    value: request?.value,
                    name: request?.name,
                    phone: request?.phone,
                    direction: request?.direction,
                    didNumber: request?.didNumber,
                    didName: request?.didName,
                    time: request?.time,
                    status: (agentDisconnectCallStatus) ? "AGENT_ABANDONED" : request?.hangupCause,
                    duration: billedDuration,
                    billsec: (agentDisconnectCallStatus) ? 0 : billedSecond,
                    accountcode: request?.accountcode,
                    extension: request?.extension,
                    sipcallID: normalizedSipcallId || null,
                    callID: normalizedCallId || null,
                    campaignId: campaignId ? campaignId.toString() : request?.value || null,
                    category: request?.category,
                    contactType: request?.contactType,
                    campaignType: request?.CampaignType,
                    contactId: request?.ContactUUID,
                    campaignNumberId: request?.CampaignNumberUuid,
                    isVoicemail: request?.isVoicemail,
                    recordfile: request?.recordfile,
                    transcriptedFile: request?.transcriptedFile,
                    source: "Contact",
                    agent: callReceivers[0],
                    agentDetail,
                };
                if (campaignId && campaignNumberId) {
                    if (normalizedSipcallId) {
                        await CampaignCallLogModel.findOneAndUpdate({ sipcallID: normalizedSipcallId }, {
                            $set: contactActivityData,
                        }, {
                            upsert: true,
                            returnDocument: "after",
                            runValidators: true,
                            setDefaultsOnInsert: true,
                        });
                    }
                    /* ------------------ CAMPAIGN NUMBER LOGIC ------------------ */
                    if (isCampaignType) {
                        const campaignDetail = await CampaignModel.findOne({ _id: campaignId }, { dialMethod: 1, dialerSetting: 1 }).lean();
                        const campaignNumber = await CampaignNumberModel.findOne({ _id: campaignNumberId }, {
                            remainingCallAttempts: 1,
                            totalCallAttempts: 1,
                            startExecutionDate: 1,
                            requestStatus: 1,
                            agentActivity: 1,
                            sipcallDetail: 1,
                        }).lean();
                        if (campaignDetail && campaignNumber) {
                            totalRetries = (campaignNumber.totalCallAttempts || 0) >= 1 ? 1 : 0;
                            const { dialMethod, dialerSetting } = campaignDetail;
                            const maxAttempts = ["PREVIEW", "PROGRESSIVE", "PREDICTIVE"].includes(dialMethod)
                                ? dialerSetting?.max_attempt_per_record : 0;
                            const retryPeriod = dialerSetting?.default_retry_period || 0;
                            const existingSipcallDetail = Array.isArray(campaignNumber.sipcallDetail) ? campaignNumber.sipcallDetail : [];
                            //const shouldCheck = (answered && request?.extension) || getStatus === "COMPLETED";
                            //const shouldCheck =(answered && request?.extension != null && request?.extension !== "") || getStatus === "COMPLETED";
                            const hasExtension = !!request?.extension?.trim();
                            //const shouldCheck = (answered && hasExtension) || getStatus === "COMPLETED";
                            const shouldCheck = getStatus === "COMPLETED";
                            // Guard retry counters so each sipcallID consumes at most one attempt.
                            const sipcallAlreadyProcessed = normalizedSipcallId
                                ? existingSipcallDetail.some((entry) => entry?.sipcallId === normalizedSipcallId)
                                : false;
                            const answeredAlreadyProcessed = shouldCheck && sipcallAlreadyProcessed;
                            const canConsumeAttempt = maxAttempts > 0 && campaignNumber.remainingCallAttempts > 0 && (!normalizedSipcallId || !sipcallAlreadyProcessed);
                            const agentActivityArray = Array.isArray(campaignNumber.agentActivity) ? campaignNumber.agentActivity : [];
                            if (callReceivers[0]) {
                                callReceivers[0].agentCallStatus = shouldCheck ? "ANSWERED" : request?.hangupCause;
                                callReceivers[0].executionDate = new Date();
                            }
                            if (shouldCheck && answeredAlreadyProcessed) {
                                const updatedAgentActivity = [
                                    ...new Map([...agentActivityArray, ...callReceivers]
                                        .map(item => [item.user_uuid, item])).values()
                                ];
                                await CampaignNumberModel.updateOne({ _id: campaignNumberId }, {
                                    $set: {
                                        systemDisposition: request?.hangupCause,
                                        billSec: (agentDisconnectCallStatus) ? 0 : billedSecond,
                                        didNumber: request?.didNumber || null,
                                        duration: billedDuration,
                                        callEndTime: request?.time || null,
                                        callStatus: request?.status,
                                        isVoicemail: request?.isVoicemail || null,
                                        recordfile: request?.recordfile || null,
                                        transcriptedFile: request?.transcriptedFile || null,
                                        hangupCause: request?.hangupCause || null,
                                        requestStatus: "COMPLETED",
                                        // agentActivity: [...agentActivityArray, ...callReceivers],
                                        agentActivity: updatedAgentActivity
                                    },
                                });
                                await this.releaseLeadReservation(CampaignNumberModel, campaignNumberId);
                                shouldUpdateAnalytics = true;
                            }
                            else if (shouldCheck || canConsumeAttempt) {
                                const remainingAttempts = canConsumeAttempt ? campaignNumber.remainingCallAttempts - 1 : campaignNumber.remainingCallAttempts;
                                const nextRequestStatus = shouldCheck ? "COMPLETED" : remainingAttempts === 0 ? "ATTEMPT_LIMIT_EXHAUSTED" : "SCHEDULED";
                                const nextStartExecutionDate = (0, moment_1.default)().add(Number(retryPeriod), "minutes").toDate();
                                // const agentActivityArray = Array.isArray(campaignNumber.agentActivity) ? campaignNumber.agentActivity : [];
                                await CampaignNumberModel.updateOne({ _id: campaignNumberId }, {
                                    $set: {
                                        // agentActivity: [...agentActivityArray, ...callReceivers],
                                        sipcallDetail: [
                                            ...existingSipcallDetail,
                                            {
                                                sipcallId: normalizedSipcallId || null,
                                                callId: normalizedCallId || null,
                                                retryDate: shouldCheck ? null : nextStartExecutionDate,
                                                //assignedUser: callReceivers[0],
                                            },
                                        ],
                                        requestStatus: nextRequestStatus,
                                        didNumber: request?.didNumber || null,
                                        billSec: (agentDisconnectCallStatus) ? 0 : billedSecond,
                                        duration: billedDuration,
                                        callEndTime: request?.time || null,
                                        systemDisposition: request?.hangupCause,
                                        remainingCallAttempts: remainingAttempts,
                                        isVoicemail: request?.isVoicemail || null,
                                        recordfile: request?.recordfile || null,
                                        transcriptedFile: request?.transcriptedFile || null,
                                        hangupCause: request?.hangupCause || null,
                                        totalCallAttempts: (campaignNumber.totalCallAttempts || 0) +
                                            (canConsumeAttempt || shouldCheck ? 1 : 0),
                                        callStatus: shouldCheck ? "ANSWERED" : "NO ANSWER",
                                        startExecutionDate: nextStartExecutionDate,
                                    },
                                });
                                if (["COMPLETED", "ATTEMPT_LIMIT_EXHAUSTED"].includes(nextRequestStatus)) {
                                    await this.releaseLeadReservation(CampaignNumberModel, campaignNumberId);
                                }
                                shouldUpdateAnalytics = true;
                            }
                            //============================When call failed and sipcallId same then only update latest status=====
                            if (sipcallAlreadyProcessed) {
                                await CampaignNumberModel.updateOne({ _id: campaignNumberId }, {
                                    $set: {
                                        systemDisposition: (agentDisconnectCallStatus) ? "AGENT_ABANDONED" : request?.hangupCause,
                                        billSec: (agentDisconnectCallStatus) ? 0 : billedSecond,
                                        duration: billedDuration,
                                        callEndTime: request?.time || null,
                                        hangupCause: request?.hangupCause || null,
                                        isVoicemail: request?.isVoicemail || null,
                                        recordfile: request?.recordfile || null,
                                        transcriptedFile: request?.transcriptedFile || null,
                                    },
                                });
                                shouldUpdateAnalytics = true;
                            }
                            if (shouldUpdateAnalytics) {
                                const remainingScheduled = await CampaignNumberModel.countDocuments({
                                    campaignId,
                                    isDnc: false,
                                    company_uuid: companyId,
                                    requestStatus: { $in: ["SCHEDULED", "IN_PROCESS"] },
                                });
                                if (remainingScheduled === 0) {
                                    await CampaignModel.updateOne({ _id: campaignId, company_uuid: companyId }, { $set: { campaignStatus: "COMPLETED" } });
                                }
                                if (campaignId) {
                                    await this.queueOrRunCampaignAnalyticsSync(campaignId.toString(), userData, { refreshDncStatus: false });
                                }
                            }
                        }
                    }
                }
                /* ------------------ SOCKET EVENT ------------------ */
                // if (typeof request?.balance !== "undefined") {
                //     await NatsController.publishEvent("socket.emitSocketId", {
                //         socketId: request?.domain,
                //         emitter: "wallet-updated",
                //         payload: { amount: request?.balance },
                //     });
                // }
                return request;
            }
            return {};
        }
        catch (error) {
            console.error("[contactActivityCallSave] ERROR:", error);
            throw new HttpException_1.HttpException(422, error?.message);
        }
    }
    static async walletUpdateWebhook(request) {
        try {
            /* ------------------ SOCKET EVENT ------------------ */
            if (typeof request?.balance !== "undefined") {
                // Do not block webhook response on socket publish.
                void NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                    socketId: request?.domain,
                    emitter: "wallet-updated",
                    payload: { amount: request?.balance },
                }, 1500).catch((error) => {
                    console.error("🚀 ~ CampaignRepository ~ walletUpdateWebhook ~ socket ~ error:", error?.message || error);
                });
            }
            // Do not block webhook response on CRM sync.
            // void axios.post(
            //     `${secret.MAIN_API_URL}/crm/create-call-log`,
            //     request,
            //     {
            //         headers: { "Content-Type": "application/json" },
            //         timeout: 5000,
            //     },
            // ).catch((error: any) => {
            //     console.error("🚀 ~ CampaignRepository ~ walletUpdateWebhook ~ CRM ~ error:", error?.message || error)
            // });
            return request;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error?.message);
        }
    }
    static async contactActivityNoteSave(request, userData) {
        try {
            const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
            const tenantDB = await this.getTenantDBFromUser(userData);
            const ContactModel = tenantDB.models.contact;
            const CallNoteModel = tenantDB.models.call_note;
            const CampaignNumberModel = tenantDB.models.campaign_number;
            const UserSessionModel = mainDB.models.user_session;
            let setContactId = request?.contact_uuid
                ? request?.contact_uuid
                : request?.contact_uuid;
            let setSipcallId = request?.sipcallID
                ? request?.sipcallID
                : request?.sipcall_id;
            const getContact = await ContactModel.findOne({
                _id: new mongoose_1.default.Types.ObjectId(setContactId),
                companyId: String(userData?.company_uuid),
                deletedAt: null,
            });
            if (setContactId || getContact || setSipcallId) {
                let response = {};
                let campaignNumberId = request?.campaign_detail?.campaignNumberId;
                let source = "Contact";
                let findNote = setContactId
                    ? { contactId: setContactId }
                    : { sipcallId: setSipcallId };
                const checkNoteExit = await CallNoteModel.findOne(findNote);
                let callNotePayload = {
                    companyId: userData?.company_uuid,
                    campaignNumberId: request?.campaign_detail?.campaignNumberId,
                    campaignDetail: request?.campaign_detail,
                    contactId: setContactId,
                    sipcallId: setSipcallId,
                    source: source,
                    notes: [
                        ...(checkNoteExit?.notes || []),
                        ...(Array.isArray(request?.note)
                            ? request.note
                            : request?.note
                                ? [request.note]
                                : []),
                    ],
                };
                let callNoteUpdatePayload = {};
                if (setContactId) {
                    callNoteUpdatePayload.contactId = request.contact_uuid;
                }
                else if (request?.sipcall_id) {
                    callNoteUpdatePayload.sipcallId = request.sipcall_id;
                }
                if (checkNoteExit) {
                    await CallNoteModel.updateOne(callNoteUpdatePayload, {
                        $set: callNotePayload,
                    });
                }
                else {
                    await CallNoteModel.create(callNotePayload);
                }
                if (campaignNumberId) {
                    const campaignNumber = await CampaignNumberModel.findOne({
                        _id: new mongoose_1.default.Types.ObjectId(campaignNumberId),
                    });
                    if (campaignNumber) {
                        const notesAdded = Array.isArray(request?.note)
                            ? request.note.length
                            : request?.note
                                ? 1
                                : 0;
                        const rawDisposition = request?.disposition;
                        const dispositionValue = typeof rawDisposition === "string"
                            ? rawDisposition
                            : rawDisposition?.disposition || rawDisposition?.name || null;
                        campaignNumber.disposition = request?.disposition;
                        // campaignNumber.disposition =
                        //     [
                        //         ...(Array.isArray(campaignNumber.disposition) ? campaignNumber.disposition : []),
                        //         request?.disposition
                        //     ];
                        if (request?.callback_scheduled_date) {
                            campaignNumber.startExecutionDate =
                                request?.callback_scheduled_date;
                            campaignNumber.requestStatus = "CALLBACK_SCHEDULED";
                        }
                        response = {
                            ...response,
                            campaignNumber: await campaignNumber.save(),
                        };
                        await this.releaseLeadReservation(CampaignNumberModel, campaignNumberId);
                    }
                    else {
                        throw new HttpException_1.HttpException(422, `Campaign number not found`);
                    }
                }
                return response;
            }
            else {
                throw new HttpException_1.HttpException(422, `Contact not found`);
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    /* -----------------> INTERNAL USAGE FUNCTIONS <----------------- */
    static async campaignContactAssignment(leads, members) {
        let recordIndex = 0;
        const memberAssignments = new Map();
        members.forEach((member, i) => {
            const memberId = typeof member === "string" ? member : member?.user_uuid;
            const assignCount = Math.floor(leads.length / members.length) +
                (i < leads.length % members.length ? 1 : 0);
            memberAssignments.set(String(memberId), 0);
            for (let j = 0; j < assignCount; j++) {
                if (leads[recordIndex]) {
                    leads[recordIndex].assignedTo = memberId;
                    memberAssignments.set(String(memberId), memberAssignments.get(String(memberId)) + 1);
                    recordIndex++;
                }
            }
        });
        return {
            leads,
            memberAssignments,
        };
    }
    static async campaignRandomContacts(userData, contactLimit, campaignId, campaignType = null) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignModel = mainDB.models.campaign;
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const DncNumberModel = await this.getDncModel();
        const checkCampaignExist = await CampaignModel.findById(new mongoose_1.default.Types.ObjectId(campaignId))
            .select(`_id name campaignStatus company_uuid callerId agentDisposition systemDisposition queue_extension domain
        siteId script description allowSkipping rotateCallerId agentScripting dialMethod dialerSetting settings created_at`)
            .lean();
        if (!checkCampaignExist) {
            throw new HttpException_1.HttpException(422, `Campaign does not exist.`);
        }
        const scheduledExists = await CampaignNumberModel.exists({
            campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
            requestStatus: { $in: ["SCHEDULED"] },
        });
        if (!scheduledExists) {
            const staleInProcessCutoff = new Date(Date.now() - 300 * 1000);
            const res = await CampaignNumberModel.updateMany({
                campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
                requestStatus: "IN_PROCESS",
                updatedAt: { $lte: staleInProcessCutoff },
            }, {
                $set: {
                    requestStatus: "SCHEDULED",
                    startExecutionDate: null,
                    systemDisposition: null
                },
            });
        }
        const now = new Date();
        const randomContactEligibilityMatch = {
            campaignId: new mongoose_1.default.Types.ObjectId(campaignId),
            requestStatus: { $in: ["SCHEDULED", "CALLBACK_SCHEDULED"] },
            $or: [{ startExecutionDate: { $lt: now } }, { startExecutionDate: null }]
        };
        const randomContactMatch = {
            ...randomContactEligibilityMatch,
            isDnc: false,
        };
        const randomBatchSize = Math.max(contactLimit * 10, 20);
        const candidateContacts = await CampaignNumberModel.aggregate([
            {
                $match: randomContactMatch,
            },
            {
                $facet: {
                    nullStartExecutionDateRows: [
                        { $match: { startExecutionDate: null } },
                        { $sample: { size: randomBatchSize } },
                    ],
                    dueStartExecutionDateRows: [
                        { $match: { startExecutionDate: { $lt: now } } },
                        { $sample: { size: randomBatchSize } },
                    ],
                },
            },
            {
                $project: {
                    mergedRows: {
                        $concatArrays: [
                            "$nullStartExecutionDateRows",
                            "$dueStartExecutionDateRows",
                        ],
                    },
                },
            },
            { $unwind: "$mergedRows" },
            { $replaceRoot: { newRoot: "$mergedRows" } },
            {
                $project: {
                    requestStatus: 0,
                    contactNumberType: 0,
                    agentActivity: 0,
                    errorResponse: 0,
                    disposition: 0,
                    cost: 0,
                    createdById: 0,
                },
            },
        ]);
        const result = [];
        for (const candidateContact of candidateContacts) {
            if (result.length >= contactLimit) {
                break;
            }
            const isDnc = await this.isNumberInDnc(DncNumberModel, candidateContact?.contactNumber, userData?.company_uuid);
            if (isDnc) {
                await CampaignNumberModel.updateOne({ _id: candidateContact?._id }, { $set: { isDnc: true } });
                continue;
            }
            result.push(candidateContact);
        }
        return {
            randomContacts: result,
            campaignDetail: checkCampaignExist,
        };
    }
    static async openCampaignList(companyId) {
        const nowUTC = new Date();
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const CampaignModel = mainDB.models.campaign;
        const campaigns = await CampaignModel.find({
            campaignStatus: ICampaign_1.campaignStatus.PROCESSING,
            dialMethod: { $in: ["PROGRESSIVE", "PREVIEW", "PREDICTIVE"] },
            company_uuid: String(companyId),
        }).sort({ createdAt: -1 });
        const openCampaignList = [];
        for (const campaign of campaigns) {
            const campaignTz = campaign.timezone || "UTC";
            const localMoment = moment_1.default.utc(nowUTC).tz(campaignTz);
            const localDateString = localMoment.format("YYYY-MM-DD");
            const campaignStart = campaign?.startDate
                ? moment_1.default.utc(campaign.startDate).tz(campaignTz)
                : null;
            const campaignEnd = campaign?.endDate
                ? moment_1.default.utc(campaign.endDate).tz(campaignTz)
                : null;
            if (campaignStart && localMoment.isBefore(campaignStart)) {
                continue;
            }
            if (campaignEnd && localMoment.isAfter(campaignEnd)) {
                continue;
            }
            const holidays = campaign?.settings?.operational_hours?.holidays || [];
            if (holidays.includes(localDateString)) {
                continue;
            }
            const dayName = localMoment.format("dddd").toLowerCase(); // e.g., 'monday'
            const dayConfig = campaign.settings?.operational_hours?.value?.[dayName];
            if (dayConfig?.open && dayConfig?.start && dayConfig?.end) {
                const startTime = moment_1.default.tz(dayConfig.start, "HH:mm", campaignTz);
                const endTime = moment_1.default.tz(dayConfig.end, "HH:mm", campaignTz);
                startTime
                    .year(localMoment.year())
                    .month(localMoment.month())
                    .date(localMoment.date());
                endTime
                    .year(localMoment.year())
                    .month(localMoment.month())
                    .date(localMoment.date());
                if (localMoment.isBetween(startTime, endTime, null, "[]")) {
                    openCampaignList.push(campaign);
                }
            }
        }
        const openCampaignIds = openCampaignList.map((openCampaign) => openCampaign?._id);
        return { openCampaignList, openCampaignIds };
    }
    static async LeadAssignmentHandler(members, campaignId, isNewCampaign = false, userData, options) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignModel = mainDB.models.campaign;
        const ContactModel = tenantDB.models.contact;
        const CampaignNumberModel = tenantDB.models.campaign_number;
        const DncNumberModel = await this.getDncModel();
        const campaignResult = await CampaignModel.findOne({
            _id: new mongoose_1.Types.ObjectId(campaignId),
        });
        let groupId = campaignResult?.groupId;
        let dialerSetting = campaignResult?.dialerSetting;
        let dialMethod = campaignResult?.dialMethod;
        let totalDnc = 0;
        const normalizedGroupIds = Array.from(new Set((Array.isArray(groupId) ? groupId : [groupId])
            .map((id) => String(id))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)))).map((id) => new mongoose_1.default.Types.ObjectId(id));
        // ======= CLEANUP OLD ENTRIES =======
        await CampaignNumberModel.deleteMany({
            campaignId: campaignId,
            startExecutionDate: { $lte: new Date() },
            systemDisposition: null, // Remove inactive records
        });
        // ======= FETCH CONTACTS =======
        const contactGroupFilter = {
            companyId: String(campaignResult.company_uuid),
            deletedAt: null,
            groupMeta: { $in: normalizedGroupIds },
            "contact.phone": { $nin: [null, ""] },
        };
        const distinctContactIds = await ContactModel.distinct("_id", contactGroupFilter);
        const contactGroupCount = await tenantDB.models.contact_group.countDocuments({
            _id: { $in: normalizedGroupIds },
            companyId: String(campaignResult.company_uuid),
            isActive: true,
        });
        if (!contactGroupCount) {
            throw new HttpException_1.HttpException(422, "Contact group does not exist.");
        }
        if (!distinctContactIds.length) {
            throw new HttpException_1.HttpException(422, "Please add contacts in the contact group.");
        }
        // Exclude contacts that are already assigned to this campaign to avoid duplicates.
        const existingCampaignContacts = await CampaignNumberModel.find({
            campaignId: campaignId,
            contactId: { $in: distinctContactIds },
        }, { contactId: 1 }).lean();
        const existingContactIdSet = new Set(existingCampaignContacts
            .map((item) => item?.contactId?.toString())
            .filter((id) => Boolean(id)));
        const filteredContactIds = distinctContactIds.filter((id) => !existingContactIdSet.has(id.toString()));
        if (!filteredContactIds.length) {
            await this.syncCampaignAnalyticsAndMembers(campaignId.toString(), userData);
            return true;
        }
        const getContacts = await ContactModel.find({
            _id: { $in: filteredContactIds },
            type: "LEAD"
        }).lean();
        // ======= BUILD NEW CONTACT LIST =======
        let finalCampaignListArr = await Promise.all(getContacts.map(async (element) => {
            const contactNumber = element?.contact?.phone || null;
            const isDnc = await this.isNumberInDnc(DncNumberModel, contactNumber, userData?.company_uuid);
            totalDnc += isDnc ? 1 : 0;
            const contactName = [
                element?.name?.first,
                element?.name?.middle,
                element?.name?.last,
            ].map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean).join(" ");
            const hasUsableContactName = Boolean(contactName && !/^\+?[\d\s().-]+$/.test(contactName));
            if (!hasUsableContactName) {
                console.warn("[LeadAssignmentHandler] Contact has no usable name", {
                    contactId: element?._id?.toString?.() || null,
                    campaignId: campaignId.toString(),
                });
            }
            return {
                contactName: hasUsableContactName ? contactName : "Unknown",
                contactEmail: element?.contact?.email || null,
                contactNumber,
                contactNumberType: null,
                contactId: element._id,
                remainingCallAttempts: dialerSetting?.max_attempt_per_record,
                campaignId: campaignId,
                company_uuid: campaignResult.company_uuid,
                createdById: campaignResult.createdById,
                campaignDetail: {
                    campaignName: campaignResult?.name,
                    campaignType: dialMethod,
                    siteId: campaignResult?.siteId ?? null
                },
                isDnc,
            };
        }));
        async function insertInChunks(Model, data, label, batchSize = 500) {
            const chunks = CommonHelper_1.default.chunkArray(data, batchSize);
            for (const [index, chunk] of chunks.entries()) {
                try {
                    await Model.insertMany(chunk, { ordered: false });
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.warn(`${label} chunk ${index + 1} partially failed: ${message}`);
                }
            }
        }
        // ======= INSERT CAMPAIGN NUMBERS SAFELY =======
        // ======= ASSIGNMENT LOGIC =======
        const BATCH_SIZE = 500;
        // if (dialMethod !== 'PREDICTIVE') {
        if (!isNewCampaign) {
            // Remove pending numbers before reassignment
            const freeAssignments = await CampaignNumberModel.find({
                company_uuid: campaignResult.company_uuid,
                status: ICampaignNumber_1.statusEnum.PENDING,
            }, { campaignNumberId: 1 });
            const campaignNumberIds = freeAssignments.map((a) => a.campaignNumberId);
            for (let i = 0; i < campaignNumberIds.length; i += BATCH_SIZE) {
                await CampaignNumberModel.deleteMany({
                    campaignNumberId: { $in: campaignNumberIds.slice(i, i + BATCH_SIZE) },
                });
            }
        }
        // Assign contacts
        if (dialMethod !== "PREDICTIVE" && !this.isRealtimeReservationDialMethod(dialMethod)) {
            let { leads } = await this.campaignContactAssignment(finalCampaignListArr, members);
            finalCampaignListArr = leads;
        }
        await insertInChunks(CampaignNumberModel, finalCampaignListArr, isNewCampaign ? "CampaignNumber" : "New Assignment", BATCH_SIZE);
        if (options?.syncAnalyticsAfterAssignment !== false) {
            await this.syncCampaignAnalyticsAndMembers(campaignId.toString(), userData, { refreshDncStatus: true });
            await this.notifyCampaignAnalyticsSyncCompletion(campaignId.toString(), userData);
        }
        return true;
    }
    static async processCampaignLeadAssignmentJob({ members, campaignId, isNewCampaign = false, userData, }) {
        try {
            await this.LeadAssignmentHandler(members, new mongoose_1.default.Types.ObjectId(campaignId), isNewCampaign, userData, { syncAnalyticsAfterAssignment: true });
            await this.notifyCampaignLeadAssignmentCompletion(campaignId, userData, true);
        }
        catch (error) {
            await this.notifyCampaignLeadAssignmentCompletion(campaignId, userData, false, error?.message);
            throw error;
        }
    }
    static async processCampaignAnalyticsSyncJob({ campaignId, userData, options, }) {
        await this.syncCampaignAnalyticsAndMembers(campaignId, userData, options);
        await this.notifyCampaignAnalyticsSyncCompletion(campaignId, userData);
    }
    static async saveMemberCallAnalytics(requestData, memberUserId) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const MemberCallAnalyticsModel = mainDB.models.member_call_analytics;
        const { direction, status, duration = 0, isVoicemail, CampaignType, extension, accountcode, time, } = requestData;
        const company_uuid = accountcode;
        const inc = {
            totalCalls: 1,
        };
        if (direction === "Outbound") {
            inc.selfTotalCall = 1;
            inc.selfCallTotalDuration = duration || 0;
            if (status === "ANSWERED") {
                inc.selfTotalAnsweredCall = 1;
            }
        }
        if (CampaignType) {
            inc.totalCampaignCalls = 1;
            inc.totalCampaignCallDurations = duration || 0;
            if (status === "ANSWERED") {
                inc.totalCampaignAnsweredCalls = 1;
            }
        }
        if (direction === "Inbound") {
            inc.totalInboundCalls = 1;
            inc.totalInboundCallDurations = duration || 0;
            if (status === "ANSWERED") {
                inc.selfTotalAnsweredCall = 1;
            }
        }
        if (isVoicemail === 1) {
            inc.totalVoicemails = 1;
        }
        if (status !== "ANSWERED") {
            inc.totalMissedCalls = 1;
        }
        await MemberCallAnalyticsModel.updateOne({
            company_uuid: String(company_uuid),
            user_uuid: String(memberUserId),
            extension,
        }, {
            $inc: inc,
            $set: {
                updatedAt: new Date(time || Date.now()),
            },
            $setOnInsert: {
                createdAt: new Date(time || Date.now()),
            },
        }, { upsert: true });
    }
}
exports.CampaignRepository = CampaignRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/CampaignRepository.ts?
}