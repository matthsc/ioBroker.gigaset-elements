"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadonlyStateObject = exports.getChannelId = exports.getStateId = exports.getSubelementType = void 0;
function isSubelementsItem(item) {
    return Object.prototype.hasOwnProperty.call(item, "connectionStatus");
}
function isEventsItem(item) {
    return Object.prototype.hasOwnProperty.call(item, "source_id") && Object.prototype.hasOwnProperty.call(item, "o");
}
function getSubelementType(element) {
    return element.type.split(".")[1]; // i.e. "bs01.um01"
}
exports.getSubelementType = getSubelementType;
function getStateId(element, state) {
    var _a, _b;
    if (isEventsItem(element)) {
        if (!((_a = element.o) === null || _a === void 0 ? void 0 : _a.type) || !((_b = element.o) === null || _b === void 0 ? void 0 : _b.id))
            return "";
        const type = element.o.type;
        const id = element.o.id;
        const baseId = element.source_id;
        return `${baseId}.${type}-${id}.${state}`;
    }
    if (isSubelementsItem(element)) {
        return `${getChannelId(element)}.${state}`;
    }
    throw new Error("Unsupported element type, or element properties not initialized properly");
}
exports.getStateId = getStateId;
function getChannelId(element) {
    const type = getSubelementType(element);
    const [baseId, id] = element.id.split("."); // i.e. "abcde001.01234"
    return `${baseId}.${type}-${id}`;
}
exports.getChannelId = getChannelId;
/**
 * creates a default read-only state object
 * @param common options for the state
 * @returns state object
 */
function getReadonlyStateObject(common) {
    return {
        type: "state",
        common: {
            read: true,
            write: false,
            ...common,
        },
    };
}
exports.getReadonlyStateObject = getReadonlyStateObject;
//# sourceMappingURL=util.js.map