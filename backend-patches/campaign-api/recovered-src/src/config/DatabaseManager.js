{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const mongoose_1 = __importDefault(__webpack_require__(/*! mongoose */ "mongoose"));
//import { tenantConnections, tenantLRU } from "./tenantStore";
const ModelLoader_1 = __webpack_require__(/*! ./ModelLoader */ "./src/config/ModelLoader.ts");
const seedTenantDefaultForDisposition_1 = __webpack_require__(/*! ./seedTenantDefaultForDisposition */ "./src/config/seedTenantDefaultForDisposition.ts");
const tenantStore_1 = __webpack_require__(/*! ./tenantStore */ "./src/config/tenantStore.ts");
const secret_1 = __importDefault(__webpack_require__(/*! ./secret */ "./src/config/secret.ts"));
class DatabaseManager {
    static instance;
    MAIN_DB_KEY = "GLOBAL_MAIN_CONNECTION";
    /** Prevent duplicate parallel connections */
    pendingConnections = new Map();
    constructor() { }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    /* ================= MAIN DB ================= */
    async connectMainDB() {
        const cached = tenantStore_1.tenantLRU.get(this.MAIN_DB_KEY);
        if (cached && cached.conn.readyState === 1 && !cached.closing) {
            cached.lastUsed = Date.now();
            return cached.conn;
        }
        if (this.pendingConnections.has(this.MAIN_DB_KEY)) {
            return this.pendingConnections.get(this.MAIN_DB_KEY);
        }
        const mainDbUri = secret_1.default.DB_CONNECTION_STR;
        if (!mainDbUri) {
            throw new Error("Missing DB_CONNECTION_STR environment variable. Check your .env configuration.");
        }
        const mainDbName = secret_1.default.DB_NAME;
        if (!mainDbName) {
            throw new Error("Missing DB_NAME environment variable. Check your .env configuration.");
        }
        const connectPromise = (async () => {
            try {
                const conn = await mongoose_1.default
                    .createConnection(mainDbUri, {
                    dbName: mainDbName,
                    maxPoolSize: 20,
                    minPoolSize: 5,
                })
                    .asPromise();
                (0, ModelLoader_1.loadMainModels)(conn);
                tenantStore_1.tenantLRU.set(this.MAIN_DB_KEY, {
                    conn,
                    lastUsed: Date.now(),
                    closing: false,
                    isPinned: true,
                }, {
                    ttl: 0,
                    noDisposeOnSet: true,
                });
                console.log(`Main DB connected: ${mainDbName}`);
                return conn;
            }
            finally {
                this.pendingConnections.delete(this.MAIN_DB_KEY);
            }
        })();
        this.pendingConnections.set(this.MAIN_DB_KEY, connectPromise);
        return connectPromise;
    }
    async getMainDB() {
        const cached = tenantStore_1.tenantLRU.get(this.MAIN_DB_KEY);
        if (cached && cached.conn.readyState === 1 && !cached.closing) {
            cached.lastUsed = Date.now();
            return cached.conn;
        }
        console.warn("Main DB missing, reconnecting...");
        return this.connectMainDB();
    }
    async closeMainDB() {
        const cached = tenantStore_1.tenantLRU.get(this.MAIN_DB_KEY);
        if (!cached)
            return;
        cached.closing = true;
        await cached.conn.close(false);
        tenantStore_1.tenantLRU.delete(this.MAIN_DB_KEY);
        console.log("Main DB closed");
    }
    async forceCloseMainDB() {
        const cached = tenantStore_1.tenantLRU.get(this.MAIN_DB_KEY);
        if (!cached)
            return;
        cached.closing = true;
        await cached.conn.close(true);
        tenantStore_1.tenantLRU.delete(this.MAIN_DB_KEY);
        console.log("Main DB force closed");
    }
    /* ================= TENANT DB ================= */
    async getTenantConnection(tenantDbName, username = secret_1.default.TENANT_DB_USERNAME, password = secret_1.default.TENANT_DB_PASSWORD) {
        if (!tenantDbName) {
            throw new Error("Tenant DB name is required");
        }
        const cached = tenantStore_1.tenantLRU.get(tenantDbName);
        if (cached && cached.conn.readyState === 1 && !cached.closing) {
            cached.lastUsed = Date.now();
            return cached.conn;
        }
        if (this.pendingConnections.has(tenantDbName)) {
            return this.pendingConnections.get(tenantDbName);
        }
        const connectPromise = (async () => {
            try {
                const dbProtocol = secret_1.default.TENANT_DB_HOST?.endsWith(":27017") ? "mongodb" : "mongodb+srv";
                const dbUri = `${dbProtocol}://${username}:${password}@${secret_1.default.TENANT_DB_HOST}/${tenantDbName}${secret_1.default.TENANT_DB_AUTH_SOURCE}`;
                const conn = await mongoose_1.default
                    .createConnection(dbUri, {
                    maxPoolSize: 5,
                    minPoolSize: 0,
                    connectTimeoutMS: 10000,
                    serverSelectionTimeoutMS: 10000,
                })
                    .asPromise();
                conn.on("disconnected", () => {
                    const entry = tenantStore_1.tenantLRU.get(tenantDbName);
                    if (entry)
                        entry.closing = true;
                });
                (0, ModelLoader_1.loadTenantModels)(conn);
                await this.seedTenantOnce(tenantDbName, conn);
                tenantStore_1.tenantLRU.set(tenantDbName, {
                    conn,
                    lastUsed: Date.now(),
                    closing: false,
                });
                console.log(`Tenant DB connected: ${tenantDbName}`);
                return conn;
            }
            finally {
                this.pendingConnections.delete(tenantDbName);
            }
        })();
        this.pendingConnections.set(tenantDbName, connectPromise);
        return connectPromise;
    }
    /* ================= CLOSE TENANT ================= */
    async closeTenantConnection(tenantSlug) {
        const cached = tenantStore_1.tenantLRU.get(tenantSlug);
        if (!cached)
            return;
        cached.closing = true;
        await cached.conn.close(false);
        tenantStore_1.tenantLRU.delete(tenantSlug);
        console.log(`🔌 Tenant DB closed: ${tenantSlug}`);
    }
    async closeAllConnections() {
        for (const key of tenantStore_1.tenantLRU.keys()) {
            const entry = tenantStore_1.tenantLRU.get(key);
            await entry.conn.close(false);
        }
        tenantStore_1.tenantLRU.clear();
        console.log("All DB connections closed");
    }
    async closeAllTenantsOnly() {
        for (const key of tenantStore_1.tenantLRU.keys()) {
            const entry = tenantStore_1.tenantLRU.get(key);
            if (!entry.isPinned) {
                await entry.conn.close(false);
                tenantStore_1.tenantLRU.delete(key);
            }
        }
    }
    /* ================= HELPERS ================= */
    async seedTenantOnce(tenantDbName, conn) {
        const cached = tenantStore_1.tenantLRU.get(tenantDbName);
        if (cached?.seeded)
            return;
        await (0, seedTenantDefaultForDisposition_1.seedTenantDefaults)(conn);
        if (cached)
            cached.seeded = true;
    }
    /* ================= STATS ================= */
    getStats() {
        const keys = [...tenantStore_1.tenantLRU.keys()];
        return {
            mainDBInCache: tenantStore_1.tenantLRU.has(this.MAIN_DB_KEY),
            activeTenants: keys.filter(k => k !== this.MAIN_DB_KEY),
            cacheSize: tenantStore_1.tenantLRU.size,
            maxLimit: tenantStore_1.tenantLRU.max,
        };
    }
}
exports["default"] = DatabaseManager;


//# sourceURL=webpack://campaign-api/./src/config/DatabaseManager.ts?
}