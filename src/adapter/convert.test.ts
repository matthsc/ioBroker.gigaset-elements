// tslint:disable:no-unused-expression

import { assert } from "chai";
import { IModesItem } from "gigaset-elements-api";
import { convertIntrusionModesToStatesValue, convertSensorStateToId } from "./convert";

describe("convertSensorStateToId", () => {
    it("throws on unknown states", () => {
        for (const state of ["asdsad", "fasda.asdsad.asda", "123345"]) {
            assert.throws(() => {
                convertSensorStateToId(state);
            });
        }
    });

    it("converts close", () => {
        assert.equal(convertSensorStateToId("close"), 0);
        assert.equal(convertSensorStateToId("closed"), 0);
    });
    it("converts tilt", () => {
        assert.equal(convertSensorStateToId("tilt"), 1);
        assert.equal(convertSensorStateToId("tilted"), 1);
    });
    it("converts open", () => {
        assert.equal(convertSensorStateToId("open"), 2);
        assert.equal(convertSensorStateToId("opened"), 2);
    });
});

describe("convertIntrusionModesToStatesValue", () => {
    const intrusionModes = [{ custom: {} }, { night: {} }, { day: {} }] as IModesItem[];

    it("returns a string", () => {
        assert.typeOf(convertIntrusionModesToStatesValue(intrusionModes), "string");
    });

    it("returned string is valid JSON", () => {
        assert.doesNotThrow(() => {
            JSON.parse(convertIntrusionModesToStatesValue(intrusionModes));
        });
    });

    it("returns the desired stringified object", () => {
        const result = JSON.parse(convertIntrusionModesToStatesValue(intrusionModes));
        assert.deepEqual(result, { custom: "custom", night: "night", day: "day" });
    });
});
