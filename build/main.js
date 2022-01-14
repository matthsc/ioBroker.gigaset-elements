"use strict";
/*
 * Created with @iobroker/create-adapter v2.0.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
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
            this.log.debug("Connecting to Gigaset Elements cloud...");
            // check for maintenance
            let maintenanceOrConnectionError = false;
            try {
                maintenanceOrConnectionError = await this.checkAndUpdateMaintenanceMode();
            }
            catch (err) {
                maintenanceOrConnectionError = true;
                this.log.error(this.getErrorMessage(err));
            }
            if (maintenanceOrConnectionError) {
                this.log.info("Retrying connection setup in 5 minutes");
                setTimeout(this.setupConnection, 5 * 60 * 1000);
                return;
            }
            // authorize
            try {
                this.log.debug("Authorizing...");
                await this.api.authorize();
                await this.setStateAsync("info.connection", true, true);
            }
            catch (err) {
                const message = "Error authorizing with Gigaset Elements cloud: " + this.getErrorMessage(err);
                this.log.error(message);
                this.terminate(message);
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
                this.stopTimers(); // stop timers, in case something is still scheduled while reconnecting
                this.stopScheduling = false; // enebale scheduling of timers after stopTimers()
                this.runAndSchedule("elements", this.config.elementInterval * 60, this.refreshElements, true);
                this.runAndSchedule("events", this.config.eventInterval, this.refreshEvents);
                this.log.info("Successfully connected to Gigaset Elements cloud and initialized states");
            }
            catch (err) {
                this.log.error(`Error during connection setup: ${this.getErrorMessage(err)}`);
                this.log.info("Restarting...");
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
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /** helper method for determining human-friendly error messages */
    getErrorMessage(err) {
        if (err instanceof gigaset_elements_api_1.NetworkError) {
            return `Error connecting to Gigaset Elements cloud: ${err.message}`;
        }
        else if (err instanceof gigaset_elements_api_1.EndpointError) {
            return `Error from Gigaset Elements cloud: ${err.statusCode}, ${err.method} ${err.uri} ${err.message}`;
        }
        else if (err.message) {
            return err.message;
        }
        else if (typeof err === "string") {
            return err;
        }
        return err;
    }
    /**
     * @returns true if GE cloud is under maintenance
     */
    async checkAndUpdateMaintenanceMode() {
        const isMaintenance = await this.api.isMaintenance();
        if (isMaintenance) {
            this.log.info("Gigaset Elements cloud is under maintenance");
        }
        await this.setStateChangedAsync("info.maintenance", isMaintenance, true);
        return isMaintenance;
    }
    /** error handling for errors during periodic refresh timers */
    async handleRefreshError(source, err) {
        let message;
        if (err instanceof gigaset_elements_api_1.NetworkError) {
            message = `Network error`;
        }
        else if (err instanceof gigaset_elements_api_1.EndpointError) {
            message = `Endpoint error ${err.statusCode}, ${err.method} ${err.uri}`;
            if (err.statusCode === 401)
                // reconnect if we get an authorization error
                this.log.info("Encountered 401 Unauthorized error, stopping timers and reconnecting again");
            this.stopTimers();
            this.setupConnection();
            return;
        }
        else {
            message = "Unknown error";
        }
        this.log.error(`${source} - ${message}: ${err.message} ${err.stack}`);
        // check for maintenance mode
        let maintenanceOrConnectionError = false;
        try {
            maintenanceOrConnectionError = await this.checkAndUpdateMaintenanceMode();
        }
        catch (err) {
            maintenanceOrConnectionError = true;
            this.log.error(this.getErrorMessage(err));
        }
        if (maintenanceOrConnectionError) {
            this.log.info("Stopping timers and retrying connection in 5 minutes");
            this.stopTimers();
            setTimeout(this.setupConnection, 5 * 60 * 1000);
        }
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
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new GigasetElements(options);
}
else {
    // otherwise start the instance directly
    (() => new GigasetElements())();
}
//# sourceMappingURL=main.js.map