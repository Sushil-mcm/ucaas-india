{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallNotesWithDispositionController = void 0;
const BaseController_1 = __webpack_require__(/*! @/base/BaseController */ "./src/base/BaseController.ts");
const ResponseModel_1 = __webpack_require__(/*! @/base/ResponseModel */ "./src/base/ResponseModel.ts");
const CallNotesWithDispositionRepository_1 = __webpack_require__(/*! @/repositories/CallNotesWithDispositionRepository */ "./src/repositories/CallNotesWithDispositionRepository.ts");
class CallNotesWithDispositionController extends BaseController_1.BaseController {
    callNoteList = async (request, response) => {
        try {
            const result = await CallNotesWithDispositionRepository_1.CallNotesWithDispositionRepository.callNoteList(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Notes retrieved successfully",
                    result
                }
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
    callNoteDispositionSave = async (request, response) => {
        try {
            const result = await CallNotesWithDispositionRepository_1.CallNotesWithDispositionRepository.callNoteDispositionSave(request.body, request.user);
            return response.status(200).send(new ResponseModel_1.ResponseModel({
                success: true,
                data: {
                    message: "Success",
                    result
                }
            }));
        }
        catch (error) {
            const errObject = error instanceof Error ? error : new Error(String(error));
            return super.handleError(error, errObject, response);
        }
    };
}
exports.CallNotesWithDispositionController = CallNotesWithDispositionController;
;


//# sourceURL=webpack://campaign-api/./src/controllers/CallNotesWithDispositionController.ts?
}