import { tests } from "@iobroker/testing";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
import { assert, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import path from "path";

chaiUse(chaiAsPromised);

const sendMessage = (
    harness: TestHarness,
    command: string,
    message?: ioBroker.MessagePayload,
): Promise<ioBroker.Message | undefined> => {
    return new Promise<ioBroker.Message | undefined>((resolve, reject) => {
        harness.sendTo("gigaset-elements.0", command, message, (response) => {
            console.log("=============================================");
            console.log("%o %o", command, message);
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
    defineAdditionalTests({ suite }) {
        // All tests (it, describe) must be grouped in one or more suites. Each suite sets up a fresh environment for the adapter tests.
        // At the beginning of each suite, the databases will be reset and the adapter will be started.
        // The adapter will run until the end of each suite.

        // Since the tests are heavily instrumented, each suite gives access to a so called "harness" to control the tests.
        suite("sendTo()", function (getHarness) {
            describe("", function () {
                this.timeout(5000);

                let harness: TestHarness;
                before(async () => {
                    harness = getHarness();
                    await harness.startAdapterAndWait();
                });

                it("should answer a ping", async () => {
                    await sendMessage(harness, "test", "ping");
                });

                it("should throw on unknown messages", async () => {
                    assert.isRejected(sendMessage(harness, "unknown"));
                });
            });
        });

        // suite("test-data", function (getHarness) {
        //     describe("test-data", function () {
        //         this.timeout(5000);

        //         let harness: TestHarness;
        //         before(async () => {
        //             harness = getHarness();
        //             await harness.startAdapterAndWait();
        //         });

        //         // this doesn't seem to work in integration test, maybe because of the parallelism when creating states
        //         it("should be processed without throwing an error", async () => {
        //             await sendMessage(harness, "test", "process-test-data");
        //         });
        //     });
        // });
    },
});
