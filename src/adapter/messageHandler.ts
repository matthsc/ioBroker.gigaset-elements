import { loadBaseStations, loadElements, loadEvents, retrieveAndPrepareTestData } from "gigaset-elements-api";
import { createOrUpdateBasestations, createOrUpdateElements, processEvents } from ".";
import type { GigasetElements } from "../main";

/** helper method for responding to messages */
function respond(adapter: GigasetElements, obj: ioBroker.Message, response: ioBroker.MessagePayload): void {
    if (!obj.callback) return;

    adapter.sendTo(obj.from, obj.command, response, obj.callback);
}

/** helper method to respond with an error */
export function respondWithError(adapter: GigasetElements, obj: ioBroker.Message, error: string): void {
    respond(adapter, obj, { error });
}

/** helper method to respond with a result */
export function respondOk(adapter: GigasetElements, obj: ioBroker.Message, response: unknown): void {
    respond(adapter, obj, { response });
}

/** message handler main method */
export async function handleMessage(adapter: GigasetElements, obj: ioBroker.Message): Promise<void> {
    let response: unknown;
    switch (obj.command) {
        case "test":
            response = await handleTestMessages(adapter, obj);
            break;
        case "debug":
            response = await handleDebugMessages(adapter, obj);
            break;
        default:
            throw new Error("Unsupported command: " + obj.command);
    }
    respondOk(adapter, obj, response);
}

/** method for handling test messages */
async function handleTestMessages(adapter: GigasetElements, obj: ioBroker.Message): Promise<string> {
    switch (obj.message) {
        case "ping":
            return "pong";
        case "process-test-data":
            await processTestData(adapter);
            return "sucessfully processed test data";
        default:
            throw new Error("Unsupported 'test' message: " + obj.message);
    }
}

/** process test data */
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

/** method for handling debug messages */
async function handleDebugMessages(adapter: GigasetElements, obj: ioBroker.Message): Promise<unknown> {
    const message = obj.message as {
        action: string;
        from: string; // Date is serialized when send as a message
        to?: string; // Date is serialized when send as a message
        limit?: number;
    };
    switch (message?.action) {
        case "prepare-test-data": {
            const [bs, elements, events] = await retrieveAndPrepareTestData(adapter.api, new Date(message.from));
            return { bs, elements, events };
        }
        case "load-bases-elements": {
            const bs = await adapter.api.getBaseStations();
            const elements = await adapter.api.getElements();
            return { bs, elements };
        }
        case "load-events": {
            const events = await adapter.api.getAllEvents(
                new Date(message.from),
                message.to ? new Date(message.to) : undefined,
            );
            return { events };
        }
        default:
            throw new Error("Unsupported 'debug' action: " + message?.action);
    }
}
