import React from "react";
import { render } from "react-dom";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import theme from "@iobroker/adapter-react-v5/Theme";
import Utils from "@iobroker/adapter-react-v5/Components/Utils";
import App from "./app";

const themeName = Utils.getThemeName();

function build(): void {
    render(
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme(themeName)}>
                <App adapterName="gigaset-elements" />
            </ThemeProvider>
        </StyledEngineProvider>,
        document.getElementById("root") as HTMLElement,
    );
}

build();
