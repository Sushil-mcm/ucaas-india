{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const dotenv_1 = __importDefault(__webpack_require__(/*! dotenv */ "dotenv"));
dotenv_1.default.config();
const config = {
    NODE_ENV: "development",
    API_NAME: process.env.API_NAME,
    PROJECT: process.env.PROJECT,
    PORT: process.env.PORT,
    REDIS_ENABLED: parseBooleanEnvVar(process.env.REDIS_ENABLED, true),
    DB_CONNECTION_STR: process.env.DB_CONNECTION_STR,
    TENANT_DB_CONNECTION_STR: process.env.TENANT_DB_CONNECTION_STR,
    DB_NAME: process.env.DB_NAME,
    TENANT_DB_HOST: process.env.TENANT_DB_HOST,
    TENANT_DB_USERNAME: process.env.TENANT_DB_USERNAME,
    TENANT_DB_PASSWORD: process.env.TENANT_DB_PASSWORD,
    TENANT_DB_AUTH_SOURCE: process.env.TENANT_DB_AUTH_SOURCE,
    MAIN_API_URL: process.env.MAIN_API_URL,
    TENANT_PORT: process.env.TENANT_PORT,
    TENANT_API_TIMEOUT_MS: process.env.TENANT_API_TIMEOUT_MS,
    PRIVATE_CALL_SECRET: process.env.PRIVATE_CALL_SECRET,
    AI_API_URL: process.env.AI_API_URL,
    NOTIFICATION_API_URL: process.env.NOTIFICATION_API_URL,
    SOCKET_API_URL: process.env.SOCKET_API_URL,
    NATS_SERVER: process.env.NATS_SERVER,
    DOMAIN_PREFIX: process.env.DOMAIN_PREFIX,
    DOMAIN_SUFFIX: process.env.DOMAIN_SUFFIX,
};
function parseBooleanEnvVar(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    return value.toLowerCase() === "true";
}
exports["default"] = config;


//# sourceURL=webpack://campaign-api/./src/config/secret.ts?
}