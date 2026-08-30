{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.seedTenantDefaults = void 0;
const secret_1 = __importDefault(__webpack_require__(/*! ./secret */ "./src/config/secret.ts"));
const seedTenantDefaults = async (conn) => {
    const defaultDispositions = [
        {
            name: "Resolved",
            dispositionType: "AGENT",
            description: "The issue or query was fully addressed during the call."
        },
        {
            name: "Interested",
            dispositionType: "AGENT",
            description: "The caller showed interest in a product or service."
        },
        {
            name: "Not Interested",
            dispositionType: "AGENT",
            description: "The caller indicated no interest in the offered product or service."
        },
        {
            name: "Sale Closed",
            dispositionType: "AGENT",
            description: "The interaction concluded with the sale of a product or service."
        },
        {
            name: "Feedback Received",
            dispositionType: "AGENT",
            description: "Feedback was provided by the customer, valuable for service or product improvement."
        },
        {
            name: "Busy",
            dispositionType: "SYSTEM",
            description: "The line was busy, indicating the call could not be connected at the time."
        },
        {
            name: "No Answer",
            dispositionType: "SYSTEM",
            description: "The call was not answered, suggesting a need for a potential follow-up."
        },
        {
            name: "Agent Abandoned",
            dispositionType: "SYSTEM",
            description: "The call was ended by the agent before it was resolved, requiring review or follow-up."
        },
        {
            name: "Hang Up",
            dispositionType: "SYSTEM",
            description: "The caller ended the call before any resolution could be reached, intentionally or unintentionally."
        },
        {
            name: "Invalid Number",
            dispositionType: "SYSTEM",
            description: "The dialed number was incorrect, leading to an unsuccessful call attempt."
        },
        {
            name: "Happy Client",
            dispositionType: "AGENT",
            description: "The call ended with the client satisfied or happy with the service or information provided."
        },
        {
            name: "Call Back Later",
            dispositionType: "AGENT",
            description: "The caller requested to be contacted again at a more convenient time."
        },
        {
            name: "Cancel",
            dispositionType: "SYSTEM",
            description: "The call was canceled before a resolution was reached and may require follow-up."
        }
    ];
    const Disposition = conn.model("Disposition");
    const count = await Disposition.countDocuments();
    if (count === 0) {
        // Map the array to match your schema structure
        const dataToInsert = defaultDispositions.map(d => ({
            createdByName: secret_1.default.PROJECT || "DialPhone",
            dispositionType: d.dispositionType,
            disposition: {
                name: d.name,
                description: d.description
            }
        }));
        await Disposition.insertMany(dataToInsert);
        console.log("✅ Default dispositions inserted in bulk!");
    }
};
exports.seedTenantDefaults = seedTenantDefaults;


//# sourceURL=webpack://campaign-api/./src/config/seedTenantDefaultForDisposition.ts?
}