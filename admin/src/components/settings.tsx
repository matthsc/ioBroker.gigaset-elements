import React from "react";
import withStyles from "@mui/styles/withStyles";
import type { CreateCSSProperties } from "@mui/styles/withStyles";
import I18n from "@iobroker/adapter-react-v5/i18n";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Input from "@mui/material/Input";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";

const styles = (): Record<string, CreateCSSProperties> => ({
    input: {
        marginTop: 0,
        minWidth: 400,
    },
    button: {
        marginRight: 20,
    },
    card: {
        maxWidth: 345,
        textAlign: "center",
    },
    media: {
        height: 180,
    },
    column: {
        display: "inline-block",
        verticalAlign: "top",
        marginRight: 20,
    },
    columnLogo: {
        width: 350,
        marginRight: 0,
    },
    columnSettings: {
        width: "calc(100% - 370px)",
    },
    controlElement: {
        //background: "#d2d2d2",
        marginBottom: 5,
    },
});

interface SettingsProps {
    classes: Record<string, string>;
    native: Record<string, any>;

    onChange: (attr: string, value: any) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SettingsState {}

class Settings extends React.Component<SettingsProps, SettingsState> {
    constructor(props: SettingsProps) {
        super(props);
        this.state = {};
    }

    renderInput(title: AdminWord, attr: string, helperText?: AdminWord, type?: string) {
        return (
            <Grid item xs>
                <TextField
                    variant="standard"
                    label={I18n.t(title)}
                    className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
                    value={this.props.native[attr]}
                    type={type || "text"}
                    onChange={(e) => this.props.onChange(attr, e.target.value)}
                    margin="normal"
                    helperText={helperText ? I18n.t(helperText) : undefined}
                />
            </Grid>
        );
    }

    renderSelect(
        title: AdminWord,
        attr: string,
        options: { value: string; title: AdminWord }[],
        style?: React.CSSProperties,
    ) {
        return (
            <Grid item xs>
                <FormControl
                    variant="standard"
                    className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
                    style={{
                        paddingTop: 5,
                        ...style,
                    }}
                >
                    <Select
                        variant="standard"
                        value={this.props.native[attr] || "_"}
                        onChange={(e) => this.props.onChange(attr, e.target.value === "_" ? "" : e.target.value)}
                        input={<Input name={attr} id={attr + "-helper"} />}
                    >
                        {options.map((item) => (
                            <MenuItem key={"key-" + item.value} value={item.value || "_"}>
                                {I18n.t(item.title)}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>{I18n.t(title)}</FormHelperText>
                </FormControl>
            </Grid>
        );
    }

    renderCheckbox(title: AdminWord, attr: string, style?: React.CSSProperties) {
        return (
            <Grid item>
                <FormControlLabel
                    key={attr}
                    style={{
                        paddingTop: 5,
                        ...style,
                    }}
                    className={this.props.classes.controlElement}
                    control={
                        <Checkbox
                            checked={this.props.native[attr]}
                            onChange={() => this.props.onChange(attr, !this.props.native[attr])}
                            color="primary"
                        />
                    }
                    label={I18n.t(title)}
                />
            </Grid>
        );
    }

    renderHeader(title: AdminWord, description?: AdminWord) {
        return (
            <Grid item xs={12}>
                <h1>{I18n.t(title)}</h1>
                {description && I18n.t(description)}
            </Grid>
        );
    }

    render() {
        return (
            <form className={this.props.classes.tab}>
                <Box p={2}>
                    <Grid container spacing={2}>
                        {this.renderHeader("connection")}
                        {this.renderInput("email", "email", "email_description")}
                        {this.renderInput("password", "pass", "password_description", "password")}
                        {this.renderInput("authInterval", "authInterval", "authInterval_description", "number")}
                        {this.renderHeader("intervals", "intervals_details")}
                        {this.renderInput("eventInterval", "eventInterval", "eventInterval_description", "number")}
                        {this.renderInput(
                            "elementInterval",
                            "elementInterval",
                            "elementInterval_description",
                            "number",
                        )}
                    </Grid>
                </Box>
            </form>
        );
    }
}

export default withStyles(styles)(Settings);
