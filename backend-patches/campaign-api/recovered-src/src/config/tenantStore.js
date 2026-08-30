{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tenantConnections = exports.tenantLRU = void 0;
const lru_cache_1 = __webpack_require__(/*! lru-cache */ "lru-cache");
// 2. Instantiate using new LRUCache instead of new LRU
exports.tenantLRU = new lru_cache_1.LRUCache({
    max: 100,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: true,
    dispose: (value, key, reason) => {
        console.log(`Disposing connection for ${key}. Reason: ${reason}`);
        if (value.isPinned) {
            console.warn(`Warning: Pinned connection ${key} is being disposed!`);
        }
        value.closing = true;
        value.conn.close(false)
            .then(() => {
            console.log(`Connection ${key} closed successfully.`);
        })
            .catch((err) => {
            console.error(`Error closing connection ${key}:`, err);
        });
    },
});
exports.tenantConnections = new Map();


//# sourceURL=webpack://campaign-api/./src/config/tenantStore.ts?
}