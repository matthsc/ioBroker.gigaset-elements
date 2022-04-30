import type { IGp02Item } from "gigaset-elements-api";
import { getReadonlyStateObject, getStateId } from "./util";

/**
 * create gp02 elements objects and states, and updates state data
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function createOrUpdateElementsGp02(adapter: ioBroker.Adapter, elements: IGp02Item[]): Promise<void> {
    await Promise.all(elements.map((element) => createOrUpdateElementGp02(adapter, element)));
}

/**
 * create gp02 element object and states, and updates state data
 * @param adapter adapter reference
 * @param element element data
 */
export async function createOrUpdateElementGp02(adapter: ioBroker.Adapter, element: IGp02Item): Promise<void> {
    // create element channel
    await adapter.extendObjectAsync("gp02-" + element.id, {
        type: "channel",
        common: {
            name: element.friendlyName,
            role: "phone",
        },
    });

    // create element states
    const statePromises = [
        adapter.extendObjectAsync(
            getStateId(element, "name"),
            getReadonlyStateObject({
                name: element.friendlyName,
                type: "string",
                role: "text",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "connectionStatus"),
            getReadonlyStateObject({
                name: "connection status",
                type: "string",
                role: "text",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "online"),
            getReadonlyStateObject({
                name: "whether the element is online",
                type: "boolean",
                role: "indicator.reachable",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "lastCallOutgoing"),
            getReadonlyStateObject({
                name: "last outgoing call",
                type: "string",
                role: "text.phone",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "lastCallIncoming"),
            getReadonlyStateObject({
                name: "last incoming call",
                type: "string",
                role: "text.phone",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "lastCallMissed"),
            getReadonlyStateObject({
                name: "last missed call",
                type: "string",
                role: "text.phone",
            }),
        ),
    ];

    if (element.room?.friendlyName)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "roomName"),
                getReadonlyStateObject({ name: "room friendly name", type: "string", role: "text" }),
            ),
        );

    await Promise.all(statePromises);
    await updateElementGp02(adapter, element);
}

/**
 * update gp02 elements states
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function updateElementsGp02(adapter: ioBroker.Adapter, elements: IGp02Item[]): Promise<void> {
    await Promise.all(elements.map((element) => updateElementGp02(adapter, element)));
}

/**
 * update gp02 element states
 * @param adapter adapter reference
 * @param element element data
 */
export async function updateElementGp02(adapter: ioBroker.Adapter, element: IGp02Item): Promise<void> {
    // common states
    const updates = [
        adapter.setStateChangedAsync(getStateId(element, "name"), element.friendlyName, true),
        adapter.setStateChangedAsync(getStateId(element, "connectionStatus"), element.connectionStatus, true),
        adapter.setStateChangedAsync(getStateId(element, "online"), element.connectionStatus === "online", true),
    ];

    // individual states
    if (element.room?.friendlyName)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "roomName"), element.room.friendlyName, true));

    await Promise.all(updates);
}
