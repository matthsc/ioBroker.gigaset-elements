"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEvent = exports.processEvents = void 0;
const convert_1 = require("./convert");
const util_1 = require("./util");
/**
 * process events and update states accordingly
 * @param adapter adapter reference
 * @param events events data to process
 */
async function processEvents(adapter, events) {
    await Promise.all(events.map((event) => processEvent(adapter, event)));
}
exports.processEvents = processEvents;
/**
 * process event and update states accordingly
 * @param adapter adapter reference
 * @param events events data to process
 */
async function processEvent(adapter, event) {
    var _a;
    switch (event.type) {
        case "open":
        case "tilt":
        case "close":
            await adapter.setStateAsync((0, util_1.getStateId)(event, "position"), (0, convert_1.convertSensorStateToId)(event.type), true);
            break;
        case "bs_online_notification":
            await adapter.setStateAsync(event.source_id + ".online", true, true);
            break;
        case "bs_offline_notification":
            await adapter.setStateAsync(event.source_id + ".online", false, true);
            break;
        case "intrusion_mode_loaded":
            await adapter.setStateAsync(event.source_id + ".intrusionMode", (_a = event.o) === null || _a === void 0 ? void 0 : _a.modeAfter, true);
            break;
        case "intrusion":
            await adapter.setStateAsync(event.source_id + ".intrusion", true, true);
            break;
        case "ack_intrusion":
            await adapter.setStateAsync(event.source_id + ".intrusion", false, true);
            break;
        case "isl01.configuration_changed.user.intrusion_mode":
            // ignore
            break;
        default:
            adapter.log.info("Unknown event type: " + JSON.stringify(event.type));
            break;
    }
}
exports.processEvent = processEvent;
//# sourceMappingURL=events.js.map