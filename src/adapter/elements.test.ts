import { assert } from "chai";
import { loadElements } from "gigaset-elements-api";
import Sinon from "sinon";
import { GigasetElements } from "../main";
import { updateElements } from "./elements";
import { updateElementBs01 } from "./elements-bs01";
import { updateElementGp02 } from "./elements-gp02";

loadElements(true).then((elementRoot) => {
    describe("test-elements", async () => {
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

        const assertMock = (mock: GigasetElements) => {
            const errorSpy = mock.log.info as Sinon.SinonSpy;
            assert.equal(errorSpy.callCount, 0);
        };

        for (const bs01 of elementRoot.bs01) {
            for (const element of bs01.subelements) {
                it(`element ${element.id} can be processed`, async () => {
                    await updateElementBs01(adapterMock, element);
                    assertMock(adapterMock);
                });
            }
        }

        for (const gp02 of elementRoot.gp02) {
            it(`gp02 ${gp02.id} can be processed`, async () => {
                await updateElementGp02(adapterMock, gp02);
                assertMock(adapterMock);
            });
        }

        it("all elements can be processed", async () => {
            await updateElements(adapterMock, elementRoot);
            assertMock(adapterMock);
        });
    });
});
