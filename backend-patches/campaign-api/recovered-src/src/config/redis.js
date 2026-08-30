{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.redisConnection = exports.isRedisEnabled = void 0;
const secret_1 = __importDefault(__webpack_require__(/*! @/config/secret */ "./src/config/secret.ts"));
exports.isRedisEnabled = secret_1.default.REDIS_ENABLED;
exports.redisConnection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};
if (exports.isRedisEnabled) {
    console.log("Redis Connection Debug:");
    console.log("Host:", exports.redisConnection.host);
    console.log("Port:", exports.redisConnection.port);
    console.log("Password provided?", !!exports.redisConnection.password);
}
else {
    console.log("Redis is disabled via REDIS_ENABLED=false");
}


//# sourceURL=webpack://campaign-api/./src/config/redis.ts?
}