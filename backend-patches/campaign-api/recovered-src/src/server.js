{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const app_1 = __webpack_require__(/*! ./app */ "./src/app.ts");
const workers_1 = __webpack_require__(/*! ./queues/workers */ "./src/queues/workers/index.ts");
const api_1 = __webpack_require__(/*! ./routes/api */ "./src/routes/api.ts");
const app = new app_1.App([new api_1.ApiRoute()]);
process.on("SIGINT", async () => {
    console.log("🔻 SIGINT");
    await (0, workers_1.stopWorkers)();
    await DatabaseManager_1.default.getInstance().closeAllConnections();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.log("🔻 SIGTERM");
    await (0, workers_1.stopWorkers)();
    await DatabaseManager_1.default.getInstance().closeAllConnections();
    process.exit(0);
});
app.initialize().then(() => {
    app.listen();
});


//# sourceURL=webpack://campaign-api/./src/server.ts?
}