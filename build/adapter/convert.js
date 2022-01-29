"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIntrusionModesToStatesValue = exports.convertSensorStateToId = void 0;
/**
 * Converts GE state strings to numeric ioBroker id
 * @param state state string to convert
 */
function convertSensorStateToId(state) {
    switch (state) {
        case "closed":
        case "close":
        case "probably_closed":
            return 0;
        case "tilted":
        case "tilt":
            return 1;
        case "opened":
        case "open":
            return 2;
        default:
            throw new Error("Unknown state: " + state);
    }
}
exports.convertSensorStateToId = convertSensorStateToId;
/**
 * Converts base station intrusion modes to ioBroker "enum"
 */
function convertIntrusionModesToStatesValue(modesArray) {
    const modesStrings = modesArray.map((mode) => Object.keys(mode)[0]);
    const modesObject = modesStrings.reduce((prev, curr) => ({ ...prev, [curr]: curr }), {});
    return JSON.stringify(modesObject);
}
exports.convertIntrusionModesToStatesValue = convertIntrusionModesToStatesValue;
//# sourceMappingURL=convert.js.map