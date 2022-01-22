import { loadBaseStations, loadElements, loadEvents } from "gigaset-elements-api";
import { createOrUpdateBasestations, createOrUpdateElements, processEvents } from ".";
import type { GigasetElements } from "../main";

function respond(adapter: GigasetElements, obj: ioBroker.Message, response: ioBroker.MessagePayload): void {
    if (!obj.callback) return;

    adapter.sendTo(obj.from, obj.command, response, obj.callback);
}

export function respondWithError(adapter: GigasetElements, obj: ioBroker.Message, error: string): void {
    respond(adapter, obj, { error });
}

export function respondOk(adapter: GigasetElements, obj: ioBroker.Message, response: unknown): void {
    respond(adapter, obj, { response });
}

export async function handleMessage(adapter: GigasetElements, obj: ioBroker.Message): Promise<void> {
    switch (obj.command) {
        case "test":
            await handleTestMessages(adapter, obj);
            break;
        default:
            throw new Error("Unsupported command: " + obj.command);
    }
}

async function handleTestMessages(adapter: GigasetElements, obj: ioBroker.Message): Promise<void> {
    switch (obj.message) {
        case "ping":
            respondOk(adapter, obj, "pong");
            break;
        case "process-test-data":
            await processTestData(adapter);
            respondOk(adapter, obj, "sucessfully processed test data");
            break;
        default:
            throw new Error("Unsupported 'test' message: " + obj.message);
    }
}

async function processTestData(adapter: GigasetElements): Promise<void> {
    const [basestations, elements, events] = await Promise.all([
        loadBaseStations(true),
        loadElements(true),
        loadEvents(true),
    ]);

    await createOrUpdateBasestations(adapter, basestations);
    await createOrUpdateElements(adapter, elements.bs01);
    await processEvents(adapter, events.events);
}
