/*
 * Created with @iobroker/create-adapter v2.0.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
// Load your modules here
import { EndpointError, GigasetElementsApi, NetworkError } from "gigaset-elements-api";
import {
    createOrUpdateBasestations,
    createOrUpdateElements,
    handleMessage,
    processEvents,
    respondWithError,
    updateElements,
} from "./adapter";

interface ITimeoutsKeys {
    systemHealth: ioBroker.Timeout;
    events: ioBroker.Timeout;
    elements: ioBroker.Timeout;
    setupConnection: ioBroker.Timeout;
}
type ITimeouts = {
    [key in keyof ITimeoutsKeys]: ioBroker.Timeout;
} & ITimeoutsKeys;

export class GigasetElements extends utils.Adapter {
    /** api instance */
    public api!: GigasetElementsApi;
    /** time of last events retrieval */
    private lastEvent!: number;
    /** timeouts */
    private timeouts = Object.create(null) as ITimeouts;
    /** whether the adapter is terminating */
    private terminating = false;
    /** whether we should stop scheduling new jobs, i.e. when cloud is under maintenance */
    private stopScheduling = true;
    /** id of the first base station */
    private baseStationId?: string;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "gigaset-elements",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private onReady = async (): Promise<void> => {
        this.log.debug(
            `configuration: ${JSON.stringify({
                ...this.config,
                pass: this.config.pass && this.config.pass !== "" ? "***" : "<empty>",
            })}`,
        );

        // Reset connection indicators during startup
        await Promise.all([
            this.setStateAsync("info.connection", false, true),
            this.setStateChangedAsync("info.maintenance", false, true),
        ]);

        // check options (email/password)
        if (!this.config.email || !this.config.pass) {
            this.log.error(
                "Login information for Gigaset Elements cloud missing. Please configure email and password in adapter settings.",
            );
            return;
        }

        // init gigaset elements api
        this.api = new GigasetElementsApi({
            email: this.config.email,
            password: this.config.pass,
            authorizeHours: this.config.authInterval,
            requestLogger:
                this.log.level === "silly"
                    ? (message: string) => {
                          this.log.silly(message);
                      }
                    : undefined,
        });

        // connect to GE cloud
        await this.setupConnection();
        for (const state of ["*.relay", "*.relayButton", "info.userAlarm", "info.intrusionMode"])
            await this.subscribeStatesAsync(state);
    };

    /** helper method for determining human-friendly error messages */
    private logErrorMessage(err: unknown, prefix?: string): void {
        let message: string;
        if (err instanceof NetworkError) {
            message = `Error connecting to Gigaset Elements cloud: ${err.message}`;
        } else if (err instanceof EndpointError) {
            message = `Error from Gigaset Elements cloud: ${err.statusCode}, ${err.method} ${err.uri} ${err.message}`;
        } else if ((err as Error).message) {
            message = (err as Error).message;
        } else if (typeof err === "string") {
            message = err;
        } else {
            message = JSON.stringify(err);
        }

        if (prefix) message = `${prefix}: ${message}`;
        this.log.error(message);
    }

    /**
     * @returns false if GE cloud is under maintenance, or maintenance check failed
     */
    private async checkAndUpdateMaintenanceMode(): Promise<boolean> {
        try {
            const isMaintenance = await this.api.isMaintenance();
            if (isMaintenance) {
                this.log.info("Gigaset Elements cloud is under maintenance");
            }
            await this.setStateChangedAsync("info.maintenance", isMaintenance, true);
            return !isMaintenance;
        } catch (err: unknown) {
            this.logErrorMessage(err, "Unable to determine Gigaset Elements cloud maintenance status");
            const minutes = 1;
            this.log.info(`Stopping all timers and trying to reconnect in ${minutes} minutes`);
            this.stopTimers();
            const timer = this.setTimeout(this.setupConnection, minutes * 60 * 1000);
            this.timeouts.setupConnection = timer;
            return false;
        }
    }

    /** setup connection to GE api */
    private setupConnection = async (): Promise<void> => {
        if (this.terminating) return;

        this.stopTimers(); // stop timers, in case something is still scheduled while reconnecting
        this.log.debug("Connecting to Gigaset Elements cloud...");

        // check for maintenance
        if (!(await this.checkAndUpdateMaintenanceMode())) return;

        // authorize
        try {
            this.log.debug("Authorizing...");
            await this.api.authorize();
            await this.setStateAsync("info.connection", true, true);
        } catch (err) {
            this.logErrorMessage(err, "Error authorizing with Gigaset Elements cloud");
            this.terminate();
            return;
        }

        // initialize last event date
        this.lastEvent = Date.now();

        try {
            // load base stations
            this.log.debug("Loading basestation data...");
            const baseStations = await this.api.getBaseStations();
            this.baseStationId = baseStations.length ? baseStations[0].id : undefined;
            await createOrUpdateBasestations(this, baseStations);

            // load elements
            this.log.debug("Loading elements data...");
            const elements = await this.api.getElements();
            await createOrUpdateElements(this, elements);

            // set up timers for periodic events and elements retrieval
            this.log.debug("Starting timers for periodic events/elements retrieval...");
            this.stopScheduling = false; // enebale scheduling of timers
            this.runAndSchedule("systemHealth", this.config.systemHealthInterval * 60, this.refreshSystemHealth, false);
            this.runAndSchedule("elements", this.config.elementInterval * 60, this.refreshElements, true);
            this.runAndScheduleEvents();

            this.log.info("Successfully connected to Gigaset Elements cloud and initialized states");
        } catch (err: unknown) {
            this.logErrorMessage(err, "Error during connection setup");
            this.log.info("Restarting due to previous error...");
            this.restart();
        }
    };

    private runAndScheduleEvents = async (delay?: boolean): Promise<void> => {
        if (delay) await this.delay(5000); // if we refresh too fast after changes, the event is not yet available

        await this.runAndSchedule("events", this.config.eventInterval, this.refreshEvents);
    };

    /** refresh system health status */
    private refreshSystemHealth = async (): Promise<void> => {
        this.log.debug("Updating system health");
        const systemHealth = await this.api.getSystemHealth();
        await this.setStateChangedAsync("info.systemHealth", systemHealth.systemHealth, true);
    };

    /** retrieve and update elements */
    private refreshElements = async (): Promise<void> => {
        this.log.debug("Updating elements");
        const elements = await this.api.getElements();
        await updateElements(this, elements);
    };

    /** retrieve and process events */
    private refreshEvents = async (): Promise<void> => {
        this.log.debug("Updating events");
        const start = Date.now();
        const { events } = await this.api.getRecentEvents(this.lastEvent);
        await processEvents(this, events);
        this.lastEvent = start;
    };

    /** error handling for errors during periodic refresh timers */
    private async handleRefreshError(source: string, err: Error): Promise<void> {
        let message: string;
        if (err instanceof NetworkError) {
            message = `Network error`;
        } else if (err instanceof EndpointError) {
            message = `Endpoint error ${err.statusCode}, ${err.method} ${err.uri}`;

            if (err.statusCode === 401) {
                // reconnect if we get an authorization error
                this.log.info("Encountered 401 Unauthorized error, stopping timers and reconnecting again");
                this.stopTimers();
                this.setupConnection(); // runs async
                return;
            }
        } else {
            message = "Unknown error";
        }
        this.log.error(`refresh ${source} - ${message}: ${err.message}`);

        // check for maintenance mode
        await this.checkAndUpdateMaintenanceMode();
    }

    /** helper method for scheduling periodic timer jobs */
    private runAndSchedule = async (
        key: keyof ITimeouts,
        timeout: number,
        handler: () => Promise<any>,
        scheduleOnly?: boolean,
    ): Promise<void> => {
        if (timeout <= 0) return;

        this.clearTimeout(this.timeouts[key]);

        if (!scheduleOnly)
            try {
                await handler();
            } catch (err: unknown) {
                await this.handleRefreshError(key, err as Error);
            }

        if (!this.stopScheduling && !this.terminating) {
            this.clearTimeout(this.timeouts[key]);
            this.timeouts[key] = this.setTimeout(this.runAndSchedule, timeout * 1000, key, timeout, handler, false);
        }
    };

    /** stops timers */
    private stopTimers(): void {
        this.stopScheduling = true;
        const keys = Object.keys(this.timeouts) as (keyof ITimeoutsKeys)[];
        keys.forEach((key) => {
            this.clearTimeout(this.timeouts[key]);
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            this.terminating = true;
            this.stopTimers();
            this.log.info("cleaned everything up...");
            callback();
        } catch (e: any) {
            this.log.error(e.stack);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state) {
            // The state was deleted
            return;
        }
        if (state.ack) {
            // ignore acknowledged states
            return;
        }

        this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

        try {
            const idParts = id.split(".");
            if (idParts.length == 4 && idParts[2] === "info") {
                switch (idParts[3]) {
                    case "userAlarm":
                        await this.api.setUserAlarm(state.val as boolean);
                        await this.runAndScheduleEvents(true);
                        break;
                    case "intrusionMode":
                        await this.api.setAlarmMode(this.baseStationId as string, state.val as any);
                        await this.runAndScheduleEvents(true);
                        break;
                    default:
                        this.log.error("Invalid info state changed: " + id);
                }
            } else {
                const baseStationId = idParts[2];
                const elementId = idParts[3].split("-")[1];
                const stateName = idParts[4];

                switch (stateName) {
                    case "relay":
                        await this.api.sendCommand(baseStationId, elementId, state.val ? "on" : "off");
                        await this.runAndScheduleEvents(true);
                        break;
                    case "relayButton":
                        const idRelay = [...idParts];
                        idRelay[4] = "relay";
                        const current = await this.getStateAsync(idRelay.join("."));
                        await this.api.sendCommand(baseStationId, elementId, !current!.val ? "on" : "off");
                        await this.runAndScheduleEvents(true);
                        break;
                    default:
                        this.log.error("Invalid element state changed: " + id);
                }
            }
        } catch (err: any) {
            this.log.error(`Error processing state change for ${id} (val=${state.val}): ${err.message}`);
            this.log.debug(err.toString());
        }
    }

    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     */
    private async onMessage(obj: ioBroker.Message): Promise<void> {
        this.log.debug("message recieved: " + JSON.stringify(obj));

        if (typeof obj === "object") {
            try {
                await handleMessage(this, obj);
            } catch (e: any) {
                const message = "Error processing message: " + (e instanceof Error ? e.message : (e as string));
                this.log.error(message);
                respondWithError(this, obj, message);
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GigasetElements(options);
} else {
    // otherwise start the instance directly
    (() => new GigasetElements())();
}
