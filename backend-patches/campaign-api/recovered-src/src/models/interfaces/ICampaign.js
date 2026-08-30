{
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.campaignDialMethod = exports.campaignStatus = exports.campaignTypeEnum = void 0;
var campaignTypeEnum;
(function (campaignTypeEnum) {
    campaignTypeEnum["SMS"] = "SMS";
    campaignTypeEnum["MMS"] = "MMS";
    campaignTypeEnum["EMAIL"] = "EMAIL";
    campaignTypeEnum["CALL"] = "CALL";
})(campaignTypeEnum || (exports.campaignTypeEnum = campaignTypeEnum = {}));
;
var campaignStatus;
(function (campaignStatus) {
    campaignStatus["NEW"] = "NEW";
    campaignStatus["PROCESSING"] = "PROCESSING";
    campaignStatus["PAUSE"] = "PAUSE";
    campaignStatus["COMPLETED"] = "COMPLETED";
})(campaignStatus || (exports.campaignStatus = campaignStatus = {}));
;
var campaignDialMethod;
(function (campaignDialMethod) {
    campaignDialMethod["PREDICTIVE"] = "PREDICTIVE";
    campaignDialMethod["PROGRESSIVE"] = "PROGRESSIVE";
    campaignDialMethod["PREVIEW"] = "PREVIEW";
})(campaignDialMethod || (exports.campaignDialMethod = campaignDialMethod = {}));
;
;


//# sourceURL=webpack://campaign-api/./src/models/interfaces/ICampaign.ts?
}