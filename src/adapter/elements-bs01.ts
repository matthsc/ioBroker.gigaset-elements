import type { IBs01Item, ISubelementsItem } from "gigaset-elements-api";
import { convertSensorStateToId } from "./convert";
import { getChannelId, getReadonlyStateObject, getStateId, isDefined } from "./util";

/**
 * create bs01 elements objects and states, and updates state data
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function createOrUpdateElementsBs01(adapter: ioBroker.Adapter, elements: IBs01Item[]): Promise<void> {
    await Promise.all(
        elements.map((bs) => Promise.all(bs.subelements.map((element) => createOrUpdateElementBs01(adapter, element)))),
    );
}

/**
 * create bs01 element object and states, and updates state data
 * @param adapter adapter reference
 * @param element element data
 */
export async function createOrUpdateElementBs01(adapter: ioBroker.Adapter, element: ISubelementsItem): Promise<void> {
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
    if (element.states?.relay) {
        statePromises.push(
            adapter.extendObjectAsync(getStateId(element, "relay"), {
                type: "state",
                common: {
                    name: "Relay",
                    type: "boolean",
                    role: "switch.power",
                    read: true,
                    write: true,
                },
            }),
        );
        statePromises.push(
            adapter.extendObjectAsync(getStateId(element, "relayButton"), {
                type: "state",
                common: {
                    name: "Button",
                    type: "boolean",
                    role: "button",
                    read: false,
                    write: true,
                },
            }),
        );
    }
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
    if (isDefined(element.states, "testRequired") || isDefined(element, "testRequired"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "testRequired"),
                getReadonlyStateObject({ name: "testRequired", type: "boolean", role: "indicator.maintenance" }),
            ),
        );
    if (isDefined(element, "smokeDetected"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "smokeDetected"),
                getReadonlyStateObject({ name: "smokeDetected", type: "boolean", role: "indicator.alarm.fire" }),
            ),
        );
    if (isDefined(element, "unmounted"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "unmounted"),
                getReadonlyStateObject({ name: "unmounted", type: "boolean", role: "indicator" }),
            ),
        );
    if (isDefined(element, "permanentBatteryLow"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "permanentBatteryLow"),
                getReadonlyStateObject({ name: "permanentBatteryLow", type: "boolean", role: "indicator.lowbat" }),
            ),
        );
    if (isDefined(element, "permanentBatteryChangeRequest"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "permanentBatteryChangeRequest"),
                getReadonlyStateObject({
                    name: "permanentBatteryChangeRequest",
                    type: "boolean",
                    role: "indicator.maintenance.lowbat",
                }),
            ),
        );
    if (isDefined(element, "smokeChamberFail"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "smokeChamberFail"),
                getReadonlyStateObject({ name: "smokeChamberFail", type: "boolean", role: "indicator.maintenance" }),
            ),
        );
    if (isDefined(element, "smokeDetectorOff"))
        statePromises.push(
            adapter.extendObjectAsync(
                getStateId(element, "smokeDetectorOff"),
                getReadonlyStateObject({ name: "smokeDetectorOff", type: "boolean", role: "indicator" }),
            ),
        );

    await Promise.all(statePromises);
    await updateElementBs01(adapter, element);
}

/**
 * update bs01 elements states
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function updateElementsBs01(adapter: ioBroker.Adapter, elements: ISubelementsItem[]): Promise<void> {
    await Promise.all(elements.map((element) => updateElementBs01(adapter, element)));
}

/**
 * update bs01 element states
 * @param adapter adapter reference
 * @param element element data
 */
export async function updateElementBs01(adapter: ioBroker.Adapter, element: ISubelementsItem): Promise<void> {
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
    if (element.states?.relay)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "relay"), element.states.relay === "on", true));
    if (element.states?.temperature)
        updates.push(
            adapter.setStateChangedAsync(getStateId(element, "temperature"), element.states.temperature, true),
        );
    if (element.states?.pressure)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "pressure"), element.states.pressure, true));
    if (element.states?.humidity)
        updates.push(adapter.setStateChangedAsync(getStateId(element, "humidity"), element.states.humidity, true));
    if (isDefined(element.states, "testRequired") || isDefined(element, "testRequired"))
        updates.push(
            adapter.setStateChangedAsync(
                getStateId(element, "testRequired"),
                element.testRequired || element.states?.testRequired ? true : false,
                true,
            ),
        );
    if (isDefined(element, "smokeDetected"))
        updates.push(adapter.setStateChangedAsync(getStateId(element, "smokeDetected"), element.smokeDetected!, true));
    if (isDefined(element, "unmounted"))
        updates.push(adapter.setStateChangedAsync(getStateId(element, "unmounted"), element.unmounted!, true));
    if (isDefined(element, "permanentBatteryLow"))
        updates.push(
            adapter.setStateChangedAsync(
                getStateId(element, "permanentBatteryLow"),
                element.permanentBatteryLow!,
                true,
            ),
        );
    if (isDefined(element, "permanentBatteryChangeRequest"))
        updates.push(
            adapter.setStateChangedAsync(
                getStateId(element, "permanentBatteryChangeRequest"),
                element.permanentBatteryChangeRequest!,
                true,
            ),
        );
    if (isDefined(element, "smokeChamberFail"))
        updates.push(
            adapter.setStateChangedAsync(getStateId(element, "smokeChamberFail"), element.smokeChamberFail!, true),
        );
    if (isDefined(element, "smokeDetectorOff"))
        updates.push(
            adapter.setStateChangedAsync(getStateId(element, "smokeDetectorOff"), element.smokeDetectorOff!, true),
        );

    await Promise.all(updates);
}
