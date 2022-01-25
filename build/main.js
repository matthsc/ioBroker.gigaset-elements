"use strict";
/*
 * Created with @iobroker/create-adapter v2.0.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigasetElements = void 0;
const tslib_1 = require("tslib");
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = (0, tslib_1.__importStar)(require("@iobroker/adapter-core"));
// Load your modules here
const gigaset_elements_api_1 = require("gigaset-elements-api");
const adapter_1 = require("./adapter");
class GigasetElements extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "gigaset-elements",
        });
        /** timeouts */
        this.timeouts = Object.create(null);
        /** whether the adapter is terminating */
        this.terminating = false;
        /** whether we should stop scheduling new jobs, i.e. when cloud is under maintenance */
        this.stopScheduling = true;
        /**
         * Is called when databases are connected and adapter received configuration.
         */
        this.onReady = async () => {
            this.log.debug(`configuration: ${JSON.stringify({
                ...this.config,
                pass: this.config.pass && this.config.pass !== "" ? "***" : "<empty>",
            })}`);
            // Reset connection indicators during startup
            await Promise.all([
                this.setStateAsync("info.connection", false, true),
                this.setStateChangedAsync("info.maintenance", false, true),
            ]);
            // check options (email/password)
            if (!this.config.email || !this.config.pass) {
                this.log.error("Login information for Gigaset Elements cloud missing. Please configure email and password in adapter settings.");
                return;
            }
            // init gigaset elements api
            this.api = new gigaset_elements_api_1.GigasetElementsApi({
                email: this.config.email,
                password: this.config.pass,
                authorizeHours: this.config.authInterval,
                requestLogger: this.log.level === "silly"
                    ? (message) => {
                        this.log.silly(message);
                    }
                    : undefined,
            });
            // connect to GE cloud
            await this.setupConnection();
        };
        /** setup connection to GE api */
        this.setupConnection = async () => {
            if (this.terminating)
                return;
            this.stopTimers(); // stop timers, in case something is still scheduled while reconnecting
            this.log.debug("Connecting to Gigaset Elements cloud...");
            // check for maintenance
            if (!(await this.checkAndUpdateMaintenanceMode()))
                return;
            // authorize
            try {
                this.log.debug("Authorizing...");
                await this.api.authorize();
                await this.setStateAsync("info.connection", true, true);
            }
            catch (err) {
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
                await (0, adapter_1.createOrUpdateBasestations)(this, baseStations);
                // load elements
                this.log.debug("Loading elements data...");
                const { bs01 } = await this.api.getElements();
                await (0, adapter_1.createOrUpdateElements)(this, bs01);
                // set up timers for periodic events and elements retrieval
                this.log.debug("Starting timers for periodic events/elements retrieval...");
                this.stopScheduling = false; // enebale scheduling of timers
                this.runAndSchedule("elements", this.config.elementInterval * 60, this.refreshElements, true);
                this.runAndSchedule("events", this.config.eventInterval, this.refreshEvents);
                this.log.info("Successfully connected to Gigaset Elements cloud and initialized states");
            }
            catch (err) {
                this.logErrorMessage(err, "Error during connection setup");
                this.log.info("Restarting due to previous error...");
                this.restart();
            }
        };
        /** retrieve and update elements */
        this.refreshElements = async () => {
            this.log.debug("Updating elements");
            const elements = await this.api.getElements();
            await Promise.all(elements.bs01.map((bs) => (0, adapter_1.updateElements)(this, bs.subelements)));
        };
        /** retrieve and process events */
        this.refreshEvents = async () => {
            this.log.debug("Updating events");
            const start = Date.now();
            const { events } = await this.api.getRecentEvents(this.lastEvent);
            await (0, adapter_1.processEvents)(this, events);
            this.lastEvent = start;
        };
        /** helper method for scheduling periodic timer jobs */
        this.runAndSchedule = async (key, timeout, handler, scheduleOnly) => {
            if (timeout <= 0)
                return;
            if (!scheduleOnly)
                try {
                    await handler();
                }
                catch (err) {
                    await this.handleRefreshError(key, err);
                }
            if (!this.stopScheduling && !this.terminating) {
                clearTimeout(this.timeouts[key]);
                const timer = setTimeout(this.runAndSchedule, timeout * 1000, key, timeout, handler, false);
                this.timeouts[key] = timer;
            }
        };
        this.on("ready", this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /** helper method for determining human-friendly error messages */
    logErrorMessage(err, prefix) {
        let message;
        if (err instanceof gigaset_elements_api_1.NetworkError) {
            message = `Error connecting to Gigaset Elements cloud: ${err.message}`;
        }
        else if (err instanceof gigaset_elements_api_1.EndpointError) {
            message = `Error from Gigaset Elements cloud: ${err.statusCode}, ${err.method} ${err.uri} ${err.message}`;
        }
        else if (err.message) {
            message = err.message;
        }
        else if (typeof err === "string") {
            message = err;
        }
        else {
            message = JSON.stringify(err);
        }
        if (prefix)
            message = `${prefix}: ${message}`;
        this.log.error(message);
    }
    /**
     * @returns false if GE cloud is under maintenance, or maintenance check failed
     */
    async checkAndUpdateMaintenanceMode() {
        try {
            const isMaintenance = await this.api.isMaintenance();
            if (isMaintenance) {
                this.log.info("Gigaset Elements cloud is under maintenance");
            }
            await this.setStateChangedAsync("info.maintenance", isMaintenance, true);
            return !isMaintenance;
        }
        catch (err) {
            this.logErrorMessage(err, "Unable to determine Gigaset Elements cloud maintenance status");
            const minutes = 1;
            this.log.info(`Stopping all timers and trying to reconnect in ${minutes} minutes`);
            this.stopTimers();
            const timer = setTimeout(this.setupConnection, minutes * 60 * 1000);
            this.timeouts.setupConnection = timer;
            return false;
        }
    }
    /** error handling for errors during periodic refresh timers */
    async handleRefreshError(source, err) {
        let message;
        if (err instanceof gigaset_elements_api_1.NetworkError) {
            message = `Network error`;
        }
        else if (err instanceof gigaset_elements_api_1.EndpointError) {
            message = `Endpoint error ${err.statusCode}, ${err.method} ${err.uri}`;
            if (err.statusCode === 401) {
                // reconnect if we get an authorization error
                this.log.info("Encountered 401 Unauthorized error, stopping timers and reconnecting again");
                this.stopTimers();
                this.setupConnection(); // runs async
                return;
            }
        }
        else {
            message = "Unknown error";
        }
        this.log.error(`${source} - ${message}: ${err.message} ${err.stack}`);
        // check for maintenance mode
        await this.checkAndUpdateMaintenanceMode();
    }
    /** stops timers */
    stopTimers() {
        this.stopScheduling = true;
        const keys = Object.keys(this.timeouts);
        keys.forEach((key) => {
            clearTimeout(this.timeouts[key]);
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.terminating = true;
            this.stopTimers();
            this.log.info("cleaned everything up...");
            callback();
        }
        catch (e) {
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
    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     */
    async onMessage(obj) {
        this.log.debug("message recieved: " + JSON.stringify(obj));
        if (typeof obj === "object") {
            try {
                await (0, adapter_1.handleMessage)(this, obj);
            }
            catch (e) {
                const message = "Error processing message: " + (e instanceof Error ? e.message : e);
                this.log.error(message);
                (0, adapter_1.respondWithError)(this, obj, message);
            }
        }
    }
}
exports.GigasetElements = GigasetElements;
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new GigasetElements(options);
}
else {
    // otherwise start the instance directly
    (() => new GigasetElements())();
}
//# sourceMappingURL=main.js.map