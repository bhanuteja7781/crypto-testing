const { test, expect } = require("@playwright/test");
const { generateSignature } = require("../utils/crypto");

const BASE_URL = "http://localhost:3000/api/transactions";

test.describe("Cryptographic Replay Protection Tests", () => {

    test("should reject a replayed authenticated request", async ({ request }) => {

        const createPayload = {
            amount: 120.50,
            currency: "USD",
            recipient: "merchant_01"
        };

        // Step 1: Create a transaction
        const createResponse = await request.post(BASE_URL, {
            data: createPayload
        });

        expect(createResponse.status()).toBe(201);

        const transactionId =
            createResponse.headers()["x-transaction-id"];

        const nonce =
            createResponse.headers()["x-nonce"];

        const timestamp =
            createResponse.headers()["x-timestamp"];

        expect(transactionId).toBeTruthy();
        expect(nonce).toBeTruthy();
        expect(timestamp).toBeTruthy();

        // Step 2: Prepare authenticated PUT request
        const updatePayload = {
            status: "completed"
        };

        const signature = generateSignature(
            updatePayload,
            timestamp,
            nonce
        );

        const secureHeaders = {
            "Content-Type": "application/json",
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature
        };

        const firstPut = await request.put(
            `${BASE_URL}/${transactionId}`,
            {
                headers: secureHeaders,
                data: updatePayload
            }
        );

        expect(firstPut.status()).toBe(200);
        // Wait approximately 150 ms before replaying
        await new Promise(resolve => setTimeout(resolve, 150));

        // Step 3: Replay the exact same authenticated request
        const replayPut = await request.put(
            `${BASE_URL}/${transactionId}`,
            {
                headers: secureHeaders,
                data: updatePayload
            }
        );

        // Raise a security alert if replay protection fails
        if (replayPut.status() === 200 || replayPut.status() === 201) {
            throw new Error(`HIGH-RISK DATA MUTATION VULNERABILITY DETECTED
                Replay protection failed.
                Duplicate authenticated request was accepted.
                Expected: 403 Forbidden / 409 Conflict / 422 Unprocessable Entity
                Received:${replayPut.status()}
            `);
        }

        expect([403, 409, 422]).toContain(replayPut.status());

        const replayBody = await replayPut.json();

        expect(replayBody.error).toContain("Replay");
    });

});
