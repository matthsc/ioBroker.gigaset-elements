// tslint:disable:no-unused-expression

import { assert } from "chai";
import {
    IEventsItem,
    IGp02Item,
    ISubelementsItem,
    loadBaseStations,
    loadElements,
    loadEvents,
} from "gigaset-elements-api";
import {
    getChannelId,
    getReadonlyStateObject,
    getStateId,
    isDefined,
    isEventsItem,
    isGp02Item,
    isSubelementsItem,
} from "./util";

describe("isDefined", () => {
    it("returns false if the object is null or undefined", () => {
        assert.isFalse(isDefined(undefined, "test" as never));
        assert.isFalse(isDefined(null, "test" as never));
    });
    it("returns false if the object doesn't own the given property, or it is null or undefined", () => {
        assert.isFalse(isDefined({}, "test" as never));
        assert.isFalse(isDefined({ abc: 1 }, "test" as never));
        assert.isFalse(isDefined({ test: undefined }, "test"));
        assert.isFalse(isDefined({ test: null }, "test"));
    });
    it("returns true if an object owns the given property", () => {
        assert.isTrue(isDefined({ test: 0 }, "test"));
        assert.isTrue(isDefined({ test: "" }, "test"));
        assert.isTrue(isDefined({ test: "abc" }, "test"));
    });
});

Promise.all([loadBaseStations(true), loadElements(true), loadEvents(true)]).then(([_, elementsData, eventsData]) => {
    describe("getStateId", () => {
        const testsEvent = [
            {
                source_id: "baseId",
                ts: "1",
                o: {
                    id: "1234ab",
                    type: "um01",
                },
                state: "name",
                expected: "baseId.um01-1234ab.name",
            },
            {
                source_id: "1234567890abcde",
                ts: "1",
                o: {
                    id: "12ab",
                    type: "ab122",
                },
                state: "test",
                expected: "1234567890abcde.ab122-12ab.test",
            },
            {
                source_id: "phone",
                source_type: "gp02",
                ts: "1",
                o: {
                    type: "gp02.call",
                },
                state: "state",
                expected: "gp02-phone.state",
            },
        ];
        const testsElement = [
            {
                id: "baseId.1234ab",
                type: "bs01.um01",
                connectionStatus: "online",
                state: "name",
                expected: "baseId.um01-1234ab.name",
            },
            {
                id: "1234567890abcde.12ab",
                type: "bs01.ab122",
                connectionStatus: "online",
                state: "test",
                expected: "1234567890abcde.ab122-12ab.test",
            },
        ];
        const testsGp02Item = [
            {
                id: "phone",
                connectionStatus: "online",
                state: "test",
                expected: "gp02-phone.test",
            },
        ];

        it("builds proper state given IEvent style properties", () => {
            for (const test of testsEvent)
                assert.equal(getStateId(test as unknown as IEventsItem, test.state), test.expected);
        });

        it("builds proper state given IElement style properties", () => {
            for (const test of testsElement)
                assert.equal(getStateId(test as unknown as ISubelementsItem, test.state), test.expected);
        });

        it("builds proper state given IGp02Item style properties", () => {
            for (const test of testsGp02Item)
                assert.equal(getStateId(test as unknown as IGp02Item, test.state), test.expected);
        });

        function assertId(item: any) {
            const id = getStateId(item, "test");
            assert.exists(id, `id should be defined: ${JSON.stringify(item)}`);
            assert.typeOf(id, "string", `id should be as string: ${JSON.stringify(item)}`);
            assert.isAtLeast(id.length, 1, `id should have length >= 1: ${JSON.stringify(item)}`);
            assert.isTrue(id.endsWith(".test"), `id should end with ".test": ${JSON.stringify(item)}`);
        }

        it("does generate non-empty id for events", () => {
            const emptyEvents = [
                "bs_online_notification",
                "bs_offline_notification",
                "ack_intrusion",
                "isl01.bs01.intrusion_mode_loaded",
                "isl01.configuration_changed.user.intrusion_mode",
                "user_alarm_end",
                "user_alarm_start",
                "end_sd01_test",
            ];
            for (const event of eventsData.events.filter((e) => !emptyEvents.includes(e.type))) {
                assertId(event);
            }
        });

        it("does generate non-empty id for bs01 elements", () => {
            for (const bs01 of elementsData.bs01) for (const subelement of bs01.subelements) assertId(subelement);
        });

        it("does generate non-empty id for gp02 elements", () => {
            for (const gp02 of elementsData.gp02) assertId(gp02);
        });
    });

    describe("getChannelId", () => {
        const tests = [
            {
                id: "baseId.1234ab",
                type: "bs01.um01",
                expected: "baseId.um01-1234ab",
            },
            {
                id: "1234567890abcde.12ab",
                type: "bs01.ab122",
                expected: "1234567890abcde.ab122-12ab",
            },
        ];

        it("builds proper channel id", () => {
            for (const test of tests) assert.equal(getChannelId(test as unknown as ISubelementsItem), test.expected);
        });
    });

    describe("getReadonlyStateObject", () => {
        it("returns state object with common", () => {
            const state = getReadonlyStateObject({ name: "test", type: "string", role: "role" });
            assert.isDefined(state);
            assert.isNotNull(state);
            assert.typeOf(state, "object");
            assert.equal(state.type, "state");
            assert.typeOf(state.common, "object");
        });

        it("returns state object with name/type/role as specified", () => {
            for (const data of [
                ["test", "string", "none"],
                ["test2", "boolean", "any"],
            ]) {
                const state = getReadonlyStateObject({ name: data[0], type: data[1] as any, role: data[2] });
                assert.equal(state.common!.name, data[0]);
                assert.equal(state.common!.type, data[1] as any);
                assert.equal(state.common!.role, data[2]);
            }
        });
        it("returns readable, non-writable common by default", () => {
            const state = getReadonlyStateObject({ name: "test", type: "string", role: "none" });
            assert.isTrue(state.common!.read);
            assert.isFalse(state.common!.write);
        });

        it("allows to overwrite read and write", () => {
            const state = getReadonlyStateObject({
                name: "test",
                type: "string",
                role: "none",
                read: false,
                write: true,
            });
            assert.isFalse(state.common!.read);
            assert.isTrue(state.common!.write);
        });

        it("allows to specify common properties", () => {
            const state = getReadonlyStateObject({ name: "test", type: "string", role: "none", min: 5, max: 55 });
            assert.equal(state.common!.min, 5);
            assert.equal(state.common!.max, 55);
        });
    });

    describe("isXXX", () => {
        it("isSubelementsItem is true for bs01 subelements", () => {
            for (const bs01 of elementsData.bs01)
                for (const subelement of bs01.subelements)
                    assert.isTrue(
                        isSubelementsItem(subelement),
                        `bs01 subelement should be recognized as subelement: ${JSON.stringify(subelement)}`,
                    );
        });
        it("isSubelementsItem is false for other data", () => {
            for (const gp02 of elementsData.gp02)
                assert.isFalse(
                    isSubelementsItem(gp02),
                    `gp02 should not be recognized as subelement: ${JSON.stringify(gp02)}`,
                );
            for (const event of eventsData.events)
                assert.isFalse(
                    isSubelementsItem(event),
                    `event should not be recognized as subelement: ${JSON.stringify(event)}`,
                );
        });

        it("isEventsItem is true for events", () => {
            for (const event of eventsData.events)
                assert.isTrue(isEventsItem(event), `event should be recognized as event: ${JSON.stringify(event)}`);
        });
        it("isEventsItem is false for other data", () => {
            for (const gp02 of elementsData.gp02)
                assert.isFalse(isEventsItem(gp02), `gp02 should not be recognized as event: ${JSON.stringify(gp02)}`);
            for (const bs01 of elementsData.bs01)
                for (const subelement of bs01.subelements)
                    assert.isFalse(
                        isEventsItem(subelement),
                        `bs01 subelement should not be recognized as event: ${JSON.stringify(subelement)}`,
                    );
        });

        it("isGp02Item is true for gp02 items", () => {
            for (const gp02 of elementsData.gp02)
                assert.isTrue(isGp02Item(gp02), `gp02 should be recognized as isGp02Item: ${JSON.stringify(gp02)}`);
        });
        it("isGp02Item is false for other data", () => {
            for (const bs01 of elementsData.bs01)
                for (const subelement of bs01.subelements)
                    assert.isFalse(
                        isGp02Item(subelement),
                        `bs01 subelement should not be recognized as isGp02Item: ${JSON.stringify(subelement)}`,
                    );
            for (const event of eventsData.events)
                assert.isFalse(
                    isGp02Item(event),
                    `event should not be recognized as isGp02Item: ${JSON.stringify(event)}`,
                );
        });
    });
});
