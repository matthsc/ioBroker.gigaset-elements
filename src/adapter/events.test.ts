import { assert } from "chai";
import { loadEvents } from "gigaset-elements-api";
import Sinon from "sinon";
import { processEvent } from ".";
import { GigasetElements } from "../main";

loadEvents(true).then((eventRoot) => {
    describe("test-events", async () => {
        let adapterMock: GigasetElements;

        beforeEach(() => {
            const setStateAsyncMock = Sinon.fake();
            setStateAsyncMock.returnValues = [Promise.resolve()];
            adapterMock = {
                setStateChangedAsync: Sinon.fake(),
                log: {
                    info: Sinon.fake(),
                } as Partial<ioBroker.Logger> as ioBroker.Logger,
            } as Partial<GigasetElements> as GigasetElements;
        });

        const assertMock = (mock: GigasetElements) => {
            const errorSpy = mock.log.info as Sinon.SinonSpy;
            assert.equal(errorSpy.callCount, 0);
        };

        for (const event of eventRoot.events) {
            it(`event type ${event.type} can be processed`, () => {
                processEvent(adapterMock, event);
                assertMock(adapterMock);
            });
        }
    });
});
