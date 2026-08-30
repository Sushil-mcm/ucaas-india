{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.App = void 0;
const error_middleware_1 = __webpack_require__(/*! @/middleware/error.middleware */ "./src/middleware/error.middleware.ts");
const cors_1 = __importDefault(__webpack_require__(/*! cors */ "cors"));
const express_1 = __importDefault(__webpack_require__(/*! express */ "express"));
const helmet_1 = __importDefault(__webpack_require__(/*! helmet */ "helmet"));
const hpp_1 = __importDefault(__webpack_require__(/*! hpp */ "hpp"));
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! ./config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const secret_1 = __importDefault(__webpack_require__(/*! ./config/secret */ "./src/config/secret.ts"));
const Logger_1 = __importDefault(__webpack_require__(/*! ./middleware/Logger */ "./src/middleware/Logger.ts"));
const NatsController_1 = __webpack_require__(/*! ./nats/NatsController */ "./src/nats/NatsController.ts");
const workers_1 = __webpack_require__(/*! ./queues/workers */ "./src/queues/workers/index.ts");
class App {
    app;
    env;
    port;
    constructor(routes) {
        this.app = (0, express_1.default)();
        this.env = secret_1.default.NODE_ENV || "development";
        this.port = secret_1.default.PORT || 3004;
        this.initMiddlewares();
        this.initRoutes(routes);
        this.initErrorHandling();
    }
    listen() {
        this.app.listen(this.port, () => {
            return console.log(`Express is listening at http://localhost:${this.port}`);
        });
    }
    async initMiddlewares() {
        const allowedOrigins = [
            "http://localhost:3000",
            "https://portal.dialphone.ai",
        ];
        this.app.use((0, cors_1.default)({
            origin: function (origin, callback) {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                }
                else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
        }));
        this.app.use((0, hpp_1.default)());
        this.app.use((0, helmet_1.default)());
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
        this.app.use(express_1.default.static("public"));
        this.app.use(Logger_1.default);
    }
    async initializeNats() {
        // if (secret.NODE_ENV === "production") {
        console.log("===>NatsController (Start)<===");
        await NatsController_1.NatsController.init();
        console.log("===>NatsController (End)<===");
        // }
    }
    initRoutes(routes) {
        routes.forEach((route) => {
            this.app.use("/", route.router);
        });
    }
    initErrorHandling() {
        this.app.use(error_middleware_1.globalErrorHandler);
    }
    async initialize() {
        try {
            // 1. Connect DB first (The Pinned Main DB in LRU)
            await DatabaseManager_1.default.getInstance().getMainDB();
            console.log("Database initialized successfully");
            // 2. Connect NATS before HTTP routes or queue workers publish events
            await this.initializeNats();
            // 3. Start workers in this same process
            if (secret_1.default.REDIS_ENABLED) {
                await (0, workers_1.startWorkers)();
            }
            else {
                console.log("Skipping worker startup because REDIS_ENABLED=false");
            }
        }
        catch (error) {
            console.error("Startup failed:", error);
            process.exit(1);
        }
    }
}
exports.App = App;


//# sourceURL=webpack://campaign-api/./src/app.ts?
}