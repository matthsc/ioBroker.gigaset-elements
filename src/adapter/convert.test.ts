import { assert } from "chai";
import { IModesItem, loadElements } from "gigaset-elements-api";
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
        assert.equal(convertSensorStateToId("probably_closed"), 0); // temporarily seen on elements
        assert.equal(convertSensorStateToId("unknown"), 0);
    });
    it("converts tilt", () => {
        assert.equal(convertSensorStateToId("tilt"), 1);
        assert.equal(convertSensorStateToId("tilted"), 1);
        assert.equal(convertSensorStateToId("probably_tilted"), 1);
    });
    it("converts open", () => {
        assert.equal(convertSensorStateToId("open"), 2);
        assert.equal(convertSensorStateToId("probably_open"), 2);
        assert.equal(convertSensorStateToId("opened"), 2);
    });

    it("converts all states from test data", async () => {
        const { bs01 } = await loadElements(true);
        const positions = new Set(
            bs01
                .flatMap((b) => b.subelements)
                .map((e) => e.positionStatus as string)
                .filter((s) => !!s),
        );
        for (const state of positions) {
            assert.doesNotThrow(
                () => {
                    convertSensorStateToId(state);
                },
                undefined,
                undefined,
                `${state} ${JSON.stringify([...positions])}`,
            );
        }
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
