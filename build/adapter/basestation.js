"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBasestation = exports.createBasestationObjects = exports.createOrUpdateBasestation = exports.createOrUpdateBasestations = void 0;
const convert_1 = require("./convert");
const util_1 = require("./util");
/**
 * creates basestation objects and states, and updates state data
 * @param adapter adapter reference
 * @param baseStations basestation data
 */
async function createOrUpdateBasestations(adapter, baseStations) {
    await Promise.all(baseStations.map((bs) => createOrUpdateBasestation(adapter, bs)));
}
exports.createOrUpdateBasestations = createOrUpdateBasestations;
/**
 * creates basestation object and states, and updates state data
 * @param adapter adapter reference
 * @param baseStation basestation data
 */
async function createOrUpdateBasestation(adapter, bs) {
    await createBasestationObjects(adapter, bs);
    await updateBasestation(adapter, bs);
}
exports.createOrUpdateBasestation = createOrUpdateBasestation;
/**
 * create basestation object and states
 * @param adapter adapter reference
 * @param bs basestation data
 */
async function createBasestationObjects(adapter, bs) {
    // create/update base station device
    await adapter.extendObjectAsync(bs.id, {
        type: "device",
        common: {
            name: "Gigaset-Elements Basestation",
        },
    });
    // create/update base station states
    await Promise.all([
        adapter.extendObjectAsync(`${bs.id}.name`, (0, util_1.getReadonlyStateObject)({
            name: bs.friendly_name,
            type: "string",
            role: "text",
            desc: "name of the base station",
        })),
        adapter.extendObjectAsync(`${bs.id}.online`, (0, util_1.getReadonlyStateObject)({
            name: "whether the base station is connected to the GE cloud",
            type: "boolean",
            role: "indicator.reachable",
        })),
        adapter.extendObjectAsync(`${bs.id}.intrusionMode`, (0, util_1.getReadonlyStateObject)({
            name: "configured intrusion mode",
            type: "string",
            role: "text",
            states: (0, convert_1.convertIntrusionModesToStatesValue)(bs.intrusion_settings.modes),
        })),
        adapter.extendObjectAsync(`${bs.id}.intrusion`, (0, util_1.getReadonlyStateObject)({
            name: "whether there is an active intrusion alert",
            type: "boolean",
            role: "indicator.alarm",
        })),
    ]);
}
exports.createBasestationObjects = createBasestationObjects;
/**
 * update basestation states
 * @param adapter adapter reference
 * @param bs basestation data
 */
async function updateBasestation(adapter, bs) {
    await Promise.all([
        adapter.setStateChangedAsync(`${bs.id}.name`, bs.friendly_name, true),
        adapter.setStateChangedAsync(`${bs.id}.online`, bs.status === "online", true),
        adapter.setStateChangedAsync(`${bs.id}.intrusionMode`, bs.intrusion_settings.active_mode, true),
    ]);
}
exports.updateBasestation = updateBasestation;
//# sourceMappingURL=basestation.js.map