{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequireAdmin = void 0;
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const RequireAdmin = (req, res, next) => {
    const role = req.user?.role || req.headers["x-user-role"];
    if (role !== "ADMIN") {
        return HttpException_1.HttpException.showErrorMessage(403, "ADMIN role required", res);
    }
    next();
};
exports.RequireAdmin = RequireAdmin;


//# sourceURL=webpack://campaign-api/./src/middleware/RequireAdmin.ts?
}