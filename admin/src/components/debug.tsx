import React from "react";
import I18n from "@iobroker/adapter-react-v5/i18n";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import TextField from "@mui/material/TextField";
import endOfDay from "date-fns/esm/endOfDay";
import lightFormat from "date-fns/esm/lightFormat";
import startOfDay from "date-fns/esm/startOfDay";
import ExpandMore from "@mui/icons-material/ExpandMore";

export interface IDebugProps {
    sendMessage: (command: string, message: any) => Promise<any>;
}

export function Debug(props: IDebugProps) {
    const { sendMessage } = props;
    return (
        <>
            <Row
                title="debug_ping_title"
                description="debug_ping_description"
                buttonText="debug_ping_button"
                command="test"
                action={() => "ping"}
                sendMessage={sendMessage}
            />
            <Row
                title="debug_processtestdata_title"
                description="debug_processtestdata_description"
                buttonText="debug_processtestdata_button"
                command="test"
                action={() => "process-test-data"}
                confirm="debug_processtestdata_confirmation"
                sendMessage={sendMessage}
            />
            <Row
                title="debug_preparetestdata_title"
                description="debug_preparetestdata_description"
                action="prepare-test-data"
                buttonText="debug_preparetestdata_button"
                sendMessage={sendMessage}
            />
            <BasesAndElementsRow sendMessage={sendMessage} />
            <EventsRow sendMessage={sendMessage} />
        </>
    );
}

function BasesAndElementsRow({ sendMessage }: IDebugProps) {
    return (
        <Row
            title="debug_apibaseselements_title"
            description="debug_apibaseselements_description"
            sendMessage={sendMessage}
            action="load-bases-elements"
            buttonText="debug_apibaseselements_button"
            contentRowRenderer={(data: { bs: unknown; elements: unknown }) => {
                const Item = ({ title, data }: { title: string; data: unknown }) => (
                    <Grid item xs={6}>
                        <Grid container direction="column">
                            <Grid item>{title}</Grid>
                            <Grid item>
                                <Data data={data} />
                            </Grid>
                        </Grid>
                    </Grid>
                );

                return (
                    <Grid container spacing={2}>
                        <Item title={I18n.t("debug_apibaseselements_bases")} data={data.bs} />
                        <Item title={I18n.t("debug_apibaseselements_elements")} data={data.elements} />
                    </Grid>
                );
            }}
        />
    );
}

function EventsRow({ sendMessage }: IDebugProps) {
    const [from, setFrom] = React.useState<Date | number>(() => startOfDay(Date.now()));
    const [to, setTo] = React.useState<Date | number>(() => Date.now());

    return (
        <Row
            title="debug_apievents_title"
            description="debug_apievents_description"
            action={() => ({ action: "load-events", from, to })}
            buttonText="debug_apievents_button"
            buttonRowGridItems={[
                <TextField
                    variant="standard"
                    key="from"
                    type="date"
                    label={I18n.t("debug_apievents_from")}
                    value={lightFormat(from, "yyyy-MM-dd")}
                    onChange={(e) => {
                        const newDate = (e.target as HTMLInputElement).valueAsDate;
                        if (newDate) setFrom(endOfDay(newDate));
                    }}
                />,
                <TextField
                    variant="standard"
                    key="to"
                    type="date"
                    label={I18n.t("debug_apievents_to")}
                    value={lightFormat(from, "yyyy-MM-dd")}
                    onChange={(e) => {
                        const newDate = (e.target as HTMLInputElement).valueAsDate;
                        if (newDate) setTo(endOfDay(newDate));
                    }}
                />,
            ]}
            sendMessage={sendMessage}
        />
    );
}

interface IRowProps extends IDebugProps {
    title: AdminWord;
    description: AdminWord;
    command?: "debug" | "test";
    action: string | (() => string | Record<string, unknown>);
    buttonText: AdminWord;
    buttonRowGridItems?: JSX.Element[];
    confirm?: AdminWord;
    contentRowRenderer?: (data: any) => JSX.Element;
}

function Row({
    sendMessage,
    title,
    description,
    command = "debug",
    action,
    buttonText,
    buttonRowGridItems,
    confirm: confirmText,
    contentRowRenderer,
}: IRowProps) {
    const [data, setData] = React.useState<unknown>();
    const [loading, setLoading] = React.useState(false);

    return (
        <>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>{I18n.t(title)}</AccordionSummary>
                <AccordionDetails>
                    <Grid container direction="column" spacing={2}>
                        <>
                            {description && <Grid item>{I18n.t(description)}</Grid>}
                            <Grid item>
                                <Grid container spacing={2} alignItems="center">
                                    {buttonRowGridItems &&
                                        buttonRowGridItems.length > 0 &&
                                        buttonRowGridItems.map((item, index) => (
                                            <Grid item key={index}>
                                                {item}
                                            </Grid>
                                        ))}
                                    <Grid item>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={async () => {
                                                if (confirmText && !confirm(I18n.t(confirmText))) return;

                                                setLoading(true);
                                                setData(undefined);

                                                const reply = (await sendMessage(
                                                    command,
                                                    typeof action === "string" ? { action } : action(),
                                                )) as unknown as { response: typeof data; error?: string };

                                                if (reply.error) {
                                                    alert(reply.error);
                                                } else {
                                                    setData(reply.response);
                                                }
                                                setLoading(false);
                                            }}
                                        >
                                            {I18n.t(buttonText)}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                            {data && (
                                <Grid item>{contentRowRenderer ? contentRowRenderer(data) : <Data data={data} />}</Grid>
                            )}
                        </>
                    </Grid>
                </AccordionDetails>
            </Accordion>
            {loading && (
                <Modal open>
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <CircularProgress />
                    </Box>
                </Modal>
            )}
        </>
    );
}

function Data({ data, maxRows = 40 }: { data: unknown; maxRows?: number }) {
    return (
        <TextareaAutosize
            style={{ width: "100%" }}
            minRows={5}
            maxRows={maxRows}
            value={data ? JSON.stringify(data, null, 2) : ""}
        />
    );
}
