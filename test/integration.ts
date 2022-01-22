import { tests } from "@iobroker/testing";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
import { assert, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import path from "path";

chaiUse(chaiAsPromised);

const delay = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });

const getHarnessAndStartAdapter = async (getHarness: () => TestHarness): Promise<TestHarness> => {
    // Create a fresh harness instance each test!
    const harness = getHarness();
    // Start the adapter and wait until it has started
    await harness.startAdapterAndWait();
    // seems we need to wait a little before we can send messages
    await delay(500);
    // return harness
    return harness;
};

const sendMessage = (
    harness: TestHarness,
    command: string,
    message?: ioBroker.MessagePayload,
): Promise<ioBroker.Message | undefined> => {
    return new Promise<ioBroker.Message | undefined>((resolve, reject) => {
        harness.sendTo("gigaset-elements.0", command, message, (response) => {
            console.log("=============================================");
            console.log(response);
            console.log("=============================================");

            if ((response as any)?.error) reject((response as any).error);
            else resolve((response as any).result);
        });
    });
};

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
    //            ~~~~~~~~~~~~~~~~~~~~~~~~~
    // This should be the adapter's root directory

    // If the adapter may call process.exit during startup, define here which exit codes are allowed.
    // By default, termination during startup is not allowed.
    // allowedExitCodes: [11],

    // Define your own tests inside defineAdditionalTests
    // Since the tests are heavily instrumented, you need to create and use a so called "harness" to control the tests.
    defineAdditionalTests(getHarness: () => TestHarness) {
        describe("sendTo()", function () {
            this.timeout(5000);

            it("should answer a ping", async () => {
                const harness = await getHarnessAndStartAdapter(getHarness);
                await sendMessage(harness, "test", "ping");
            });

            it("should throw on unknown messages", async () => {
                const harness = await getHarnessAndStartAdapter(getHarness);
                assert.isRejected(sendMessage(harness, "unknown"));
            });
        });

        // describe("test-data", function () {
        //     this.timeout(5000);

        // this doesn't seem to work in integration test, maybe because of the parallelism when creating states
        //     it("should be processed without throwing an error", async () => {
        //         const harness = await getHarnessAndStartAdapter(getHarness);
        //         await sendMessage(harness, "test", "process-test-data");
        //     });
        // });
    },
});
