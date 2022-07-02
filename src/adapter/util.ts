import type { IEventsItem, IGp02Item, ISubelementsItem } from "gigaset-elements-api";

export function isDefined<T>(object: T | undefined, prop: keyof T): boolean {
    if (!object) return false;
    const value = object[prop];
    return Object.prototype.hasOwnProperty.call(object, prop) && value !== undefined && value !== null;
}

export function isSubelementsItem(item: unknown): item is ISubelementsItem {
    return (
        Object.prototype.hasOwnProperty.call(item, "connectionStatus") &&
        Object.prototype.hasOwnProperty.call(item, "type")
    );
}

export function isEventsItem(item: unknown): item is IEventsItem {
    return Object.prototype.hasOwnProperty.call(item, "ts");
}

export function isGp02Item(item: unknown): item is IGp02Item {
    return (
        Object.prototype.hasOwnProperty.call(item, "connectionStatus") &&
        !Object.prototype.hasOwnProperty.call(item, "type")
    );
}

export function getSubelementType(element: ISubelementsItem): string {
    return element.type.split(".")[1]; // i.e. "bs01.um01"
}

export function getStateId(element: ISubelementsItem | IEventsItem | IGp02Item, state: string): string {
    if (isEventsItem(element)) {
        if (!element.o?.type) return "";
        const type = element.o.type;
        if (type === "gp02.call") {
            return `gp02-${element.source_id}.${state}`;
        } else {
            const id = element.o.id;
            const baseId = element.source_id;
            return `${baseId}.${type}-${id}.${state}`;
        }
    }
    if (isSubelementsItem(element)) {
        return `${getChannelId(element)}.${state}`;
    }
    if (isGp02Item(element)) {
        return `gp02-${element.id}.${state}`;
    }

    throw new Error(
        "Unsupported element type, or element properties not initialized properly: " + JSON.stringify(element),
    );
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
