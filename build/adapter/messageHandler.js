"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = exports.respondOk = exports.respondWithError = void 0;
const gigaset_elements_api_1 = require("gigaset-elements-api");
const _1 = require(".");
/** helper method for responding to messages */
function respond(adapter, obj, response) {
    if (!obj.callback)
        return;
    adapter.sendTo(obj.from, obj.command, response, obj.callback);
}
/** helper method to respond with an error */
function respondWithError(adapter, obj, error) {
    respond(adapter, obj, { error });
}
exports.respondWithError = respondWithError;
/** helper method to respond with a result */
function respondOk(adapter, obj, response) {
    respond(adapter, obj, { response });
}
exports.respondOk = respondOk;
/** message handler main method */
async function handleMessage(adapter, obj) {
    let response;
    switch (obj.command) {
        case "test":
            response = await handleTestMessages(adapter, obj);
            break;
        case "debug":
            response = await handleDebugMessages(adapter, obj);
            break;
        default:
            throw new Error("Unsupported command: " + obj.command);
    }
    respondOk(adapter, obj, response);
}
exports.handleMessage = handleMessage;
/** method for handling test messages */
async function handleTestMessages(adapter, obj) {
    switch (obj.message) {
        case "ping":
            return "pong";
        case "process-test-data":
            await processTestData(adapter);
            return "sucessfully processed test data";
        default:
            throw new Error("Unsupported 'test' message: " + obj.message);
    }
}
/** process test data */
async function processTestData(adapter) {
    const [basestations, elements, events] = await Promise.all([
        (0, gigaset_elements_api_1.loadBaseStations)(true),
        (0, gigaset_elements_api_1.loadElements)(true),
        (0, gigaset_elements_api_1.loadEvents)(true),
    ]);
    await (0, _1.createOrUpdateBasestations)(adapter, basestations);
    await (0, _1.createOrUpdateElements)(adapter, elements.bs01);
    await (0, _1.processEvents)(adapter, events.events);
}
/** method for handling debug messages */
async function handleDebugMessages(adapter, obj) {
    const message = obj.message;
    switch (message === null || message === void 0 ? void 0 : message.action) {
        case "prepare-test-data": {
            const [bs, elements, events] = await (0, gigaset_elements_api_1.retrieveAndPrepareTestData)(adapter.api, new Date(message.from));
            return { bs, elements, events };
        }
        case "load-bases-elements": {
            const bs = await adapter.api.getBaseStations();
            const elements = await adapter.api.getElements();
            return { bs, elements };
        }
        case "load-events": {
            const events = await adapter.api.getAllEvents(new Date(message.from), message.to ? new Date(message.to) : undefined);
            return { events };
        }
        default:
            throw new Error("Unsupported 'debug' action: " + (message === null || message === void 0 ? void 0 : message.action));
    }
}
//# sourceMappingURL=messageHandler.js.map