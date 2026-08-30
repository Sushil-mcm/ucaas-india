{
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NatsController = void 0;
const nats_1 = __webpack_require__(/*! nats */ "nats");
const secret_1 = __importDefault(__webpack_require__(/*! ../../src/config/secret */ "./src/config/secret.ts"));
const natsEventHandler_1 = __webpack_require__(/*! ./natsEventHandler */ "./src/nats/natsEventHandler.ts");
const server = secret_1.default.NATS_SERVER;
console.log("NATS server:", server);
const options = {
    reconnectTimeWait: 5 * 1000,
    servers: server,
};
const jc = (0, nats_1.JSONCodec)();
let nc = null;
let js = null;
let jsm = null;
class NatsController {
    // public static async init() {
    //   try {
    //     nc = await connect(options);
    //     console.log(`connected to ${nc.getServer()}`);
    //     // Subscribe to all events
    //     const events = nc.subscribe("campaign.rpc.>");
    //     // Initialize JetStream (optional, for your new queue)
    //     await this.initJetStream();
    //     (async () => {
    //       for await (const msg of events) {
    //         const subject = msg.subject;
    //         if (subject.startsWith("$JS.")) continue
    //         let decodeData: any = null;
    //         //Safe JSON decoding
    //         try {
    //           decodeData = jc.decode(msg.data);
    //         } catch (err: any) {
    //           console.error(`Failed to decode message for ${subject}:`, err.message);
    //           // Respond with error and skip
    //           msg.respond(
    //             jc.encode({
    //               status: 422,
    //               success: false,
    //               error: { message: "Bad JSON received" },
    //             })
    //           );
    //           continue;
    //         }
    //         const data = decodeData?.data || decodeData;
    //         console.log("Received userEvent request:", subject, data);
    //         const handlerFn = NatsEventUtils.natsEventHandlerMap(subject);
    //         if (typeof handlerFn === "function") {
    //           try {
    //             let response: any;
    //             if (!handlerFn.name) {
    //               // Old style handler (Request/Response)
    //               let finalResponse: any;
    //               const fakeReq: any = { body: data };
    //               const fakeRes: any = {
    //                 status: (code: number) => ({
    //                   send: (payload: any) => {
    //                     finalResponse = { status: code, ...payload };
    //                     return finalResponse;
    //                   },
    //                 }),
    //               };
    //               response = await handlerFn(fakeReq, fakeRes) ?? finalResponse;
    //             } else {
    //               // Function accepts data directly
    //               try {
    //                 const result = await handlerFn(data);
    //                 response = { status: 200, success: true, data: { result } };
    //               } catch (error: any) {
    //                 response = {
    //                   status: error.status || 422,
    //                   success: false,
    //                   error: {
    //                     message: error.message || "Unexpected repository error",
    //                   },
    //                 };
    //               }
    //             }
    //             // Respond back
    //             msg.respond(jc.encode({ response }));
    //           } catch (err) {
    //             console.error("Handler execution failed:", subject, err);
    //             msg.respond(
    //               jc.encode({
    //                 status: 422,
    //                 success: false,
    //                 error: { message: "Handler failed" },
    //               })
    //             );
    //           }
    //         } else {
    //           console.warn(`No handler found for subject: ${subject}`);
    //           msg.respond(
    //             jc.encode({
    //               status: 422,
    //               success: false,
    //               error: { message: "Unknown subject" },
    //             })
    //           );
    //         }
    //       }
    //     })();
    //     // Reconnect logic
    //     nc.closed().then(async (err) => {
    //       nc = null;
    //       console.log(`connection closed${err ? " with error: " + err.message : ""}`);
    //       await delay(5000);
    //       NatsController.init();
    //     });
    //   } catch (err: any) {
    //     console.error("Failed to connect to NATS:", err.message);
    //     nc = null;
    //     await delay(5000);
    //     NatsController.init();
    //   }
    // }
    static async init(subscribeToEvents = true) {
        try {
            nc = await (0, nats_1.connect)(options);
            if (subscribeToEvents) {
                /**chatEvent */
                const campaignEvent = nc.subscribe("callcampaign.>");
                (async () => {
                    for await (const msg of campaignEvent) {
                        const subject = msg.subject;
                        const decodeData = jc.decode(msg.data);
                        const data = decodeData?.doc || decodeData?.body || decodeData;
                        const handlerFn = natsEventHandler_1.NatsEventUtils.natsEventHandlerMap(subject);
                        if (typeof handlerFn === "function") {
                            try {
                                const response = await (async () => {
                                    const usesExpressArgs = handlerFn.length >= 2;
                                    if (usesExpressArgs) {
                                        let finalResponse;
                                        const fakeReq = { body: data };
                                        const fakeRes = {
                                            status: (code) => ({
                                                send: (payload) => {
                                                    finalResponse = { status: code, ...payload };
                                                    return finalResponse;
                                                },
                                            }),
                                        };
                                        const result = await handlerFn(fakeReq, fakeRes);
                                        return result ?? finalResponse;
                                    }
                                    else {
                                        try {
                                            const result = await handlerFn(data);
                                            return { status: 200, success: true, data: { result } };
                                        }
                                        catch (error) {
                                            return {
                                                status: error.status || 422,
                                                success: false,
                                                error: {
                                                    message: error.message || "Unexpected repository error",
                                                },
                                            };
                                        }
                                    }
                                })();
                                if (response !== undefined) {
                                    msg.respond(jc.encode({ response }));
                                }
                                else {
                                    msg.respond(jc.encode({
                                        status: 422,
                                        success: false,
                                        error: {
                                            message: "Handler failed: " + subject,
                                        },
                                    }));
                                }
                            }
                            catch (err) {
                                msg.respond(jc.encode({
                                    status: 422,
                                    success: false,
                                    error: {
                                        message: "Handler failed",
                                    },
                                }));
                            }
                        }
                        else {
                            console.warn(`No handler found for subject: ${subject}`);
                            msg.respond(jc.encode({
                                status: 422,
                                success: false,
                                error: {
                                    message: "Unknown subject",
                                },
                            }));
                        }
                    }
                })();
                /**chatEvent */
            }
            nc.closed().then(async (err) => {
                nc = null;
                console.log(`connection closed ${err ? " with error: " + err.message : ""}`);
                await delay(5000);
                NatsController.init(subscribeToEvents);
            });
        }
        catch (err) {
            console.log(`error connecting to ${JSON.stringify(options)}`);
            console.log(err?.message);
            nc = null;
            await delay(5000);
            NatsController.init(subscribeToEvents);
        }
    }
    // Publish event safely
    static async publishEvent(subject, data, timeout = 30000) {
        if (!nc) {
            console.error("NATS connection not initialized");
            return { status: 200, data: [] };
        }
        try {
            const payload = data ?? {};
            const msg = await nc.request(subject, jc.encode(payload), { timeout });
            return jc.decode(msg.data);
        }
        catch (err) {
            return { status: 200, data: [] };
        }
    }
    // Initialize JetStream safely
    static async initJetStream() {
        if (!nc)
            return;
        try {
            js = nc.jetstream();
            jsm = await nc.jetstreamManager();
            // Create notifications stream if it doesn't exist
            try {
                await jsm.streams.info("NOTIFICATIONS");
            }
            catch {
                await jsm.streams.add({
                    name: "NOTIFICATIONS",
                    subjects: ["notification.send"],
                    retention: nats_1.RetentionPolicy.Limits,
                    storage: nats_1.StorageType.File,
                    max_msgs: -1,
                });
            }
            console.log("JetStream initialized");
        }
        catch (err) {
            console.error("Failed to initialize JetStream:", err.message);
        }
    }
    // Publish to JetStream
    static async publishNotificationEvent(data) {
        if (!js) {
            console.error("JetStream not initialized");
            return;
        }
        try {
            await js.publish("notification.send", jc.encode(data ?? {}));
        }
        catch (err) {
            console.error("JetStream publish failed:", err.message);
        }
    }
}
exports.NatsController = NatsController;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


//# sourceURL=webpack://campaign-api/./src/nats/NatsController.ts?
}