import { IElementRoot } from "gigaset-elements-api";
import { createOrUpdateElementsBs01, updateElementsBs01 } from "./elements-bs01";
import { createOrUpdateElementsGp02, updateElementsGp02 } from "./elements-gp02";

/**
 * create elements objects and states, and updates state data
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function createOrUpdateElements(adapter: ioBroker.Adapter, elementRoot: IElementRoot): Promise<void> {
    await Promise.all([
        createOrUpdateElementsBs01(adapter, elementRoot.bs01),
        createOrUpdateElementsGp02(adapter, elementRoot.gp02),
    ]);
}

/**
 * update elements states
 * @param adapter adapter reference
 * @param elements elements data
 */
export async function updateElements(adapter: ioBroker.Adapter, elementRoot: IElementRoot): Promise<void> {
    await Promise.all([
        ...elementRoot.bs01.map((bs01) => updateElementsBs01(adapter, bs01.subelements)),
        updateElementsGp02(adapter, elementRoot.gp02),
    ]);
}
