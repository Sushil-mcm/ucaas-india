{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseTenantRepository = void 0;
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
class BaseTenantRepository {
    static async getTenantDBFromUser(user) {
        if (!user?.connectionTenant) {
            throw new Error("Tenant ID missing in user");
        }
        return DatabaseManager_1.default.getInstance().getTenantConnection(user?.connectionTenant);
    }
}
exports.BaseTenantRepository = BaseTenantRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/BaseTenantRepository.ts?
}