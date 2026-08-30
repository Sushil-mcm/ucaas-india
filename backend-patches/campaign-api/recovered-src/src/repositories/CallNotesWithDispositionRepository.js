{
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallNotesWithDispositionRepository = void 0;
const DatabaseManager_1 = __importDefault(__webpack_require__(/*! @/config/DatabaseManager */ "./src/config/DatabaseManager.ts"));
const HttpException_1 = __webpack_require__(/*! @/exceptions/HttpException */ "./src/exceptions/HttpException.ts");
const mongoose_1 = __importStar(__webpack_require__(/*! mongoose */ "mongoose"));
const BaseTenantRepository_1 = __webpack_require__(/*! ./BaseTenantRepository */ "./src/repositories/BaseTenantRepository.ts");
class CallNotesWithDispositionRepository extends BaseTenantRepository_1.BaseTenantRepository {
    static async callNoteList(requestData, userData) {
        try {
            const tenantDB = await this.getTenantDBFromUser(userData);
            const CallNotesWithDispositionModel = tenantDB.models.call_notes_with_disposition;
            const page = requestData.page ?? 1;
            const limit = requestData.limit ?? 10;
            const skip = (page - 1) * limit;
            const sort = requestData.sort ?? { key: "created_at", desc: true };
            const sortKey = sort.key || "created_at";
            const sortOrder = sort.desc ? -1 : 1;
            const phone = requestData?.phone ?? "all";
            const search = requestData?.search ?? null;
            const match = {
                "notes.0": { $exists: true }
            };
            match.contactPhone = phone;
            if (search) {
                match.name = {
                    $regex: search,
                    $options: "i",
                };
            }
            const totalItems = await CallNotesWithDispositionModel.countDocuments(match);
            const rows = await CallNotesWithDispositionModel.find(match)
                .sort({ [sortKey]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean();
            const totalPages = Math.ceil(totalItems / limit);
            return {
                limit,
                currentPage: page,
                totalItems,
                totalPages,
                rows,
            };
        }
        catch (error) {
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
    static async callNoteDispositionSave(requestData, userData) {
        const tenantDB = await this.getTenantDBFromUser(userData);
        const CallNotesWithDispositionModel = tenantDB.models.call_notes_with_disposition;
        try {
            const trimmedContactName = typeof requestData?.contactName === "string" ? requestData.contactName.trim() : null;
            const hasUsableContactName = Boolean(trimmedContactName && !/^\+?[\d\s().-]+$/.test(trimmedContactName));
            const safeContactName = hasUsableContactName ? trimmedContactName : null;
            const trimmedContactEmail = requestData?.contactEmail?.trim() || null;
            const trimmedNoteText = requestData?.note?.note?.trim();
            const hasValidNote = Boolean(trimmedNoteText);
            if (requestData?.contactId && requestData?.contactId !== '') {
                if (!mongoose_1.Types.ObjectId.isValid(requestData?.contactId) && requestData?.contactId) {
                    throw new HttpException_1.HttpException(422, `The provided Contact ID is invalid.`);
                }
            }
            if (requestData?.campaignNumberId && requestData?.campaignNumberId !== '') {
                if (!mongoose_1.Types.ObjectId.isValid(requestData?.campaignNumberId) && requestData?.campaignNumberId) {
                    throw new HttpException_1.HttpException(422, `The provided Campaign number Id is invalid.`);
                }
            }
            const filter = {
                contactPhone: requestData.contactPhone
            };
            if (requestData.sipCallId) {
                filter.sipCallId = requestData.sipCallId;
            }
            let notesDispositionUpdate = {
                company_uuid: userData.company_uuid,
                disposition: requestData.disposition,
                source: requestData.source,
                contactId: requestData?.contactId || null,
                queueUuid: requestData?.queueUuid || null,
                campaignNumberId: requestData?.campaignNumberId || null,
                callbackScheduledDate: requestData?.callbackScheduledDate || null,
                client_uuid: requestData?.client_uuid || null,
                wrap_up_start_time: requestData?.wrap_up_start || null,
                wrap_up_end_time: requestData?.wrap_up_end || null,
                contactName: safeContactName,
                contactPhone: requestData?.contactPhone || null,
                contactEmail: trimmedContactEmail,
            };
            if (requestData?.serviceDetail?.uuid)
                notesDispositionUpdate.serviceDetail = requestData?.serviceDetail;
            const update = {
                $set: notesDispositionUpdate
            };
            if (hasValidNote) {
                update.$push = {
                    notes: {
                        $each: [{
                                ...requestData.note,
                                note: trimmedNoteText
                            }]
                    }
                };
            }
            if (["PREVIEW", "PROGRESSIVE", "PREDICTIVE", "QUEUE"].includes(requestData?.serviceDetail?.type)) {
                const mainDB = await DatabaseManager_1.default.getInstance().getMainDB();
                const LiveCallModel = mainDB.models.LiveCall;
                await LiveCallModel.updateOne({
                    $or: [
                        { call_uuid: requestData.sipCallId },
                        { b_leg_uuid: requestData.sipCallId }
                    ]
                }, { $set: { wrap_time_sec: requestData?.wrap_time_sec || 0 } }, { runValidators: true });
            }
            const options = {
                upsert: true,
                returnDocument: "after",
                setDefaultsOnInsert: true
            };
            await CallNotesWithDispositionModel.findOneAndUpdate(filter, update, options);
            if (requestData?.campaignNumberId && requestData?.campaignNumberId !== '') {
                const tenantDB = await this.getTenantDBFromUser(userData);
                const CampaignNumberModel = tenantDB.models.campaign_number;
                const filter = {
                    _id: new mongoose_1.default.Types.ObjectId(requestData?.campaignNumberId)
                };
                let campaignSavePayload = {
                    company_uuid: String(userData.company_uuid),
                    //_id: new mongoose.Types.ObjectId(requestData?.campaignNumberId) || null,
                    contactEmail: String(trimmedContactEmail),
                };
                // Do not overwrite the campaign contact name with a phone number
                // or with the string "null" when the request has no usable name.
                if (safeContactName) {
                    campaignSavePayload.contactName = safeContactName;
                }
                if (requestData?.callbackScheduledDate) {
                    campaignSavePayload.startExecutionDate = requestData?.callbackScheduledDate;
                    campaignSavePayload.requestStatus = "CALLBACK_SCHEDULED";
                }
                if (requestData?.disposition) {
                    campaignSavePayload.disposition = requestData?.disposition || null;
                }
                const update = {
                    $set: campaignSavePayload
                };
                if (hasValidNote) {
                    update.$push = {
                        notes: {
                            $each: [{
                                    ...requestData.note,
                                    note: trimmedNoteText
                                }]
                        }
                    };
                }
                const options = {
                    upsert: true,
                    returnDocument: "after",
                    setDefaultsOnInsert: true
                };
                await CampaignNumberModel.findOneAndUpdate(filter, update, options);
            }
            return { messages: "Note saved successfully." };
        }
        catch (error) {
            console.error(error);
            throw new HttpException_1.HttpException(422, error.message);
        }
    }
}
exports.CallNotesWithDispositionRepository = CallNotesWithDispositionRepository;


//# sourceURL=webpack://campaign-api/./src/repositories/CallNotesWithDispositionRepository.ts?
}