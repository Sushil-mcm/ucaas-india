{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const secret_1 = __importDefault(__webpack_require__(/*! @/config/secret */ "./src/config/secret.ts"));
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
const dayjs_1 = __importDefault(__webpack_require__(/*! dayjs */ "dayjs"));
const google_libphonenumber_1 = __webpack_require__(/*! google-libphonenumber */ "google-libphonenumber");
const timezone_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/timezone */ "dayjs/plugin/timezone"));
const utc_1 = __importDefault(__webpack_require__(/*! dayjs/plugin/utc */ "dayjs/plugin/utc"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
const phoneUtil = google_libphonenumber_1.PhoneNumberUtil.getInstance();
class CommonHelper {
    static async sanitizePhoneNumber(fetchPhoneNumber, fetchPrefix = "") {
        if (fetchPhoneNumber !== undefined && fetchPhoneNumber !== "") {
            const regexCode = /^(?:[0-9] ?){10,13}[0-9]$/;
            let phoneNumber = fetchPhoneNumber.replace(/[^0-9]/g, "").trim();
            phoneNumber = (phoneNumber * 1).toString();
            let response = {};
            if (phoneNumber.match(regexCode) !== null) {
                response = { phoneNumber: phoneNumber, message: "Valid" };
            }
            else {
                response = { phoneNumber: phoneNumber, message: "Invalid" };
            }
            return response;
        }
    }
    static async generateUniqueTimeString() {
        const currentTime = (0, dayjs_1.default)().unix();
        const randomPart = Math.floor(Math.random() * 90) + 10;
        return `${randomPart.toString()}${currentTime.toString()}`;
    }
    static async ensurePlusPrefix(input) {
        if (!input?.startsWith("+")) {
            input = "+" + input;
        }
        return input;
    }
    static async removePlusPrefix(input) {
        return input?.startsWith("+") ? input.substring(1) : input;
    }
    static formatToE164(phone) {
        if (!phone || typeof phone !== "string") {
            throw new Error("Phone number is required");
        }
        let cleaned = phone.trim().replace(/[^\d+]/g, "");
        cleaned = cleaned.replace(/(?!^)\+/g, "");
        if (!cleaned.startsWith("+")) {
            cleaned = `+${cleaned}`;
        }
        try {
            const parsed = phoneUtil.parseAndKeepRawInput(cleaned);
            if (!phoneUtil.isValidNumber(parsed)) {
                throw new Error("Invalid phone number");
            }
            return phoneUtil.format(parsed, google_libphonenumber_1.PhoneNumberFormat.E164);
        }
        catch {
            throw new Error("Invalid phone number. Please include a valid country code.");
        }
    }
    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape all regex special chars
    }
    static async getClientIp(req) {
        const xForwardedFor = req.headers["x-forwarded-for"];
        let ip = "";
        if (typeof xForwardedFor === "string") {
            ip = xForwardedFor.split(",")[0];
        }
        else if (Array.isArray(xForwardedFor)) {
            ip = xForwardedFor[0];
        }
        else {
            ip = req.socket.remoteAddress ?? "";
        }
        /* Remove IPv6 prefix if present */
        ip = ip.replace(/^::ffff:/, "");
        if (ip === "::1") {
            ip = "127.0.0.1";
        }
        return ip;
    }
    static chunkArray = (array, size) => {
        return array.reduce((acc, _, i) => {
            if (i % size === 0)
                acc.push(array.slice(i, i + size));
            return acc;
        }, []);
    };
    static async generateRandomExtension(company_uuid, campaignId = null) {
        const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
        const QueueModel = mainDB.models.queues;
        if (campaignId) {
            const existing = await QueueModel.findOne({
                company_uuid: String(company_uuid),
                campaign_uuid: String(campaignId),
            });
            if (existing) {
                return existing.extension;
            }
        }
        const min = 1000;
        const max = 9999;
        const allExtensions = Array.from({ length: max - min + 1 }, (_, i) => (min + i).toString());
        this.shuffle(allExtensions);
        for (let extension of allExtensions) {
            const existsAnywhere = await QueueModel.findOne({
                company_uuid: String(company_uuid),
                extension,
            });
            if (!existsAnywhere) {
                return extension;
            }
        }
        throw new Error("No available extension numbers.");
    }
    static shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    static parseBooleanUploadOption = (value) => {
        if (typeof value === "string") {
            const normalizedValue = value.trim().toLowerCase();
            if (normalizedValue === "true")
                return true;
            if (normalizedValue === "false")
                return false;
        }
        return value === true;
    };
    static normalizePhoneWithCountryCode = (phone, countryPrefix, strictCountryCode = false) => {
        if (phone === null || phone === undefined) {
            return { isValid: false, phone: "" };
        }
        let trimmedPhone = String(phone).trim();
        if (!trimmedPhone) {
            return { isValid: false, phone: "" };
        }
        if (!countryPrefix) {
            return { isValid: true, phone: trimmedPhone };
        }
        const normalizedCountryPrefix = String(countryPrefix).trim().startsWith("+")
            ? String(countryPrefix).trim()
            : `+${String(countryPrefix).trim()}`;
        const cleanCountryPrefix = normalizedCountryPrefix.replace(/[^\d]/g, "");
        if (!cleanCountryPrefix) {
            return { isValid: false, phone: "" };
        }
        const normalizedPhone = trimmedPhone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
        if (!normalizedPhone) {
            return { isValid: false, phone: "" };
        }
        const normalizedCountryDigits = normalizedCountryPrefix.slice(1);
        const normalizedPhoneDigits = normalizedPhone.replace(/\D/g, "");
        const isIndiaLocalTenDigitNumber = normalizedCountryDigits === "91" &&
            !trimmedPhone.startsWith("+") &&
            normalizedPhoneDigits.length === 10;
        const hasSameCountryPrefix = normalizedPhone.startsWith(normalizedCountryPrefix) ||
            (!normalizedPhone.startsWith("+") &&
                normalizedPhone.startsWith(normalizedCountryDigits));
        if (strictCountryCode === true) {
            return {
                isValid: hasSameCountryPrefix,
                phone: hasSameCountryPrefix
                    ? (normalizedPhone.startsWith("+") ? normalizedPhone : `+${normalizedPhone}`)
                    : "",
            };
        }
        if (normalizedPhone.startsWith("+")) {
            if (hasSameCountryPrefix) {
                return { isValid: true, phone: normalizedPhone };
            }
            return { isValid: false, phone: "" };
        }
        if (isIndiaLocalTenDigitNumber) {
            return { isValid: true, phone: `${normalizedCountryPrefix}${normalizedPhoneDigits}` };
        }
        if (normalizedPhone.startsWith(normalizedCountryDigits)) {
            return { isValid: true, phone: `+${normalizedPhone}` };
        }
        return {
            isValid: true,
            phone: `${normalizedCountryPrefix}${normalizedPhoneDigits}`,
        };
    };
    static async toUtcConversion(dateValue, timezoneName = "America/New_York") {
        return dayjs_1.default
            .tz(dateValue, "YYYY-MM-DD HH:mm:ss", timezoneName)
            .utc()
            .format(); // ISO 8601 format, same as moment
    }
    static fetchDncNumbers = async () => {
        const response = await axios_1.default.get(`${process.env.DNC_URL}dnc-complaints?api_key=${process.env.DNC_API_KEY}`, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        // Create a Set for O(1) lookup
        const dncSet = new Set();
        for (const item of response?.data?.data || []) {
            const rawNumber = item?.attributes?.["company-phone-number"];
            if (rawNumber) {
                dncSet.add(CommonHelper.normalizePhone(rawNumber));
            }
        }
        return dncSet;
    };
    static normalizePhone = async (phone) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length > 10 ? digits.slice(-10) : digits;
    };
    static normalizePhoneForDuplicateCheck = (phone) => {
        const digits = String(phone ?? "").replace(/\D/g, "");
        return digits.length > 10 ? digits.slice(-10) : digits;
    };
    static deriveTenantDbNameFromDomain = (domain) => {
        try {
            const inboundDomain = String(domain).trim().toLowerCase();
            const normalizedSuffix = String(secret_1.default.DOMAIN_SUFFIX).trim().toLowerCase();
            if (!inboundDomain || !normalizedSuffix || !inboundDomain.endsWith(normalizedSuffix)) {
                return "";
            }
            const dbName = `${secret_1.default.DOMAIN_PREFIX}${inboundDomain.slice(0, -normalizedSuffix.length)}`;
            return dbName;
        }
        catch (error) {
            console.error("Error deriving tenant DB name from domain:", error);
            throw new HttpException_1.HttpException(422, `${error?.message || "Invalid domain"}`);
        }
    };
    static createUserObject = (userPayload) => {
        try {
            const result = userPayload?.userDetail ?? userPayload?.user ?? userPayload;
            const firstName = result?.first_name ?? result?.firstName ?? "";
            const lastName = result?.last_name ?? result?.lastName ?? "";
            const username = result?.username ?? "";
            const domain = result?.domain ?? userPayload?.domain;
            const dbName = result?.db_name ?? result?.dbName ?? userPayload?.db_name ?? userPayload?.dbName ?? "";
            const connectionTenant = CommonHelper.deriveTenantDbNameFromDomain(domain);
            const user_uuid = result?.user_uuid ?? null;
            const company_uuid = result?.company_uuid ?? null;
            if (!user_uuid || !company_uuid || !connectionTenant) {
                throw new HttpException_1.HttpException(422, `Missing user_uuid, company_uuid or domain/db_name`);
            }
            return {
                user_uuid,
                company_uuid,
                role: result?.role ? String(result.role) : null,
                username: username || null,
                first_name: firstName || null,
                last_name: lastName || null,
                email: result?.email ?? null,
                extension: String(result?.extension ?? ""),
                domain,
                db_name: dbName ? String(dbName).trim() : undefined,
                connectionTenant
            };
        }
        catch (error) {
            console.error("Error creating user object:", error);
            throw new HttpException_1.HttpException(422, `${error?.message || "Invalid user payload"}`);
        }
    };
    static callActivityUserObject = (userPayload) => {
        try {
            const result = userPayload?.userDetail ?? userPayload?.user ?? userPayload;
            const username = result?.username ?? result?.name ?? "";
            const firstName = result?.first_name ?? result?.firstName ?? "";
            const lastName = result?.last_name ?? result?.lastName ?? "";
            const domain = result?.domain ?? userPayload?.domain;
            const connectionTenant = CommonHelper.deriveTenantDbNameFromDomain(domain);
            const user_uuid = result?.user_uuid ?? userPayload?.user_uuid ?? null;
            const company_uuid = result?.company_uuid ?? userPayload?.company_uuid ?? userPayload?.accountcode ?? null;
            if (!company_uuid || !connectionTenant) {
                throw new HttpException_1.HttpException(422, `Missing company_uuid or domain`);
            }
            return {
                user_uuid,
                company_uuid,
                role: result?.role ? String(result.role) : null,
                first_name: firstName || null,
                last_name: lastName || null,
                username: username || null,
                email: result?.email ?? null,
                extension: String(result?.extension ?? ""),
                domain,
                connectionTenant
            };
        }
        catch (error) {
            console.error("Error creating user object:", error);
            throw new HttpException_1.HttpException(422, `${error?.message || "Invalid user payload"}`);
        }
    };
    static createAgentDetail = (userPayload, userData) => {
        const resolvedUserData = userData || {};
        return {
            user_uuid: String(resolvedUserData?.user_uuid ?? ""),
            company_uuid: String(resolvedUserData?.company_uuid ?? ""),
            first_name: resolvedUserData?.first_name ?? null,
            last_name: resolvedUserData?.last_name ?? null,
            username: resolvedUserData?.username ?? null,
            email: resolvedUserData?.email ?? null,
            extension: String(resolvedUserData?.extension ?? userPayload?.extension ?? ""),
            role: resolvedUserData?.role ?? null,
            domain: resolvedUserData?.domain ?? null,
        };
    };
    static capitalizeFirstLetter(text) {
        if (!text)
            return "";
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
}
exports["default"] = CommonHelper;


//# sourceURL=webpack://campaign-api/./src/helpers/CommonHelper.ts?
}