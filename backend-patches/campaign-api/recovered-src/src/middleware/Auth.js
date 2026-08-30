{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Auth = void 0;
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const Auth = async (req, res, next) => {
    const tenantDbName = req.headers["x-db-name"];
    const company_uuid = req.headers["x-user-company_uuid"];
    const user_uuid = req.headers["x-user-user_uuid"];
    const role = req.headers["x-user-role"];
    const username = req.headers["x-user-username"];
    const first_name = req.headers["x-user-first_name"];
    const last_name = req.headers["x-user-last_name"];
    const email = req.headers["x-user-email"];
    const extension = req.headers["x-user-extension"];
    const domain = req.headers["x-user-domain"];
    if (!tenantDbName || !company_uuid || !user_uuid || !role) {
        return HttpException_1.HttpException.showErrorMessage(401, `Missing required headers`, res);
    }
    req.user = {
        company_uuid,
        user_uuid,
        role,
        first_name: first_name || null,
        last_name: last_name || null,
        username: username || null,
        email: email || null,
        extension,
        domain,
        connectionTenant: tenantDbName,
    };
    // If valid, pass to the next middleware
    next();
};
exports.Auth = Auth;


//# sourceURL=webpack://campaign-api/./src/middleware/Auth.ts?
}