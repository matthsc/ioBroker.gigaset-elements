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
    // quick exit
    if (!events.length)
        return;
    if (events.length === 1)
        return processEvent(adapter, events[0]);
    // ensure events are sorted in ascending order
    const sortedEvents = [...events];
    sortedEvents.sort((a, b) => a.ts.localeCompare(b.ts));
    sortedEvents.forEach((e) => {
        console.log(e.ts);
    });
    // process events - one by one, so order is maintained
    for (const event of sortedEvents)
        await processEvent(adapter, event);
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
            await adapter.setStateChangedAsync((0, util_1.getStateId)(event, "position"), (0, convert_1.convertSensorStateToId)(event.type), true);
            break;
        case "bs_online_notification":
        case "bs_offline_notification":
            await adapter.setStateChangedAsync(event.source_id + ".online", event.type.startsWith("bs_online"), true);
            break;
        case "intrusion":
        case "ack_intrusion":
            await adapter.setStateChangedAsync("info.intrusion", !event.type.startsWith("ack_"), true);
            break;
        case "intrusion_mode_loaded":
        case "isl01.bs01.intrusion_mode_loaded":
        case "isl01.bs01.intrusion_mode_loaded.fail":
        case "isl01.configuration_changed.user.intrusion_mode": {
            await adapter.setStateChangedAsync("info.intrusionMode", (_a = event.o) === null || _a === void 0 ? void 0 : _a.modeAfter, true);
            break;
        }
        case "sirenon":
        case "sirenoff":
            await adapter.setStateChangedAsync((0, util_1.getStateId)(event, "alarm"), event.type === "sirenon", true);
            break;
        case "battery_critical":
            await adapter.setStateChangedAsync((0, util_1.getStateId)(event, "battery"), "critical", true);
            break;
        case "sensor_online_notification":
        case "endnode_online_notification":
        case "sensor_offline_notification":
        case "endnode_offline_notification": {
            const isOnline = event.type.includes("_online_");
            await Promise.all([
                adapter.setStateChangedAsync((0, util_1.getStateId)(event, "online"), isOnline, true),
                adapter.setStateChangedAsync((0, util_1.getStateId)(event, "connectionStatus"), isOnline ? "online" : "offline", true),
            ]);
            break;
        }
        case "drilling_suspected":
        case "drilling_alert":
        case "water_detected":
            await adapter.setStateChangedAsync((0, util_1.getStateId)(event, "alarm"), true, true);
            break;
        case "drilling_off":
        case "water_no_longer_detected":
            await adapter.setStateChangedAsync((0, util_1.getStateId)(event, "alarm"), false, true);
            break;
        case "user_alarm_start":
        case "user_alarm_end":
            await adapter.setStateChangedAsync("info.userAlarm", event.type.endsWith("start"), true);
            break;
        default:
            adapter.log.info("Unknown event type: " + JSON.stringify(event.type));
            break;
    }
}
exports.processEvent = processEvent;
//# sourceMappingURL=events.js.map