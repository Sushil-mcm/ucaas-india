{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectTenantApiService = exports.TenantApiError = void 0;
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
const opossum_1 = __importDefault(__webpack_require__(/*! opossum */ "opossum"));
const secret_1 = __importDefault(__webpack_require__(/*! @/config/secret */ "./src/config/secret.ts"));
const tenantApi = axios_1.default.create();
const configuredTimeout = Number(secret_1.default.TENANT_API_TIMEOUT_MS || 30000);
const TENANT_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 30000;
class TenantApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "TenantApiError";
    }
}
exports.TenantApiError = TenantApiError;
const tenantBreaker = new opossum_1.default((config) => tenantApi(config), {
    timeout: TENANT_TIMEOUT_MS + 2000,
    errorThresholdPercentage: 50,
    volumeThreshold: 5,
    rollingCountTimeout: 30000,
    resetTimeout: 30000,
    errorFilter: (error) => {
        const status = Number(error?.response?.status ?? 0);
        return status >= 400 && status < 500;
    },
});
const toTenantApiError = (error, endpoint) => {
    if (error instanceof TenantApiError)
        return error;
    if (error?.code === "EOPENBREAKER") {
        return new TenantApiError(`Tenant API is temporarily unavailable #${endpoint}`, 503);
    }
    if (error?.code === "ETIMEDOUT" || error?.code === "ECONNABORTED") {
        return new TenantApiError(`Tenant API request timed out #${endpoint}`, 504);
    }
    if (error?.response) {
        const responseData = error.response.data;
        const message = responseData?.error?.message
            || responseData?.message
            || (typeof responseData === "string" ? responseData : "")
            || error?.message
            || "Tenant API request failed";
        return new TenantApiError(message, error.response.status);
    }
    return new TenantApiError(error?.message || "Tenant API request failed", error?.request ? 503 : 500);
};
class DirectTenantApiService {
    static callTenantApi = async (endpoint, method = "GET", data) => {
        try {
            const tenantPort = secret_1.default.TENANT_PORT || 3001;
            const internalSecret = secret_1.default.PRIVATE_CALL_SECRET;
            if (!tenantPort) {
                throw new TenantApiError("TENANT_PORT is not configured", 500);
            }
            if (!internalSecret) {
                throw new TenantApiError("PRIVATE_CALL_SECRET is not configured", 500);
            }
            const config = {
                method,
                url: `http://localhost:${tenantPort}/api/v1/${endpoint}`,
                headers: {
                    Authorization: `Bearer ${internalSecret}`,
                },
                timeout: TENANT_TIMEOUT_MS,
                data: ["POST", "PATCH", "DELETE"].includes(method) ? data : undefined,
            };
            const response = await tenantBreaker.fire(config);
            if (!response || response.status !== 200 || !response.data) {
                throw new TenantApiError("No response from tenant API", 500);
            }
            return response;
        }
        catch (error) {
            throw toTenantApiError(error, endpoint);
        }
    };
}
exports.DirectTenantApiService = DirectTenantApiService;


//# sourceURL=webpack://campaign-api/./src/services/DirectTenantApiService.ts?
}