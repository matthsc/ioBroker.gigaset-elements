import type { IBs01Item, ISubelementsItem } from "gigaset-elements-api";
import { convertSensorStateToId } from "./convert";
import { getChannelId, getReadonlyStateObject, getStateId } from "./util";

/**
 * create elements objects and states, and updates state data
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function createOrUpdateElements(adapter: ioBroker.Adapter, elements: IBs01Item[]): Promise<void> {
    await Promise.all(
        elements.map((bs) => Promise.all(bs.subelements.map((element) => createOrUpdateElement(adapter, element)))),
    );
}

/**
 * create element object and states, and updates state data
 * @param adapter adapter reference
 * @param element element data
 */
export async function createOrUpdateElement(adapter: ioBroker.Adapter, element: ISubelementsItem): Promise<void> {
    // create element channel
    await adapter.extendObjectAsync(getChannelId(element), {
        type: "channel",
        common: {
            name: element.friendlyName,
            role: "sensor",
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
            getStateId(element, "updateStatus"),
            getReadonlyStateObject({
                name: "update status",
                type: "string",
                role: "info.status",
            }),
        ),
        adapter.extendObjectAsync(
            getStateId(element, "updatesAvailable"),
            getReadonlyStateObject({
                name: "whether firmware updates are available",
                type: "boolean",
                role: "indicator",
            }),
        ),
    ];

    if (
        [
            "is01", //siren
            "um01", //universal
            "ds02", //door
            "ws02", //window
            "wd01", //water
        ]
            .map((type) => `bs01.${type}`)
            .includes(element.type)
    )
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "alarm"),
                getReadonlyStateObject({
                    name: "whether the element has an alarm",
                    type: "boolean",
                    role: "sensor.alarm",
                    def: false,
                }),
            ),
        );

    if (element.room?.friendlyName)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "roomName"),
                getReadonlyStateObject({ name: "room friendly name", type: "string", role: "text" }),
            ),
        );
    if (element.batteryStatus)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "battery"),
                getReadonlyStateObject({ name: "battery state", type: "string", role: "text" }),
            ),
        );
    if (element.positionStatus)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "position"),
                getReadonlyStateObject({ name: "window/door state", type: "number", role: "value.window" }),
            ),
        );
    if (element.states?.temperature)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "temperature"),
                getReadonlyStateObject({ name: "temperature", type: "number", role: "value.temperature", unit: "°C" }),
            ),
        );
    if (element.states?.pressure)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "pressure"),
                getReadonlyStateObject({ name: "air pressure", type: "number", role: "value.pressure", unit: "hPa" }),
            ),
        );
    if (element.states?.humidity)
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "humidity"),
                getReadonlyStateObject({ name: "humidity", type: "number", role: "value.humidity", unit: "%" }),
            ),
        );

    await Promise.all(statePromises);
    await updateElement(adapter, element);
}

/**
 * update elements states
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function updateElements(adapter: ioBroker.Adapter, elements: ISubelementsItem[]): Promise<void> {
    await Promise.all(elements.map((element) => updateElement(adapter, element)));
}

/**
 * update element states
 * @param adapter adapter reference
 * @param element element data
 */
export async function updateElement(adapter: ioBroker.Adapter, element: ISubelementsItem): Promise<void> {
    // common states
    const updates = [
        adapter.setStateChangedAsync(getStateId(element, "name"), element.friendlyName, true),
        adapter.setStateChangedAsync(getStateId(element, "connectionStatus"), element.connectionStatus, true),
        adapter.setStateChangedAsync(getStateId(element, "online"), element.connectionStatus === "online", true),
        adapter.setStateChangedAsync(getStateId(element, "updateStatus"), element.firmwareStatus, true),
        adapter.setStateChangedAsync(
            getStateId(element, "updatesAvailable"),
            element.firmwareStatus !== "up_to_date",
            true,
        ),
    ];

    // individual states
    if (element.room?.friendlyName)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "roomName"), element.room.friendlyName, true));
    if (element.batteryStatus)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "battery"), element.batteryStatus, true));
    if (element.positionStatus)
        updates.push(
            adapter.setStateChangedAsync(
                getStateId(element, "position"),
                element.connectionStatus === "online" ? convertSensorStateToId(element.positionStatus) : 0,
                true,
            ),
        );
    if (element.states?.temperature)
        updates.push(
            adapter.setStateChangedAsync(getStateId(element, "temperature"), element.states.temperature, true),
        );
    if (element.states?.pressure)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "pressure"), element.states.pressure, true));
    if (element.states?.humidity)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "humidity"), element.states.humidity, true));

    await Promise.all(updates);
}
