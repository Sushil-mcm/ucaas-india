{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallStatisticsController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const CallStatisticsRepository_1 = __webpack_require__(/*! @/repositories/CallStatisticsRepository */ "./src/repositories/CallStatisticsRepository.ts");
const HttpException_1 = __webpack_require__(/*! @/utils/HttpException */ "./src/utils/HttpException.ts");
class CallStatisticsController extends BaseController_1.BaseController {
    getRequestUser(request) {
        if (!request.user) {
            throw new HttpException_1.HttpException(401, "Unauthorized");
        }
        return request.user;
    }
    callStatisticsList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CallStatisticsRepository_1.CallStatisticsRepository.callStatisticsList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign Call Statistic',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    retryCallLogList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CallStatisticsRepository_1.CallStatisticsRepository.retryCallLogList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Retry call list',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    callStatisticsCampaignList = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CallStatisticsRepository_1.CallStatisticsRepository.callStatisticsCampaignList(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign List',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    memberCallsReport = async (request, response) => {
        try {
            const user = this.getRequestUser(request);
            const result = await CallStatisticsRepository_1.CallStatisticsRepository.memberCallsReport(request.body, user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: 'Campaign List',
                    result, // contains rows, total, page, limit, totalPages
                },
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
}
exports.CallStatisticsController = CallStatisticsController;


//# sourceURL=webpack://campaign-api/./src/controllers/CallStatisticsController.ts?
}