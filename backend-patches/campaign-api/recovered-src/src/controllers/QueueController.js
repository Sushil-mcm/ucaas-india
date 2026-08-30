{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const ApiErrors_1 = __webpack_require__(/*! @/constants/ApiErrors */ "./src/constants/ApiErrors.ts");
const QueueRepository_1 = __webpack_require__(/*! @/repositories/QueueRepository */ "./src/repositories/QueueRepository.ts");
class QueueController extends BaseController_1.BaseController {
    upsert = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.upsert(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    templateUpsert = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.templateUpsert(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    list = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.list(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    templateList = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.templateList(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    delete = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.delete(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: result
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    templateDelete = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.templateDelete(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: result
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    templateInfo = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.templateInfo(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    info = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.info(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    publicInfo = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.publicInfo(request?.body);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    setAgentQueueStatus = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.setAgentQueueStatus(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    getQueueInvolvement = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.getQueueInvolvement(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
    getRoleBasedQueue = async (request, response) => {
        try {
            const result = await QueueRepository_1.QueueRepository.getRoleBasedQueue(request?.body, request?.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            if (super.isNull(error.status)) {
                return super.handleError(ApiErrors_1.ApiErrors.ServerError, error, response);
            }
            else {
                return super.handleError(error, error, response);
            }
        }
    };
}
exports.QueueController = QueueController;


//# sourceURL=webpack://campaign-api/./src/controllers/QueueController.ts?
}