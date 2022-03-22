import { assert } from "chai";
import { loadBaseStations } from "gigaset-elements-api";
import Sinon from "sinon";
import { GigasetElements } from "../main";
import { updateBasestation } from "./basestation";

loadBaseStations(true).then((elementRoot) => {
    describe("test-basestations", async () => {
        let adapterMock: GigasetElements;

        beforeEach(() => {
            const setStateAsyncMock = Sinon.fake();
            setStateAsyncMock.returnValues = [Promise.resolve()];
            adapterMock = {
                setStateChangedAsync: setStateAsyncMock,
                log: {
                    info: Sinon.fake(),
                } as Partial<ioBroker.Logger> as ioBroker.Logger,
            } as Partial<GigasetElements> as GigasetElements;
        });

        const assertMock = (mock: GigasetElements) => {
            const errorSpy = mock.log.info as Sinon.SinonSpy;
            assert.equal(errorSpy.callCount, 0);
        };

        for (const base of elementRoot) {
            it(`element ${base.id} can be processed`, () => {
                updateBasestation(adapterMock, base);
                assertMock(adapterMock);
            });
        }
    });
});
