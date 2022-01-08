// tslint:disable:no-unused-expression

import { assert, expect } from "chai";
import { convertSensorStateToId } from "./convert";

describe("convertSensorStateToId", () => {
    it("throws on unknown states", () => {
        for (const state of ["asdsad", "fasda.asdsad.asda", "123345"]) {
            try {
                convertSensorStateToId(state);
            } catch (err) {
                assert(true);
                continue;
            }
            assert(false, "didn't throw");
        }
    });

    it("converts close", () => {
        expect(convertSensorStateToId("close")).to.eq(0);
        expect(convertSensorStateToId("closed")).to.eq(0);
    });
    it("converts tilt", () => {
        expect(convertSensorStateToId("tilt")).to.eq(1);
        expect(convertSensorStateToId("tilted")).to.eq(1);
    });
    it("converts open", () => {
        expect(convertSensorStateToId("open")).to.eq(2);
        expect(convertSensorStateToId("opened")).to.eq(2);
    });
});
