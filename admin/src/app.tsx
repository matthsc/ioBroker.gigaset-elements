import React from "react";
import withStyles from "@material-ui/core/styles/withStyles";
import type { Theme } from "@material-ui/core/styles";

import GenericApp from "@iobroker/adapter-react/GenericApp";
import Settings from "./components/settings";
import { GenericAppProps, GenericAppSettings } from "@iobroker/adapter-react/types";
import type { StyleRules } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import { Debug } from "./components/debug";
import SettingsIcon from "@material-ui/icons/Settings";
import DeveloperMode from "@material-ui/icons/DeveloperMode";
import I18n from "@iobroker/adapter-react/i18n";

const styles = (_theme: Theme): StyleRules => ({
    root: {},
});

class App extends GenericApp {
    constructor(props: GenericAppProps) {
        const extendedProps: GenericAppSettings = {
            ...props,
            // encryptedFields: ["pass"], <-- don't add encryptedFields here that are already specified in io-package.json as encryptedNative
            translations: {
                en: require("./i18n/en.json"),
                de: require("./i18n/de.json"),
                ru: require("./i18n/ru.json"),
                pt: require("./i18n/pt.json"),
                nl: require("./i18n/nl.json"),
                fr: require("./i18n/fr.json"),
                it: require("./i18n/it.json"),
                es: require("./i18n/es.json"),
                pl: require("./i18n/pl.json"),
                "zh-cn": require("./i18n/zh-cn.json"),
            },
        };
        super(props, extendedProps);
    }

    onConnectionReady(): void {
        // executed when connection is ready
    }

    render() {
        if (!this.state.loaded) {
            return super.render();
        }

        return (
            <div className="App">
                <AppContainer
                    expertMode={this.getExpertMode()}
                    native={this.state.native}
                    updateNativeValue={this.updateNativeValue.bind(this)}
                    sendMessage={(command, message) => {
                        const to = `${this.adapterName}.${this.instance}`;
                        return this.socket.sendTo(to, command, message);
                    }}
                />
                {this.renderError()}
                {this.renderToast()}
                {this.renderSaveCloseButtons()}
            </div>
        );
    }
}

export default withStyles(styles)(App);

function AppContainer({
    expertMode,
    native,
    updateNativeValue,
    sendMessage,
}: {
    expertMode: boolean;
    native: ioBroker.AdapterConfig;
    updateNativeValue: (attr: string, value: unknown) => void;
    sendMessage: (command: string, message?: ioBroker.MessagePayload) => Promise<ioBroker.Message | undefined>;
}) {
    const [selectedTab, setSelectedTab] = React.useState<number>(() => {
        return 0;
    });

    let tab = 0;
    return (
        <Box mt={1}>
            <AppBar position="static">
                <Tabs
                    value={selectedTab}
                    onChange={(e, newTab: number) => {
                        setSelectedTab(newTab);
                    }}
                >
                    <Tab icon={<SettingsIcon />} label={I18n.t("tab_settings")} />
                    {expertMode && <Tab icon={<DeveloperMode />} label={I18n.t("tab_debug")} />}
                </Tabs>
            </AppBar>
            {selectedTab === tab++ && (
                <Settings
                    native={native}
                    onChange={(attr, value) => {
                        updateNativeValue(attr, value);
                    }}
                />
            )}
            {selectedTab === tab++ && <Debug sendMessage={sendMessage} />}
        </Box>
    );
}
