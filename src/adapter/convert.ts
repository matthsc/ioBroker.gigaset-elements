import { IModesItem } from "gigaset-elements-api";

/**
 * Converts GE state strings to numeric ioBroker id
 * @param state state string to convert
 */
export function convertSensorStateToId(state: string): number {
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

/**
 * Converts base station intrusion modes to ioBroker "enum"
 */
export function convertIntrusionModesToStatesValue(modesArray: IModesItem[]): string {
    const modesStrings = modesArray.map((mode) => Object.keys(mode)[0]);
    const modesObject = modesStrings.reduce((prev, curr) => ({ ...prev, [curr]: curr }), {});
    return JSON.stringify(modesObject);
}
