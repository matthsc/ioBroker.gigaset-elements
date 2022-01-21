import type { IBaseStationRootItem } from "gigaset-elements-api";
import { getReadonlyStateObject } from "./util";

/**
 * creates basestation objects and states, and updates state data
 * @param adapter adapter reference
 * @param baseStations basestation data
 */
export async function createOrUpdateBasestations(
    adapter: ioBroker.Adapter,
    baseStations: IBaseStationRootItem[],
): Promise<void> {
    await Promise.all(baseStations.map((bs) => createOrUpdateBasestation(adapter, bs)));
}

/**
 * creates basestation object and states, and updates state data
 * @param adapter adapter reference
 * @param baseStation basestation data
 */
export async function createOrUpdateBasestation(adapter: ioBroker.Adapter, bs: IBaseStationRootItem): Promise<void> {
    await createBasestationObjects(adapter, bs);
    await updateBasestation(adapter, bs);
}

/**
 * create basestation object and states
 * @param adapter adapter reference
 * @param bs basestation data
 */
export async function createBasestationObjects(adapter: ioBroker.Adapter, bs: IBaseStationRootItem): Promise<void> {
    // create/update base station device
    await adapter.extendObjectAsync(bs.id, {
        type: "device",
        common: {
            name: "Gigaset-Elements Basestation",
        },
    });
    // create/update base station states
    await Promise.all([
        adapter.extendObjectAsync(
            `${bs.id}.name`,
            getReadonlyStateObject({
                name: bs.friendly_name,
                type: "string",
                role: "text",
                desc: "name of the base station",
            }),
        ),
        adapter.extendObjectAsync(
            `${bs.id}.online`,
            getReadonlyStateObject({
                name: "whether the base station is connected to the GE cloud",
                type: "boolean",
                role: "indicator.reachable",
            }),
        ),
    ]);
}

/**
 * update basestation states
 * @param adapter adapter reference
 * @param bs basestation data
 */
export async function updateBasestation(adapter: ioBroker.Adapter, bs: IBaseStationRootItem): Promise<void> {
    await Promise.all([
        adapter.setStateChangedAsync(`${bs.id}.name`, bs.friendly_name, true),
        adapter.setStateChangedAsync(`${bs.id}.online`, bs.status === "online", true),
        adapter.setStateChangedAsync(`info.intrusionMode`, bs.intrusion_settings.active_mode, true),
    ]);
}
