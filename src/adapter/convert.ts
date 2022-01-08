/**
 * Converts GE state strings to numeric IOBroker id
 * @param state state string to convert
 */
export function convertSensorStateToId(state: string): number {
    switch (state) {
        case "closed":
        case "close":
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
