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
exports.LeadRepository = void 0;
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
const csv_parser_1 = __importDefault(__webpack_require__(/*! csv-parser */ "csv-parser"));
const xlsx_1 = __importDefault(__webpack_require__(/*! xlsx */ "xlsx"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const stream_1 = __webpack_require__(/*! stream */ "stream");
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const CommonHelper_1 = __importDefault(__webpack_require__(/*! @/helpers/CommonHelper */ "./src/helpers/CommonHelper.ts"));
const queues_1 = __webpack_require__(/*! @/queues */ "./src/queues/index.ts");
const jobOptions_1 = __webpack_require__(/*! @/queues/jobOptions */ "./src/queues/jobOptions.ts");
const redis_1 = __webpack_require__(/*! @/config/redis */ "./src/config/redis.ts");
const CRMApiService_1 = __webpack_require__(/*! @/services/CRMApiService */ "./src/services/CRMApiService.ts");
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const NatsController_1 = __webpack_require__(/*! @/nats/NatsController */ "./src/nats/NatsController.ts");
class LeadRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static UPLOAD_NAME_MAX_LENGTH = 50;
    static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    static escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    static sanitizeUploadName(value) {
        return String(value ?? "")
            .trim()
            .slice(0, LeadRepository.UPLOAD_NAME_MAX_LENGTH);
    }
    static sanitizeUploadEmail(value) {
        const normalizedEmail = String(value ?? "").trim();
        return LeadRepository.EMAIL_REGEX.test(normalizedEmail) ? normalizedEmail : "";
    }
    static normalizeUploadedLeadRow(row, phone) {
        return {
            firstName: LeadRepository.sanitizeUploadName(row?.firstName),
            lastName: LeadRepository.sanitizeUploadName(row?.lastName),
            email: LeadRepository.sanitizeUploadEmail(row?.email),
            phone,
        };
    }
    static normalizeGroupObjectIds(groupIds = []) {
        return Array.from(new Set((groupIds || [])
            .map((id) => String(id))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)))).map((id) => new mongoose_1.Types.ObjectId(id));
    }
    static buildGroupMetaFilter(groupIds = []) {
        const normalizedGroupIds = this.normalizeGroupObjectIds(groupIds);
        if (!normalizedGroupIds.length) {
            return {};
        }
        return { groupMeta: { $in: normalizedGroupIds } };
    }
    static extractGroupIds(groupMeta = []) {
        return Array.from(new Set((groupMeta || [])
            .filter(Boolean)
            .map((id) => String(id))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))));
    }
    static buildGroupAuditUser(userData) {
        return {
            user_uuid: userData?.user_uuid ? String(userData.user_uuid) : null,
            company_uuid: userData?.company_uuid ? String(userData.company_uuid) : null,
            name: userData?.username ? String(userData.username) : null,
            extension: userData?.extension ? String(userData.extension) : null,
        };
    }
    static async syncGroupLeadCounts(ContactModel, contactGroupModel, companyUuid, groupIds, updatedBy) {
        const uniqueGroupIds = Array.from(new Set((groupIds || [])
            .map((id) => String(id))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))));
        if (!uniqueGroupIds.length)
            return;
        const updates = await Promise.all(uniqueGroupIds.map(async (groupId) => {
            const groupObjectId = new mongoose_1.Types.ObjectId(groupId);
            const actualContactCount = await ContactModel.countDocuments({
                companyId: companyUuid,
                deletedAt: null,
                ...this.buildGroupMetaFilter([groupObjectId]),
            });
            const updateSet = { contactCount: actualContactCount };
            if (updatedBy) {
                updateSet.updatedBy = updatedBy;
            }
            return {
                updateOne: {
                    filter: { _id: groupObjectId },
                    update: { $set: updateSet },
                },
            };
        }));
        if (updates.length) {
            await contactGroupModel.bulkWrite(updates);
        }
    }
    static async leadList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const groupId = requestData?.groupId;
            const skip = (page - 1) * limit;
            const tenantDB = await this.getTenantDBFromUser(userData);
            const ContactModel = tenantDB.models.contact;
            const contactGroupModel = tenantDB.models.contact_group;
            const contactGroupCollectionName = contactGroupModel.collection.name;
            // 1. Precise Match Stage
            const matchStage = {
                companyId: String(userData?.company_uuid),
                deletedAt: null,
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [
                    { "name.first": { $regex: search, $options: "i" } },
                    { "name.middle": { $regex: search, $options: "i" } },
                    { "name.last": { $regex: search, $options: "i" } },
                    { "contact.email": { $regex: search, $options: "i" } },
                    { "contact.phone": { $regex: search, $options: "i" } },
                ];
            }
            // Group based filter
            if (groupId) {
                const groupMetaFilter = this.buildGroupMetaFilter([groupId]);
                if (Object.keys(groupMetaFilter).length) {
                    matchStage.$and = [...(matchStage.$and || []), groupMetaFilter];
                }
            }
            // Optimized Pipeline
            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: contactGroupCollectionName,
                        localField: "groupMeta",
                        foreignField: "_id",
                        as: "groups"
                    }
                },
                {
                    $facet: {
                        rows: [
                            { $sort: { created_at: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                            // Project only necessary fields for the list to save memory
                            {
                                $project: {
                                    _id: 1,
                                    firstName: "$name.first",
                                    middleName: "$name.middle",
                                    lastName: "$name.last",
                                    email: "$contact.email",
                                    phone: "$contact.phone",
                                    company_uuid: "$companyId",
                                    groupId: "$groupMeta",
                                    title: "$profile.title",
                                    company: "$profile.company",
                                    website: "$profile.webpage",
                                    address: 1,
                                    socialMedia: "$social",
                                    fetchContactWhichCrm: "$crm.fetchContactWhichCrm",
                                    pushContactWhichCrm: "$crm.pushContactWhichCrm",
                                    createdAt: 1,
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
            // 3. Execution
            const [result] = await ContactModel.aggregate(pipeline);
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
    static async updateLead(requestData, userData) {
        try {
            const tenantDB = await this.getTenantDBFromUser(userData);
            const ContactModel = tenantDB.models.contact;
            const contactGroupModel = tenantDB.models.contact_group;
            const isContactExist = await ContactModel.findOne({
                _id: new mongoose_1.default.Types.ObjectId(requestData.leadId),
                companyId: String(userData?.company_uuid),
                deletedAt: null,
            });
            if (!isContactExist) {
                throw Error(`contact lead ID does not exist.`);
            }
            const previousGroupIds = this.extractGroupIds(isContactExist?.groupMeta || []);
            const newGroupIds = (requestData?.groupId || [])
                .map(id => id.toString())
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
            const updatedGroupIds = Array.from(new Set([...newGroupIds]));
            let phone = requestData.phone;
            if (phone) {
                const validated = await CommonHelper_1.default.sanitizePhoneNumber(phone, 1);
                if (validated?.message !== "Valid")
                    throw new Error("Invalid phone");
                phone = `+${validated.phoneNumber}`;
            }
            const updatePayload = {
                "name.first": requestData?.firstName,
                "name.middle": requestData?.middleName,
                "name.last": requestData?.lastName,
                "contact.email": requestData?.email,
                "contact.phone": phone,
                groupMeta: updatedGroupIds.map((id) => new mongoose_1.Types.ObjectId(id)),
                "profile.company": requestData?.company,
                "profile.webpage": requestData?.website,
                "profile.title": requestData?.title,
                "social.twitter": requestData?.twitter,
                "social.facebook": requestData?.facebook,
                "social.linkedin": requestData?.linkedin,
                "address.street": requestData?.street,
                "address.city": requestData?.city,
                "address.state": requestData?.state,
                "address.zipcode": requestData?.zipcode,
                "address.country": requestData?.country,
                "meta.updatedBy": [String(userData?.user_uuid)],
            };
            Object.keys(updatePayload).forEach(key => (updatePayload[key] === undefined || updatePayload[key] === null || Array.isArray(updatePayload[key]) && updatePayload[key].length === 0) &&
                delete updatePayload[key]);
            await ContactModel.findOneAndUpdate({
                _id: new mongoose_1.default.Types.ObjectId(requestData.leadId),
                companyId: String(userData?.company_uuid),
                deletedAt: null,
            }, { $set: updatePayload }, { returnDocument: "after" });
            await this.syncGroupLeadCounts(ContactModel, contactGroupModel, String(userData.company_uuid), [...previousGroupIds, ...updatedGroupIds]);
            return true;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async deleteLead(requestData, userData) {
        try {
            if (!requestData) {
                throw new HttpException_1.HttpException(422, `No data received.`);
            }
            if (!mongoose_1.Types.ObjectId.isValid(requestData?.leadId) && requestData?.leadId) {
                throw new HttpException_1.HttpException(422, `The provided contact ID is invalid.`);
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const ContactModel = tenantDB.models.contact;
            const contactGroupModel = tenantDB.models.contact_group;
            if (requestData?.leadId && requestData?.leadId !== '') {
                const contactExists = await ContactModel.exists({
                    _id: requestData?.leadId,
                    companyId: String(userData.company_uuid),
                    deletedAt: null,
                });
                if (!contactExists) {
                    throw new HttpException_1.HttpException(404, `Lead does not exist.`);
                }
            }
            const deletedLead = await ContactModel.findOneAndUpdate({
                _id: new mongoose_1.Types.ObjectId(String(requestData?.leadId)),
                companyId: String(userData.company_uuid),
                deletedAt: null,
            }, {
                $set: { deletedAt: new Date() },
            }, { returnDocument: "after" });
            if (!deletedLead) {
                throw new HttpException_1.HttpException(404, 'Lead not found');
            }
            // Update lead count in group
            const groupIds = this.extractGroupIds(deletedLead.groupMeta || []);
            if (Array.isArray(groupIds) && groupIds.length > 0) {
                await this.syncGroupLeadCounts(ContactModel, contactGroupModel, String(userData.company_uuid), groupIds, this.buildGroupAuditUser(userData));
            }
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
        return { messages: "Lead deleted successfully." };
    }
    static async addLeadCsvXlsx(requestData, userData) {
        const file = requestData.file;
        const groupId = requestData.body.groupId;
        const countryPrefix = requestData.body.countryPrefix;
        const strictCountryCode = CommonHelper_1.default.parseBooleanUploadOption(requestData.body.strictCountryCode);
        if (!file)
            throw new HttpException_1.HttpException(422, "File is required");
        const allowedColumns = ["firstName", "lastName", "email", "phone"];
        // ---------------- CHECK EXTENSION ----------------
        const name = file.originalname.toLowerCase();
        const isCSV = name.endsWith(".csv");
        const isXLSX = name.endsWith(".xlsx") || name.endsWith(".xls");
        if (!isCSV && !isXLSX) {
            throw new HttpException_1.HttpException(422, "Only CSV and XLSX formats are supported");
        }
        // Convert buffer properly
        const buffer = file.buffer?.data
            ? Buffer.from(file.buffer.data)
            : Buffer.from(file.buffer);
        // ---------------- VALIDATE FILE BEFORE QUEUE ----------------
        if (isCSV) {
            // Validate CSV headers
            await new Promise((resolve, reject) => {
                const stream = stream_1.Readable.from(buffer);
                stream
                    .pipe((0, csv_parser_1.default)())
                    .on("headers", (headers) => {
                    const isValid = headers.length === allowedColumns.length &&
                        headers.every((c, i) => c === allowedColumns[i]);
                    if (!isValid) {
                        return reject(new HttpException_1.HttpException(422, `Invalid headers. Allowed: ${allowedColumns.join(", ")}`));
                    }
                    resolve(true);
                })
                    .on("error", () => reject(new HttpException_1.HttpException(422, "CSV Parsing Error")));
            });
        }
        if (isXLSX) {
            try {
                const workbook = xlsx_1.default.read(buffer, { type: "buffer" });
                const sheetName = workbook.SheetNames?.[0];
                if (!sheetName) {
                    throw new HttpException_1.HttpException(422, "XLSX file has no sheets");
                }
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx_1.default.utils.sheet_to_json(sheet, { defval: "" });
                if (!rows.length) {
                    throw new HttpException_1.HttpException(422, "XLSX file contains no data");
                }
                const headers = Object.keys(rows[0]);
                const isValid = headers.length === allowedColumns.length &&
                    headers.every((c, i) => c === allowedColumns[i]);
                if (!isValid) {
                    throw new HttpException_1.HttpException(422, `Invalid headers. Allowed: ${allowedColumns.join(", ")}`);
                }
            }
            catch {
                throw new HttpException_1.HttpException(422, "XLSX Parsing Error");
            }
        }
        // ---------------- SAVE TMP FILE ----------------
        const tmpDir = path_1.default.join(__dirname, "../tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tempPath = path_1.default.join(tmpDir, `${Date.now()}_${file.originalname}`);
        fs.writeFileSync(tempPath, buffer);
        // ---------------- ADD TO QUEUE ----------------
        let queueData = {
            filePath: tempPath,
            userData,
            groupId,
            countryPrefix,
            strictCountryCode
        };
        if (redis_1.isRedisEnabled && queues_1.Queues.LEAD) {
            await queues_1.Queues.LEAD.add("process", queueData, jobOptions_1.defaultJobOptions);
            return {
                message: "File is being processed in background",
            };
        }
        const processSummary = await this.processLeadFile(queueData);
        return {
            message: "File processed without Redis queue because REDIS_ENABLED=false",
            result: processSummary,
        };
    }
    static async processLeadFile({ filePath, userData, groupId, countryPrefix, strictCountryCode }) {
        let buffer;
        const leadSuccessionObj = { success: 0, fail: 0, duplicate: 0 };
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const UserSessionModel = mainDB.models.user_session;
        const notifyLeadProcessCompletion = async () => {
            try {
                let socketIdArr = [];
                const userSession = await UserSessionModel.findOne({
                    userUuid: userData?.user_uuid,
                    extension: userData?.extension,
                });
                socketIdArr = socketIdArr.concat(userSession?.socketId || []);
                await NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                    socketId: socketIdArr,
                    emitter: "lead-process-response",
                    payload: leadSuccessionObj,
                });
            }
            catch (error) {
                console.error("Lead process notification failed:", error?.message || error);
            }
        };
        try {
            // ---------------- READ FILE ----------------
            try {
                buffer = fs.readFileSync(filePath);
            }
            catch {
                console.error("Failed to read file:", filePath);
                await notifyLeadProcessCompletion();
                return leadSuccessionObj;
            }
            const BATCH_SIZE = 10;
            const CRM_CALL_DELAY_MS = 500;
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            let isFirstCRMCall = true;
            const fileName = filePath.toLowerCase();
            const isCSV = fileName.endsWith(".csv");
            const tenantDB = await this.getTenantDBFromUser(userData);
            const ContactModel = tenantDB.models.contact;
            const contactGroupModel = tenantDB.models.contact_group;
            const normalizedGroupIds = Array.isArray(groupId) ? groupId : [groupId];
            const validGroupObjectIds = normalizedGroupIds
                .map((id) => String(id))
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.Types.ObjectId(id));
            if (!validGroupObjectIds.length) {
                throw new HttpException_1.HttpException(422, "Valid groupId is required");
            }
            const validGroupCount = await contactGroupModel.countDocuments({
                _id: { $in: validGroupObjectIds },
                companyId: String(userData.company_uuid),
                isActive: true,
            });
            if (validGroupCount !== validGroupObjectIds.length) {
                throw new HttpException_1.HttpException(422, "One or more contact groups do not exist.");
            }
            // ---------------- CSV PARSER ----------------
            const parseCSV = () => new Promise((resolve, reject) => {
                const rows = [];
                let headersValidated = false;
                stream_1.Readable.from(buffer)
                    .pipe((0, csv_parser_1.default)())
                    .on("headers", () => {
                    headersValidated = true;
                })
                    .on("data", (data) => {
                    if (!headersValidated)
                        return;
                    if (!countryPrefix) {
                        rows.push(LeadRepository.normalizeUploadedLeadRow(data, data.phone?.toString().trim() || ""));
                        return;
                    }
                    const result = CommonHelper_1.default.normalizePhoneWithCountryCode(data.phone, countryPrefix, strictCountryCode);
                    if (!result.isValid) {
                        leadSuccessionObj.fail++;
                        return;
                    }
                    rows.push(LeadRepository.normalizeUploadedLeadRow(data, result.phone));
                })
                    .on("end", () => resolve(rows))
                    .on("error", () => reject(new HttpException_1.HttpException(422, "CSV Parsing Error")));
            });
            // ---------------- XLSX PARSER ----------------
            const parseXLSX = () => new Promise((resolve, reject) => {
                try {
                    const workbook = xlsx_1.default.read(buffer, { type: "buffer" });
                    const sheetName = workbook.SheetNames?.[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = xlsx_1.default.utils.sheet_to_json(sheet, { defval: "" });
                    const parsed = rows
                        .map((r) => {
                        if (!countryPrefix) {
                            return LeadRepository.normalizeUploadedLeadRow(r, (r.phone || "").toString().trim());
                        }
                        const result = CommonHelper_1.default.normalizePhoneWithCountryCode(r.phone, countryPrefix, strictCountryCode);
                        if (!result.isValid) {
                            leadSuccessionObj.fail++;
                            return null;
                        }
                        return LeadRepository.normalizeUploadedLeadRow(r, result.phone);
                    })
                        .filter(Boolean);
                    resolve(parsed);
                }
                catch {
                    reject(new HttpException_1.HttpException(422, "XLSX Parsing Error"));
                }
            });
            // ---------------- PARSE FILE ----------------
            let parsedRows = [];
            try {
                parsedRows = isCSV ? await parseCSV() : await parseXLSX();
            }
            catch (err) {
                console.error("Parsing failed:", err.message);
                await notifyLeadProcessCompletion();
                return leadSuccessionObj;
            }
            // ---------------- PROCESS BATCHES ----------------
            const seenPhoneKeys = new Set();
            const processBatch = async (batchData) => {
                const validRecords = [];
                for (const row of batchData) {
                    try {
                        const phone = CommonHelper_1.default.formatToE164(row.phone);
                        const phoneDedupKey = CommonHelper_1.default.normalizePhoneForDuplicateCheck(phone);
                        if (!phoneDedupKey) {
                            throw new Error("INVALID_PHONE");
                        }
                        if (seenPhoneKeys.has(phoneDedupKey)) {
                            leadSuccessionObj.duplicate++;
                            continue;
                        }
                        const existing = await ContactModel.findOne({
                            companyId: String(userData?.company_uuid),
                            "contact.phone": { $regex: new RegExp(`${phoneDedupKey}$`) },
                            deletedAt: null,
                            ...this.buildGroupMetaFilter(validGroupObjectIds),
                        }).lean();
                        if (existing) {
                            leadSuccessionObj.duplicate++;
                            continue;
                        }
                        let crmLeadInfo = null;
                        try {
                            if (!isFirstCRMCall) {
                                await delay(CRM_CALL_DELAY_MS);
                            }
                            const requestData = {
                                firstName: row.firstName || "",
                                lastName: row.lastName || "",
                                phone: phone || "",
                                company: row.company || "",
                                email: row.email || "",
                            };
                            const response = await CRMApiService_1.CRMApiService.callCRMApi("crm/integrated/create-lead", "POST", requestData, userData);
                            crmLeadInfo = response?.data?.data?.result?.results || null;
                            isFirstCRMCall = false;
                        }
                        catch (error) {
                            isFirstCRMCall = false;
                            console.error("CRM lead sync failed:", error?.message || error);
                        }
                        seenPhoneKeys.add(phoneDedupKey);
                        validRecords.push({
                            companyId: userData.company_uuid,
                            deletedAt: null,
                            name: {
                                first: row.firstName,
                                middle: null,
                                last: row.lastName,
                            },
                            contact: {
                                email: row.email || null,
                                phone,
                            },
                            profile: {
                                company: row.company || null,
                            },
                            meta: {
                                createdBy: userData.user_uuid,
                                updatedBy: [userData.user_uuid],
                            },
                            groupMeta: validGroupObjectIds,
                            crm: {
                                hubSpotCrmDetails: crmLeadInfo,
                            },
                        });
                    }
                    catch {
                        leadSuccessionObj.fail++;
                    }
                }
                if (validRecords.length) {
                    try {
                        const insertedDocs = await ContactModel.insertMany(validRecords, {
                            ordered: false,
                        });
                        leadSuccessionObj.success += insertedDocs.length;
                    }
                    catch (err) {
                        const writeErrors = Array.isArray(err?.writeErrors)
                            ? err.writeErrors
                            : [];
                        if (!writeErrors.length) {
                            leadSuccessionObj.fail += validRecords.length;
                            console.error("Lead insertMany failed:", err?.message || err);
                            return;
                        }
                        const duplicateWriteErrors = writeErrors.filter((writeError) => writeError?.code === 11000).length;
                        const failedWriteErrors = writeErrors.length - duplicateWriteErrors;
                        const insertedCount = Math.max(validRecords.length - writeErrors.length, 0);
                        leadSuccessionObj.success += insertedCount;
                        leadSuccessionObj.duplicate += duplicateWriteErrors;
                        leadSuccessionObj.fail += failedWriteErrors;
                    }
                }
            };
            for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
                await processBatch(parsedRows.slice(i, i + BATCH_SIZE));
            }
            // ---------------- UPDATE GROUP ----------------
            await this.syncGroupLeadCounts(ContactModel, contactGroupModel, String(userData.company_uuid), validGroupObjectIds, this.buildGroupAuditUser(userData));
            await notifyLeadProcessCompletion();
            return leadSuccessionObj;
        }
        catch (err) {
            console.error("Unexpected failure:", err);
            await notifyLeadProcessCompletion();
            return leadSuccessionObj;
        }
        finally {
            try {
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            catch {
                console.error("❌ Failed to delete temp file:", filePath);
            }
        }
    }
    static async leadGroupUpsert(requestData, userData) {
        try {
            const { name, groupId } = requestData;
            const { user_uuid, company_uuid, username } = userData;
            const auditUser = this.buildGroupAuditUser(userData);
            const isUpdate = !!groupId;
            // Validate ObjectId if update
            if (isUpdate && !mongoose_1.default.Types.ObjectId.isValid(groupId)) {
                throw new HttpException_1.HttpException(422, 'The provided Group ID is invalid.');
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const contactGroupModel = tenantDB.models.contact_group;
            // Check duplicate group name within the same company
            const nameExists = await contactGroupModel.findOne({
                groupName: name,
                companyId: company_uuid,
                ...(isUpdate && { _id: { $ne: groupId } }),
            });
            if (nameExists) {
                throw new HttpException_1.HttpException(422, 'Group already taken for this Company.');
            }
            if (isUpdate) {
                // Update existing group (company-safe)
                const updatedGroup = await contactGroupModel.findOneAndUpdate({ _id: groupId, companyId: company_uuid }, {
                    $set: {
                        groupName: name,
                        updatedBy: auditUser,
                    },
                }, {
                    returnDocument: "after",
                    runValidators: true,
                });
                if (!updatedGroup) {
                    throw new HttpException_1.HttpException(404, 'Group does not exist.');
                }
            }
            else {
                // Create new group
                await contactGroupModel.create({
                    groupName: name,
                    companyId: company_uuid,
                    createdBy: auditUser,
                    updatedBy: auditUser,
                    generatedBy: "COMPANY",
                    groupMode: "STATIC",
                    isDefault: false,
                    isActive: true,
                    contactIds: [],
                    contactCount: 0,
                });
            }
            return true;
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException) {
                throw error;
            }
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, error.message);
            }
            throw new HttpException_1.HttpException(500, 'Internal Server Error');
        }
    }
    static async leadGroupList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const skip = (page - 1) * limit;
            const tenantDB = await this.getTenantDBFromUser(userData);
            const contactGroupModel = tenantDB.models.contact_group;
            // 1. Precise Match Stage
            const matchStage = {
                companyId: String(userData?.company_uuid),
            };
            // Use a more targeted search if possible; $or with many regex can be slow
            if (search) {
                matchStage.$or = [
                    { groupName: { $regex: search, $options: "i" } },
                    { slug: { $regex: search, $options: "i" } },
                ];
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
                                    name: "$groupName",
                                    company_uuid: "$companyId",
                                    createdById: "$createdBy",
                                    createdByName: "$createdBy",
                                    updatedBy: 1,
                                    leadCount: "$contactCount",
                                    contactCount: 1,
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
            // 3. Execution
            const [result] = await contactGroupModel.aggregate(pipeline);
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
    static async leadGroupGlobalSearch(requestData, userData) {
        try {
            const limit = Number(requestData?.limit) || 2;
            const searchText = requestData?.searchText?.toString().trim() || "";
            const matchStage = {
                company_uuid: userData.company_uuid,
            };
            if (searchText) {
                matchStage.name = {
                    $regex: this.escapeRegex(searchText),
                    $options: "i",
                };
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const GroupModel = tenantDB.models.group;
            const rows = await GroupModel.find(matchStage)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select({
                _id: 1,
                name: 1,
                leadCount: 1,
            })
                .lean();
            return { rows };
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
    static async leadGroupById(requestData, userData) {
        const { groupId } = requestData;
        if (!groupId || !mongoose_1.Types.ObjectId.isValid(groupId)) {
            throw new HttpException_1.HttpException(400, 'Invalid group id');
        }
        const tenantDB = await this.getTenantDBFromUser(userData);
        const contactGroupModel = tenantDB.models.contact_group;
        const groupDetail = await contactGroupModel.findOne({
            _id: groupId,
            companyId: String(userData.company_uuid),
        }).lean();
        if (!groupDetail) {
            throw new HttpException_1.HttpException(404, 'Group does not exist');
        }
        return {
            ...groupDetail,
            name: groupDetail.groupName,
            company_uuid: groupDetail.companyId,
            createdById: groupDetail.createdBy,
            createdByName: groupDetail.createdBy,
            leadCount: groupDetail.contactCount,
        };
    }
    static async deleteGroup(requestData, userData) {
        try {
            const { groupId } = requestData;
            const companyUuid = userData.company_uuid;
            if (!mongoose_1.default.Types.ObjectId.isValid(groupId)) {
                throw new HttpException_1.HttpException(422, 'Invalid Group ID.');
            }
            const tenantDB = await this.getTenantDBFromUser(userData);
            const contactGroupModel = tenantDB.models.contact_group;
            const deletedGroup = await contactGroupModel.findOneAndDelete({
                _id: groupId,
                companyId: companyUuid,
            });
            if (!deletedGroup) {
                throw new HttpException_1.HttpException(404, 'Group does not exist.');
            }
            return true;
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException) {
                throw error;
            }
            if (error instanceof Error) {
                throw new HttpException_1.HttpException(422, error.message);
            }
            throw new HttpException_1.HttpException(500, 'Internal Server Error');
        }
    }
}
exports.LeadRepository = LeadRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/LeadRepository.ts?
}