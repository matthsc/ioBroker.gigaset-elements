import { assert } from "chai";
import { loadEvents } from "gigaset-elements-api";
import Sinon from "sinon";
import { processEvent } from ".";
import { GigasetElements } from "../main";

loadEvents(true).then((eventRoot) => {
    describe("test-events", async () => {
        let adapterMock: GigasetElements;

        beforeEach(() => {
            const resolveFake = Sinon.fake();
            resolveFake.returnValues = [Promise.resolve()];
            adapterMock = {
                setStateChangedAsync: resolveFake,
                setStateAsync: resolveFake,
                log: {
                    info: Sinon.fake(),
                } as Partial<ioBroker.Logger> as ioBroker.Logger as ioBroker.Log,
            } as Partial<GigasetElements> as GigasetElements;
        });

        const assertMock = (mock: GigasetElements, logCallCount = 0) => {
            const errorSpy = mock.log.info as Sinon.SinonSpy;
            assert.equal(errorSpy.callCount, logCallCount);
        };

        for (const event of eventRoot.events) {
            it(`event type ${event.type} can be processed`, () => {
                processEvent(adapterMock, event);
                assertMock(adapterMock);
            });
        }

        it("logs message for unknown event types", () => {
            processEvent(adapterMock, {
                ...eventRoot.events[0],
                type: "unknown",
            });
            assertMock(adapterMock, 1);
        });
    });
});
