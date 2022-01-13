"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateElement = exports.updateElements = exports.createOrUpdateElement = exports.createOrUpdateElements = void 0;
const convert_1 = require("./convert");
const util_1 = require("./util");
/**
 * create elements objects and states, and updates state data
 * @param adapter adapter reference
 * @param elements elements data
 */
async function createOrUpdateElements(adapter, elements) {
    await Promise.all(elements.map((bs) => Promise.all(bs.subelements.map((element) => createOrUpdateElement(adapter, element)))));
}
exports.createOrUpdateElements = createOrUpdateElements;
/**
 * create element object and states, and updates state data
 * @param adapter adapter reference
 * @param element element data
 */
async function createOrUpdateElement(adapter, element) {
    var _a, _b, _c, _d;
    // create element channel
    await adapter.extendObjectAsync((0, util_1.getChannelId)(element), {
        type: "channel",
        common: {
            name: element.friendlyName,
            role: "sensor",
        },
    });
    // create element states
    const statePromises = [
        adapter.extendObjectAsync((0, util_1.getStateId)(element, "name"), (0, util_1.getReadonlyStateObject)({
            name: element.friendlyName,
            type: "string",
            role: "text",
        })),
        adapter.extendObjectAsync((0, util_1.getStateId)(element, "connectionStatus"), (0, util_1.getReadonlyStateObject)({
            name: "connection status",
            type: "string",
            role: "text",
        })),
        adapter.extendObjectAsync((0, util_1.getStateId)(element, "online"), (0, util_1.getReadonlyStateObject)({
            name: "whether the element is online",
            type: "boolean",
            role: "indicator.reachable",
        })),
        adapter.extendObjectAsync((0, util_1.getStateId)(element, "updateStatus"), (0, util_1.getReadonlyStateObject)({
            name: "update status",
            type: "string",
            role: "info.status",
        })),
        adapter.extendObjectAsync((0, util_1.getStateId)(element, "updatesAvailable"), (0, util_1.getReadonlyStateObject)({
            name: "whether firmware updates are available",
            type: "boolean",
            role: "indicator",
        })),
    ];
    if ((_a = element.room) === null || _a === void 0 ? void 0 : _a.friendlyName)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "roomName"), (0, util_1.getReadonlyStateObject)({ name: "room friendly name", type: "string", role: "text" })));
    if (element.batteryStatus)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "battery"), (0, util_1.getReadonlyStateObject)({ name: "battery state", type: "string", role: "text" })));
    if (element.positionStatus)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "position"), (0, util_1.getReadonlyStateObject)({ name: "window/door state", type: "number", role: "sensor.window.3" })));
    if ((_b = element.states) === null || _b === void 0 ? void 0 : _b.temperature)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "temperature"), (0, util_1.getReadonlyStateObject)({ name: "temperature", type: "number", role: "value.temperature", unit: "°C" })));
    if ((_c = element.states) === null || _c === void 0 ? void 0 : _c.pressure)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "pressure"), (0, util_1.getReadonlyStateObject)({ name: "air pressure", type: "number", role: "value.pressure", unit: "hPa" })));
    if ((_d = element.states) === null || _d === void 0 ? void 0 : _d.humidity)
        statePromises.push(adapter.extendObjectAsync((0, util_1.getStateId)(element, "humidity"), (0, util_1.getReadonlyStateObject)({ name: "humidity", type: "number", role: "value.humidity", unit: "%" })));
    await Promise.all(statePromises);
    await updateElement(adapter, element);
}
exports.createOrUpdateElement = createOrUpdateElement;
/**
 * update elements states
 * @param adapter adapter reference
 * @param elements elements data
 */
async function updateElements(adapter, elements) {
    await Promise.all(elements.map((element) => updateElement(adapter, element)));
}
exports.updateElements = updateElements;
/**
 * update element states
 * @param adapter adapter reference
 * @param element element data
 */
async function updateElement(adapter, element) {
    var _a, _b, _c, _d;
    // common states
    const updates = [
        adapter.setStateChangedAsync((0, util_1.getStateId)(element, "name"), element.friendlyName, true),
        adapter.setStateChangedAsync((0, util_1.getStateId)(element, "connectionStatus"), element.connectionStatus, true),
        adapter.setStateChangedAsync((0, util_1.getStateId)(element, "online"), element.connectionStatus === "online", true),
        adapter.setStateChangedAsync((0, util_1.getStateId)(element, "updateStatus"), element.firmwareStatus, true),
        adapter.setStateChangedAsync((0, util_1.getStateId)(element, "updatesAvailable"), element.firmwareStatus !== "up_to_date", true),
    ];
    // individual states
    if ((_a = element.room) === null || _a === void 0 ? void 0 : _a.friendlyName)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "roomName"), element.room.friendlyName, true));
    if (element.batteryStatus)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "battery"), element.batteryStatus, true));
    if (element.positionStatus)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "position"), element.connectionStatus === "online" ? (0, convert_1.convertSensorStateToId)(element.positionStatus) : 0, true));
    if ((_b = element.states) === null || _b === void 0 ? void 0 : _b.temperature)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "temperature"), element.states.temperature, true));
    if ((_c = element.states) === null || _c === void 0 ? void 0 : _c.pressure)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "pressure"), element.states.pressure, true));
    if ((_d = element.states) === null || _d === void 0 ? void 0 : _d.humidity)
        updates.push(adapter.setStateChangedAsync((0, util_1.getStateId)(element, "humidity"), element.states.humidity, true));
    await Promise.all(updates);
}
exports.updateElement = updateElement;
//# sourceMappingURL=elements.js.map