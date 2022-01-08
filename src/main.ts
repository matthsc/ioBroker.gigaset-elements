/*
 * Created with @iobroker/create-adapter v2.0.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
// Load your modules here
import { EndpointError, GigasetElementsApi, NetworkError } from "gigaset-elements-api";
import { createOrUpdateBasestations, createOrUpdateElements, processEvents, updateElements } from "./adapter";

class GigasetElements extends utils.Adapter {
    /** api instance */
    private api!: GigasetElementsApi;
    /** time of last events retrieval */
    private lastEvent!: number;
    /** timeout for periodic events retrieval */
    private eventsTimeout!: NodeJS.Timeout;
    /** timeout for periodic elements retrieval */
    private elementsTimeout!: NodeJS.Timeout;
    /** whether the adapter is terminating */
    private terminating = false;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "gigaset-elements",
        });
        this.on("ready", this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
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

        // Reset the connection indicator during startup
        await this.setStateAsync("info.connection", false, true);

        // check options (email/password)
        if (!this.config.email || !this.config.pass) {
            this.log.error("Login information missing. Please configure email and password in adapter settings.");
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

        // connect to GE api
        await this.setupConnection();
    };

    private getErrorMessage(err: unknown): string {
        if (err instanceof NetworkError) {
            return `Error connecting to Gigaset-Elements API: ${err.message}`;
        } else if (err instanceof EndpointError) {
            return `Error from Gigaset-Elements API: ${err.statusCode}, ${err.method} ${err.uri} ${err.message}`;
        } else if ((err as Error).message) {
            return (err as Error).message;
        } else if (typeof err === "string") {
            return err;
        }

        return err as string;
    }

    /** setup connection to GE api */
    private setupConnection = async (): Promise<void> => {
        this.log.info("Connecting to Gigaset Elements API...");

        // check for maintenance
        let hasApiConnectionError = false;
        try {
            hasApiConnectionError = await this.api.isMaintenance();
            if (hasApiConnectionError) {
                this.log.info("API is under maintenance");
            }
        } catch (err: unknown) {
            hasApiConnectionError = true;
            this.log.error(this.getErrorMessage(err));
        }
        if (hasApiConnectionError) {
            this.log.info("Retrying connection in 5 minutes");
            setTimeout(this.setupConnection, 5 * 60 * 1000);
            return;
        }

        // authorize
        try {
            this.log.info("Authorizing...");
            await this.api.authorize();
            await this.setStateAsync("info.connection", true, true);
        } catch (err) {
            const message = this.getErrorMessage(err);
            this.log.error(message);
            this.terminate(message);
            return;
        }

        // initialize last event date
        this.lastEvent = Date.now();

        try {
            // load base stations
            this.log.info("Loading basestation data...");
            const baseStations = await this.api.getBaseStations();
            await createOrUpdateBasestations(this, baseStations);

            // load elements
            this.log.info("Loading elements data...");
            const { bs01 } = await this.api.getElements();
            await createOrUpdateElements(this, bs01);

            // set up timers for periodic events and elements retrieval
            this.log.info("Starting timers for periodic events/elements retrieval...");
            this.stopTimers(); // stop timers, in case they are still scheduled while reconnecting
            this.setupEventsRefresh();
            this.setupElementsRefresh();

            this.log.info("All done, adapter is running");
        } catch (err) {
            this.log.error(`setupConnection: ${this.getErrorMessage(err)}`);
            this.log.info("restarting adapter");
            this.restart();
        }
    };

    /** set up periodic elements retrieval timer */
    private setupElementsRefresh(): void {
        if (this.config.elementInterval <= 0 || this.terminating) return;

        this.elementsTimeout = setTimeout(this.refreshElements, this.config.elementInterval * 60 * 1000);
    }

    /** retrieve and update elements */
    private refreshElements = async (): Promise<void> => {
        this.log.debug("Processing elements");
        try {
            const elements = await this.api.getElements();
            await Promise.all(elements.bs01.map((bs) => updateElements(this, bs.subelements)));
        } catch (err: any) {
            this.handleRefreshError("refreshEvents", err);
        }

        // schedule next retrieval
        this.setupElementsRefresh();
    };

    /** set up periodic events retrieval timer */
    private setupEventsRefresh(): void {
        if (this.config.eventInterval <= 0 || this.terminating) return;

        this.eventsTimeout = setTimeout(this.refreshEvents, this.config.eventInterval * 1000);
    }

    /** retrieve and process events */
    private refreshEvents = async (): Promise<void> => {
        this.log.debug("Processing events");
        try {
            const start = Date.now();
            const { events } = await this.api.getRecentEvents(this.lastEvent);
            await processEvents(this, events);
            this.lastEvent = start;
        } catch (err: any) {
            this.handleRefreshError("refreshEvents", err);
        }

        // schedule next retrieval
        this.setupEventsRefresh();
    };

    /** error handling for errors during periodic refresh timers */
    private async handleRefreshError(source: string, err: Error): Promise<void> {
        let message: string;
        if (err instanceof NetworkError) {
            message = `Network error`;
        } else if (err instanceof EndpointError) {
            message = `Endpoint error ${err.statusCode}, ${err.method} ${err.uri}`;

            if (err.statusCode === 401)
                // reconnect if we get an authorization error
                // use setImmediate here since the refreshXXX methods schedule the next timer after this method exits
                setImmediate(() => {
                    this.log.info("Encountered 401 Unauthorized error, stopping timers and reconnecting again");
                    this.stopTimers();
                    this.setupConnection();
                });
        } else {
            message = "Unknown error";
        }
        this.log.error(`${source} - ${message}: ${err.message} ${err.stack}`);

        // check for maintenance mode
        let hasApiConnectionError = false;
        try {
            hasApiConnectionError = await this.api.isMaintenance();
            if (hasApiConnectionError) {
                this.log.info("API is under maintenance");
            }
        } catch {
            hasApiConnectionError = true;
        }
        if (hasApiConnectionError) {
            this.log.info("Stopping timers and retrying connection in 5 minutes");
            // use setImmediate here since the refreshXXX methods schedule the next timer after this method exits
            setImmediate(() => {
                this.stopTimers();
                setTimeout(this.setupConnection, 5 * 60 * 1000);
            });
        }
    }

    /** stops timers */

    private stopTimers(): void {
        clearTimeout(this.eventsTimeout);
        clearTimeout(this.elementsTimeout);
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

    // /**
    //  * Is called if a subscribed state changes
    //  */
    // private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
    //     if (state) {
    //         // The state was changed
    //         this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    //     } else {
    //         // The state was deleted
    //         this.log.info(`state ${id} deleted`);
    //     }
    // }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  */
    // private onMessage(obj: ioBroker.Message): void {
    //     if (typeof obj === "object" && obj.message) {
    //         if (obj.command === "send") {
    //             // e.g. send email or pushover or whatever
    //             this.log.info("send command");

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    //         }
    //     }
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GigasetElements(options);
} else {
    // otherwise start the instance directly
    (() => new GigasetElements())();
}
