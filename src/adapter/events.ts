import type { IEventsItem } from "gigaset-elements-api";
import { convertSensorStateToId } from "./convert";
import { getStateId } from "./util";

/**
 * process events and update states accordingly
 * @param adapter adapter reference
 * @param events events data to process
 */
export async function processEvents(adapter: ioBroker.Adapter, events: IEventsItem[]): Promise<void> {
    // quick exit
    if (!events.length) return;
    if (events.length === 1) return processEvent(adapter, events[0]);

    // ensure events are sorted in ascending order
    const sortedEvents = [...events];
    sortedEvents.sort((a, b) => a.ts.localeCompare(b.ts));
    sortedEvents.forEach((e) => {
        console.log(e.ts);
    });
    // process events - one by one, so order is maintained
    for (const event of sortedEvents) await processEvent(adapter, event);
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
            await adapter.setStateChangedAsync(getStateId(event, "position"), convertSensorStateToId(event.type), true);
            break;
        case "bs_online_notification":
        case "bs_offline_notification":
            await adapter.setStateChangedAsync(event.source_id + ".online", event.type.startsWith("bs_online"), true);
            break;
        case "intrusion":
        case "ack_intrusion":
            await adapter.setStateChangedAsync("info.intrusion", !event.type.startsWith("ack_"), true);
            break;
        case "intrusion_mode_loaded":
        case "isl01.bs01.intrusion_mode_loaded":
        case "isl01.bs01.intrusion_mode_loaded.fail":
        case "isl01.configuration_changed.user.intrusion_mode": {
            await adapter.setStateChangedAsync("info.intrusionMode", event.o?.modeAfter as string, true);
            break;
        }
        case "sirenon":
        case "sirenoff":
            await adapter.setStateChangedAsync(getStateId(event, "alarm"), event.type === "sirenon", true);
            break;
        case "battery_critical":
            await adapter.setStateChangedAsync(getStateId(event, "battery"), "critical", true);
            break;
        case "sensor_online_notification":
        case "endnode_online_notification":
        case "sensor_offline_notification":
        case "endnode_offline_notification": {
            const isOnline = event.type.includes("_online_");
            await Promise.all([
                adapter.setStateChangedAsync(getStateId(event, "online"), isOnline, true),
                adapter.setStateChangedAsync(
                    getStateId(event, "connectionStatus"),
                    isOnline ? "online" : "offline",
                    true,
                ),
            ]);
            break;
        }
        case "drilling_suspected":
        case "drilling_alert":
        case "water_detected":
            await adapter.setStateChangedAsync(getStateId(event, "alarm"), true, true);
            break;
        case "drilling_off":
        case "water_no_longer_detected":
            await adapter.setStateChangedAsync(getStateId(event, "alarm"), false, true);
            break;
        case "test":
            // seen from sd01
            // do nothing, since the end_sd01_test doesn't include sensor id and cannot be reset anymore, without guessing
            break;
        case "end_sd01_test":
            // event doesn't include sensor id :-(
            break;
        case "user_alarm_start":
        case "user_alarm_end":
            await adapter.setStateChangedAsync("info.userAlarm", event.type.endsWith("start"), true);
            break;
        case "gp.call": {
            let stateName = "lastCall";
            switch (event.o?.call_type) {
                case "missed":
                    stateName += "Missed";
                    break;
                case "outgoing":
                    stateName += "Outgoing";
                    break;
                default:
                    stateName += "Incoming";
                    break;
            }
            await adapter.setStateAsync(getStateId(event, stateName), event.o?.clip ?? "<unknown>", true);
            break;
        }
        default:
            adapter.log.info("Unknown event type: " + JSON.stringify(event.type));
            break;
    }
}
