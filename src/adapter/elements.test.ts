import { assert } from "chai";
import { loadElements } from "gigaset-elements-api";
import Sinon from "sinon";
import { GigasetElements } from "../main";
import { updateElement } from "./elements";

loadElements(true).then((elementRoot) => {
    describe("test-elements", async () => {
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

        for (const bs01 of elementRoot.bs01) {
            for (const element of bs01.subelements) {
                it(`element ${element.id} can be processed`, () => {
                    updateElement(adapterMock, element);
                    assertMock(adapterMock);
                });
            }
        }
    });
});
