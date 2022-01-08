import type { IEventsItem, ISubelementsItem } from "gigaset-elements-api";

function isSubelementsItem(item: unknown): item is ISubelementsItem {
    return Object.prototype.hasOwnProperty.call(item, "connectionStatus");
}

function isEventsItem(item: unknown): item is IEventsItem {
    return Object.prototype.hasOwnProperty.call(item, "source_id") && Object.prototype.hasOwnProperty.call(item, "o");
}

export function getSubelementType(element: ISubelementsItem): string {
    return element.type.split(".")[1]; // i.e. "bs01.um01"
}

export function getStateId(element: ISubelementsItem | IEventsItem, state: string): string {
    let type: string;
    let id: string;
    let baseId: string;
    if (isEventsItem(element)) {
        type = element.o.type;
        id = element.o.id;
        baseId = element.source_id;
        return `${baseId}.${type}-${id}.${state}`;
    }
    if (isSubelementsItem(element)) {
        return `${getChannelId(element)}.${state}`;
    }

    throw new Error("Unsupported element type, or element properties not initialized properly");
}

export function getChannelId(element: ISubelementsItem): string {
    const type = getSubelementType(element);
    const [baseId, id] = element.id.split("."); // i.e. "abcde001.01234"
    return `${baseId}.${type}-${id}`;
}

/**
 * creates a default read-only state object
 * @param common options for the state
 * @returns state object
 */
export function getReadonlyStateObject(
    common: Partial<ioBroker.StateCommon> & Pick<ioBroker.StateCommon, "name" | "type" | "role">,
): Partial<ioBroker.StateObject> {
    return {
        type: "state",
        common: {
            read: true,
            write: false,
            ...common,
        },
    };
}
