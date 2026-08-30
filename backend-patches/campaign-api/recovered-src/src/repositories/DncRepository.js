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
exports.DncRepository = void 0;
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
const mongoose_1 = __importDefault(__webpack_require__(/*! mongoose */ "mongoose"));
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
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const NatsController_1 = __webpack_require__(/*! @/nats/NatsController */ "./src/nats/NatsController.ts");
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
class DncRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static FTC_DNC_ITEMS_PER_PAGE = 50;
    static FTC_DNC_CREATED_BY = "system-ftc-sync";
    static FTC_DNC_NAME = "FTC DNC Complaint";
    static FTC_DNC_MAX_WINDOW_DAYS = 31;
    static FTC_DNC_REQUEST_TIMEOUT_MS = 30000;
    static normalizeFtcDate(dateValue) {
        const normalizedDate = String(dateValue ?? "").trim();
        if (!normalizedDate) {
            throw new HttpException_1.HttpException(422, "createdDateFrom and createdDateTo are required.");
        }
        const parsedDate = new Date(normalizedDate);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new HttpException_1.HttpException(422, `Invalid date: ${normalizedDate}`);
        }
        return normalizedDate;
    }
    static validateFtcConfig() {
        if (!process.env.DNC_URL || !process.env.DNC_API_KEY) {
            throw new HttpException_1.HttpException(500, "FTC DNC API configuration is missing.");
        }
    }
    static async getDncModel() {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        return mainDB.models.dnc_number;
    }
    static buildDncScope(companyUuid) {
        const scope = [{ company_uuid: null }];
        if (companyUuid) {
            scope.push({ company_uuid: String(companyUuid) });
        }
        return scope;
    }
    static getDuplicateDncMessage(existingEntry, companyUuid) {
        const normalizedEntry = Array.isArray(existingEntry) ? existingEntry[0] : existingEntry;
        if (!normalizedEntry) {
            return "This phone number is already on the DNC list.";
        }
        if (normalizedEntry.company_uuid === null || normalizedEntry.company_uuid === undefined) {
            return "This phone number already exists in the global DNC list.";
        }
        if (String(normalizedEntry.company_uuid) === String(companyUuid || "")) {
            return "This phone number already exists in your DNC list.";
        }
        return "This phone number is already on the DNC list.";
    }
    static extractCountryPrefixes(filters = []) {
        return Array.from(new Set(filters
            .filter((filter) => String(filter?.key ?? "").trim().toLowerCase() === "country")
            .flatMap((filter) => Array.isArray(filter?.value) ? filter.value : [filter?.value])
            .map((value) => {
            if (value && typeof value === "object") {
                const resolvedValue = value.countryPrefix ?? value.prefix ?? value.value;
                return String(resolvedValue ?? "").trim();
            }
            return String(value ?? "").trim();
        })
            .map((value) => value.replace(/[^\d+]/g, ""))
            .map((value) => {
            if (!value)
                return "";
            return value.startsWith("+") ? value : `+${value}`;
        })
            .filter(Boolean)));
    }
    static normalizeUploadedDncRow(row) {
        return {
            name: String(row?.name ?? "").trim(),
            email: String(row?.email ?? "").trim(),
            phone: String(row?.phone ?? "").trim(),
        };
    }
    static normalizeDncPhone(rawPhone, countryPrefix, strictCountryCode = false) {
        const normalizedPhoneInput = countryPrefix
            ? CommonHelper_1.default.normalizePhoneWithCountryCode(rawPhone, countryPrefix, strictCountryCode)
            : { isValid: true, phone: rawPhone };
        if (!normalizedPhoneInput.isValid || !normalizedPhoneInput.phone) {
            throw new Error("INVALID_PHONE");
        }
        const phoneWithPlus = CommonHelper_1.default.formatToE164(normalizedPhoneInput.phone);
        const duplicateKey = CommonHelper_1.default.normalizePhoneForDuplicateCheck(phoneWithPlus);
        if (!duplicateKey) {
            throw new Error("INVALID_PHONE");
        }
        return { phoneWithPlus, duplicateKey };
    }
    static async fetchFtcDncPage(createdDateFrom, createdDateTo, offset) {
        try {
            this.validateFtcConfig();
            const response = await axios_1.default.get(`${process.env.DNC_URL}dnc-complaints`, {
                params: {
                    api_key: process.env.DNC_API_KEY,
                    created_date_from: `"${createdDateFrom}"`,
                    created_date_to: `"${createdDateTo}"`,
                    sort_order: "ASC",
                    items_per_page: this.FTC_DNC_ITEMS_PER_PAGE,
                    offset,
                },
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout: this.FTC_DNC_REQUEST_TIMEOUT_MS,
            });
            return response.data;
        }
        catch (error) {
            if (error?.response?.status) {
                throw new HttpException_1.HttpException(error.response.status, error?.response?.data?.error || "FTC DNC API request failed.");
            }
            throw new HttpException_1.HttpException(422, error?.message || "FTC DNC API request failed.");
        }
    }
    static async syncCampaignNumberDncStatus(phoneDedupKey, isDnc, userData) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CampaignNumberModel = tenantDB.models.campaign_number;
        await CampaignNumberModel.updateMany({
            company_uuid: String(userData?.company_uuid),
            contactNumber: { $regex: new RegExp(`${phoneDedupKey}$`) },
        }, {
            $set: { isDnc },
        });
    }
    static async addNumberToDnc(request, userData) {
        try {
            const { company_uuid, user_uuid } = userData;
            const { name, email, phone, source } = request;
            const DncNumberModel = await this.getDncModel();
            const normalizedContactNumber = CommonHelper_1.default.formatToE164(await CommonHelper_1.default.ensurePlusPrefix(phone));
            const digits10 = CommonHelper_1.default.normalizePhoneForDuplicateCheck(normalizedContactNumber);
            const existing = await DncNumberModel.findOne({
                phone: { $regex: new RegExp(`${digits10}$`) },
                $or: this.buildDncScope(company_uuid),
            });
            if (existing) {
                throw new HttpException_1.HttpException(409, this.getDuplicateDncMessage(existing, company_uuid));
            }
            try {
                await DncNumberModel.create({
                    company_uuid: company_uuid,
                    createdById: user_uuid,
                    name: name.trim(),
                    type: (company_uuid) ? 'PERSONAL' : 'SYSTEM',
                    source: source,
                    email: email?.trim().toLowerCase() || null,
                    phone: normalizedContactNumber,
                });
            }
            catch (error) {
                if (error?.code === 11000) {
                    const existingDuplicate = await DncNumberModel.findOne({
                        phone: normalizedContactNumber,
                        $or: this.buildDncScope(company_uuid),
                    }).lean();
                    throw new HttpException_1.HttpException(409, this.getDuplicateDncMessage(existingDuplicate, company_uuid));
                }
                throw error;
            }
            await this.addContactToDnclist(digits10, userData);
            await this.syncCampaignNumberDncStatus(digits10, true, userData);
            return true;
        }
        catch (error) {
            console.error("Error adding number to DNC:", error);
            throw new HttpException_1.HttpException(error.status || 422, error.message || "Unable to add number to DNC.");
        }
    }
    static async dncList(requestData, userData) {
        try {
            const page = Number(requestData?.page) || 1;
            const limit = Number(requestData?.limit) || 25;
            const search = requestData?.search?.toString()?.trim() || "";
            const filters = Array.isArray(requestData?.filters) ? requestData.filters : [];
            const createdAtDateFilter = {};
            const from = String(requestData?.filter_date?.from ?? "").trim();
            const to = String(requestData?.filter_date?.to ?? "").trim();
            if (from) {
                const fromDate = new Date(from);
                if (!Number.isNaN(fromDate.getTime())) {
                    fromDate.setHours(0, 0, 0, 0);
                    createdAtDateFilter.$gte = fromDate;
                }
            }
            if (to) {
                const toDate = new Date(to);
                if (!Number.isNaN(toDate.getTime())) {
                    toDate.setHours(23, 59, 59, 999);
                    createdAtDateFilter.$lte = toDate;
                }
            }
            const sortKey = requestData.sort?.key || "createdAt";
            const sortOrder = requestData.sort?.desc ? -1 : 1;
            const skip = (page - 1) * limit;
            // 1. Precise Match Stage
            const matchStage = {
                $and: [
                    {
                        $or: [
                            { company_uuid: String(userData?.company_uuid) },
                        ],
                    },
                ],
            };
            if (search) {
                const normalizedSearchDigits = search.replace(/\D/g, "");
                const searchConditions = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
                if (normalizedSearchDigits) {
                    searchConditions.push({
                        phone: { $regex: new RegExp(`${normalizedSearchDigits.split("").join("\\D*")}$`) },
                    });
                }
                else {
                    searchConditions.push({ phone: { $regex: search, $options: "i" } });
                }
                matchStage.$and.push({
                    $or: searchConditions,
                });
            }
            const countryPrefixes = this.extractCountryPrefixes(filters);
            if (countryPrefixes.length === 1) {
                matchStage.$and.push({
                    phone: { $regex: `^${CommonHelper_1.default.escapeRegex(countryPrefixes[0])}` },
                });
            }
            else if (countryPrefixes.length > 1) {
                matchStage.$and.push({
                    $or: countryPrefixes.map((prefix) => ({
                        phone: { $regex: `^${CommonHelper_1.default.escapeRegex(prefix)}` },
                    })),
                });
            }
            if (Object.keys(createdAtDateFilter).length) {
                matchStage.$and.push({
                    createdAt: createdAtDateFilter,
                });
            }
            // Optimized Pipeline
            const pipeline = [
                { $match: matchStage },
                {
                    $facet: {
                        rows: [
                            { $sort: { [sortKey]: sortOrder } },
                            { $skip: skip },
                            { $limit: limit },
                            // Project only necessary fields for the list to save memory
                            {
                                $project: {
                                    _id: 1, name: 1, email: 1, phone: 1, type: 1, source: 1, createdAt: 1
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
            const DncNumberModel = await this.getDncModel();
            // 3. Execution
            const [result] = await DncNumberModel.aggregate(pipeline);
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
    static async verifyDnc(requestData) {
        try {
            const normalizedContactNumber = CommonHelper_1.default.formatToE164(await CommonHelper_1.default.ensurePlusPrefix(requestData.phone));
            const digits10 = CommonHelper_1.default.normalizePhoneForDuplicateCheck(normalizedContactNumber);
            const DncNumberModel = await this.getDncModel();
            const record = await DncNumberModel.findOne({
                phone: { $regex: new RegExp(`${digits10}$`) },
            })
                .sort({ company_uuid: 1, createdAt: -1 })
                .select("_id company_uuid createdById name email phone type createdAt updatedAt")
                .lean();
            return {
                exists: Boolean(record),
                record: record || null,
            };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            throw new HttpException_1.HttpException(error.status || 422, error.message || "Unable to verify DNC number.");
        }
    }
    static async syncFtcDnc(requestData) {
        try {
            const createdDateFrom = this.normalizeFtcDate(requestData.createdDateFrom);
            const createdDateTo = this.normalizeFtcDate(requestData.createdDateTo);
            const fromDate = new Date(createdDateFrom);
            const toDate = new Date(createdDateTo);
            if (fromDate.getTime() > toDate.getTime()) {
                throw new HttpException_1.HttpException(422, "createdDateFrom cannot be greater than createdDateTo.");
            }
            const maxWindowEnd = new Date(fromDate);
            maxWindowEnd.setDate(maxWindowEnd.getDate() + this.FTC_DNC_MAX_WINDOW_DAYS);
            if (toDate.getTime() >= maxWindowEnd.getTime()) {
                throw new HttpException_1.HttpException(422, `FTC DNC sync window cannot exceed ${this.FTC_DNC_MAX_WINDOW_DAYS} days.`);
            }
            const DncNumberModel = await this.getDncModel();
            const seenPhones = new Set();
            let offset = 0;
            let pagesFetched = 0;
            let recordsFetched = 0;
            let validPhoneRows = 0;
            let skippedRecords = 0;
            let duplicateRowsInWindow = 0;
            let uniquePhonesInWindow = 0;
            let insertedPhones = 0;
            let existingPhones = 0;
            while (true) {
                const pageData = await this.fetchFtcDncPage(createdDateFrom, createdDateTo, offset);
                const rows = Array.isArray(pageData?.data) ? pageData.data : [];
                pagesFetched++;
                recordsFetched += rows.length;
                if (!rows.length) {
                    break;
                }
                const operationsByPhone = new Map();
                for (const item of rows) {
                    const rawPhone = String(item?.attributes?.["company-phone-number"] ?? "").trim();
                    if (!rawPhone) {
                        skippedRecords++;
                        continue;
                    }
                    try {
                        const { phoneWithPlus } = this.normalizeDncPhone(rawPhone, "+1");
                        validPhoneRows++;
                        if (seenPhones.has(phoneWithPlus)) {
                            duplicateRowsInWindow++;
                            continue;
                        }
                        seenPhones.add(phoneWithPlus);
                        operationsByPhone.set(phoneWithPlus, phoneWithPlus);
                        uniquePhonesInWindow++;
                    }
                    catch {
                        skippedRecords++;
                    }
                }
                if (operationsByPhone.size) {
                    const bulkOperations = Array.from(operationsByPhone.values()).map((phone) => ({
                        updateOne: {
                            filter: {
                                company_uuid: null,
                                phone,
                            },
                            update: {
                                $set: {
                                    name: this.FTC_DNC_NAME,
                                    email: null,
                                    type: "SYSTEM",
                                    createdById: this.FTC_DNC_CREATED_BY,
                                },
                                $setOnInsert: {
                                    company_uuid: null,
                                    phone,
                                },
                            },
                            upsert: true,
                        },
                    }));
                    const bulkResult = await DncNumberModel.bulkWrite(bulkOperations, { ordered: false });
                    insertedPhones += bulkResult.upsertedCount || 0;
                    existingPhones += bulkOperations.length - (bulkResult.upsertedCount || 0);
                }
                if (rows.length < this.FTC_DNC_ITEMS_PER_PAGE) {
                    break;
                }
                offset += this.FTC_DNC_ITEMS_PER_PAGE;
            }
            return {
                createdDateFrom,
                createdDateTo,
                pagesFetched,
                recordsFetched,
                validPhoneRows,
                skippedRecords,
                duplicateRowsInWindow,
                uniquePhonesInWindow,
                insertedPhones,
                existingPhones,
            };
        }
        catch (error) {
            if (error instanceof HttpException_1.HttpException)
                throw error;
            throw new HttpException_1.HttpException(error.status || 422, error.message || "Unable to sync FTC DNC data.");
        }
    }
    static async removeDnc(requestData, userData) {
        try {
            const tenantDB = await this.getTenantDBFromUser(userData);
            const DncNumberModel = await this.getDncModel();
            const ContactModel = tenantDB.models.contact;
            const { dncId } = requestData;
            const isContactUuIdExist = await DncNumberModel.findOne({
                _id: new mongoose_1.default.Types.ObjectId(dncId),
                company_uuid: String(userData?.company_uuid),
            });
            if (!isContactUuIdExist) {
                throw Error(`Dnc number does not exist.`);
            }
            const deletedDnc = await DncNumberModel.findOneAndDelete({
                _id: new mongoose_1.default.Types.ObjectId(dncId),
                company_uuid: String(userData?.company_uuid),
            });
            const normalizedDeletedPhone = deletedDnc?.phone
                ? await CommonHelper_1.default.normalizePhone(deletedDnc.phone)
                : "";
            if (normalizedDeletedPhone) {
                const remainingDncEntry = await DncNumberModel.findOne({
                    phone: { $regex: new RegExp(`${normalizedDeletedPhone}$`) },
                    company_uuid: String(userData?.company_uuid),
                }).lean();
                await ContactModel.updateOne({
                    companyId: String(userData?.company_uuid),
                    "contact.phone": { $regex: new RegExp(`${normalizedDeletedPhone}$`) },
                    "flags.is_dnc": true
                }, {
                    $set: { "flags.is_dnc": false }
                });
                if (!remainingDncEntry) {
                    await this.syncCampaignNumberDncStatus(normalizedDeletedPhone, false, userData);
                }
            }
            return true;
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, `${error?.message}`);
        }
    }
    static async addDncCsvXlsx(requestData, userData) {
        const file = requestData.file;
        const countryPrefix = requestData.body.countryPrefix;
        // const userData = JSON.parse(requestData.body.user);
        const strictCountryCode = CommonHelper_1.default.parseBooleanUploadOption(requestData.body.strictCountryCode);
        if (!file)
            throw new HttpException_1.HttpException(422, "File is required");
        const allowedColumns = ["name", "email", "phone"];
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
            countryPrefix,
            strictCountryCode
        };
        if (redis_1.isRedisEnabled && queues_1.Queues.DNC) {
            await queues_1.Queues.DNC.add("process", queueData, jobOptions_1.defaultJobOptions);
            return {
                message: "File is being processed in background",
            };
        }
        const processSummary = await this.processDncFile(queueData);
        return {
            message: "File processed without Redis queue because REDIS_ENABLED=false",
            result: processSummary,
        };
    }
    static async processDncFile({ filePath, userData, countryPrefix, strictCountryCode }) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const tenantDB = await this.getTenantDBFromUser(userData);
        const UserSessionModel = mainDB.models.user_session;
        const DncNumberModel = await this.getDncModel();
        const DncSuccessionObj = { success: 0, fail: 0, duplicate: 0 };
        const notifyDncProcessCompletion = async () => {
            let socketIdArr = [];
            const userSession = await UserSessionModel.findOne({
                userUuid: userData?.user_uuid,
                extension: userData?.extension,
            });
            socketIdArr = socketIdArr.concat(userSession?.socketId || []);
            await NatsController_1.NatsController.publishEvent("socket.emitSocketId", {
                socketId: socketIdArr,
                emitter: "dnc-process-response",
                payload: DncSuccessionObj,
            });
        };
        let buffer;
        try {
            buffer = fs.readFileSync(filePath);
        }
        catch {
            console.error("Failed to read file:", filePath);
            await notifyDncProcessCompletion();
            return DncSuccessionObj;
        }
        const fileName = filePath.toLowerCase();
        const isCSV = fileName.endsWith(".csv");
        // ---------------- CSV PARSER ----------------
        const parseCSV = () => new Promise((resolve, reject) => {
            const rows = [];
            let headersValidated = false;
            stream_1.Readable.from(buffer)
                .pipe((0, csv_parser_1.default)())
                .on("headers", (headers) => {
                headersValidated = true;
            })
                .on("data", (data) => {
                if (!headersValidated)
                    return;
                rows.push(this.normalizeUploadedDncRow(data));
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
                    .map((r) => this.normalizeUploadedDncRow(r));
                resolve(parsed);
            }
            catch {
                reject(new HttpException_1.HttpException(422, "XLSX Parsing Error"));
            }
        });
        let parsedRows = [];
        try {
            parsedRows = isCSV ? await parseCSV() : await parseXLSX();
        }
        catch (err) {
            console.error("Parsing failed:", err.message);
            fs.unlinkSync(filePath);
            await notifyDncProcessCompletion();
            return DncSuccessionObj;
        }
        // ---------------- PROCESS ROWS DETERMINISTICALLY ----------------
        const uniqueRowsByPhone = new Map();
        for (const row of parsedRows) {
            try {
                const { phoneWithPlus, duplicateKey } = this.normalizeDncPhone(row.phone, countryPrefix, strictCountryCode);
                if (uniqueRowsByPhone.has(duplicateKey)) {
                    DncSuccessionObj.duplicate++;
                    continue;
                }
                uniqueRowsByPhone.set(duplicateKey, {
                    ...row,
                    phone: phoneWithPlus,
                    duplicateKey,
                });
            }
            catch {
                DncSuccessionObj.fail++;
            }
        }
        for (const row of uniqueRowsByPhone.values()) {
            try {
                const existing = await DncNumberModel.findOne({
                    phone: { $regex: new RegExp(`${row.duplicateKey}$`) },
                    $or: this.buildDncScope(userData?.company_uuid),
                }).lean();
                if (existing) {
                    DncSuccessionObj.duplicate++;
                    continue;
                }
                try {
                    await DncNumberModel.create({
                        name: row.name,
                        email: row.email,
                        phone: row.phone,
                        type: userData.company_uuid ? 'PERSONAL' : 'SYSTEM',
                        company_uuid: userData.company_uuid,
                        createdById: userData.user_uuid,
                    });
                }
                catch (err) {
                    if (err?.code === 11000) {
                        DncSuccessionObj.duplicate++;
                        continue;
                    }
                    throw err;
                }
                DncSuccessionObj.success++;
                try {
                    await this.addContactToDnclist(row.duplicateKey, userData);
                    await this.syncCampaignNumberDncStatus(row.duplicateKey, true, userData);
                }
                catch (err) {
                    console.error("Failed to mark contact as DNC:", err?.message || err);
                }
            }
            catch {
                DncSuccessionObj.fail++;
            }
        }
        // Always delete temp file
        try {
            fs.unlinkSync(filePath);
        }
        catch {
            console.error("Failed to delete temp file:", filePath);
        }
        await notifyDncProcessCompletion();
        return DncSuccessionObj;
    }
    static async addContactToDnclist(phone, userData) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const ContactModel = tenantDB.models.contact;
        // Set found contact to blocked
        await ContactModel.updateOne({
            companyId: String(userData?.company_uuid),
            "contact.phone": { $regex: `${phone}$` }, // ends with these digits
            "flags.is_dnc": { $ne: true }
        }, {
            $set: { "flags.is_dnc": true, "flags.is_vip": false }
        });
    }
}
exports.DncRepository = DncRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/DncRepository.ts?
}