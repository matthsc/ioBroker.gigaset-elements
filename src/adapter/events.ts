import type { IEventsItem } from "gigaset-elements-api";
import { convertSensorStateToId } from "./convert";
import { getStateId } from "./util";

/**
 * process events and update states accordingly
 * @param adapter adapter reference
 * @param events events data to process
 */
export async function processEvents(adapter: ioBroker.Adapter, events: IEventsItem[]): Promise<void> {
    await Promise.all(events.map((event) => processEvent(adapter, event)));
}

/**
 * process event and update states accordingly
 * @param adapter adapter reference
 * @param events events data to process
 */
export async function processEvent(adapter: ioBroker.Adapter, event: IEventsItem): Promise<void> {
    switch (event.type) {
        case "open":
        case "tilt":
        case "close":
            await adapter.setStateAsync(getStateId(event, "position"), convertSensorStateToId(event.type), true);
            break;
        case "bs_online_notification":
            await adapter.setStateAsync(event.source_id + ".online", true, true);
            break;
        case "bs_offline_notification":
            await adapter.setStateAsync(event.source_id + ".online", false, true);
            break;
        case "intrusion_mode_loaded":
            await adapter.setStateAsync(event.source_id + ".intrusionMode", (event.o as any).modeAfter, true);
            break;
        case "intrusion":
            await adapter.setStateAsync(event.source_id + ".intrusion", true, true);
            break;
        case "ack_intrusion":
            await adapter.setStateAsync(event.source_id + ".intrusion", false, true);
            break;
        case "isl01.configuration_changed.user.intrusion_mode":
            // ignore
            break;
        default:
            adapter.log.info("Unknown event type: " + JSON.stringify(event.type));
            break;
    }
}
