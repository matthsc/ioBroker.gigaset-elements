// tslint:disable:no-unused-expression

import { expect } from "chai";
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
            expect(getStateId(test as unknown as IEventsItem, test.state)).to.eq(test.expected);
    });

    it("builds proper state given IElement style properties", () => {
        for (const test of testsElement)
            expect(getStateId(test as unknown as ISubelementsItem, test.state)).to.eq(test.expected);
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
        for (const test of tests) expect(getChannelId(test as unknown as ISubelementsItem)).to.eq(test.expected);
    });
});

describe("getReadonlyStateObject", () => {
    it("returns state object with common", () => {
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "role" });
        expect(state).not.to.be.undefined;
        expect(state).not.to.be.null;
        expect(state).to.be.an("object");
        expect(state.type).to.eq("state");
        expect(state.common).to.be.an("object");
    });

    it("returns state object with name/type/role as specified", () => {
        for (const data of [
            ["test", "string", "none"],
            ["test2", "boolean", "any"],
        ]) {
            const state = getReadonlyStateObject({ name: data[0], type: data[1] as any, role: data[2] });
            expect(state.common!.name).to.eq(data[0]);
            expect(state.common!.type).to.eq(data[1]);
            expect(state.common!.role).to.eq(data[2]);
        }
    });
    it("returns readable, non-writable common by default", () => {
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "none" });
        expect(state.common!.read).to.be.true;
        expect(state.common!.write).to.be.false;
    });

    it("allows to overwrite read and write", () => {
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "none", read: false, write: true });
        expect(state.common!.read).to.be.false;
        expect(state.common!.write).to.be.true;
    });

    it("allows to specify common properties", () => {
        const state = getReadonlyStateObject({ name: "test", type: "string", role: "none", min: 5, max: 55 });
        expect(state.common!.min).to.eq(5);
        expect(state.common!.max).to.eq(55);
    });
});
