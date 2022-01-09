// tslint:disable:no-unused-expression

import { assert } from "chai";
import type { IEventsItem, ISubelementsItem } from "gigaset-elements-api";
import { getChannelId, getReadonlyStateObject, getStateId } from "./util";

describe("getStateId", () => {
    const testsEvent = [
        {
            source_id: "baseId",
            o: {
                id: "1234ab",
                type: "um01",
            },
            state: "name",
            expected: "baseId.um01-1234ab.name",
        },
        {
            source_id: "1234567890abcde",
            o: {
                id: "12ab",
                type: "ab122",
            },
            state: "test",
            expected: "1234567890abcde.ab122-12ab.test",
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

    it("builds proper state given IEvent style properties", () => {
        for (const test of testsEvent)
            assert.equal(getStateId(test as unknown as IEventsItem, test.state), test.expected);
    });

    it("builds proper state given IElement style properties", () => {
        for (const test of testsElement)
            assert.equal(getStateId(test as unknown as ISubelementsItem, test.state), test.expected);
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
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "none", read: false, write: true });
        assert.isFalse(state.common!.read);
        assert.isTrue(state.common!.write);
    });

    it("allows to specify common properties", () => {
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "none", min: 5, max: 55 });
        assert.equal(state.common!.min, 5);
        assert.equal(state.common!.max, 55);
    });
});
