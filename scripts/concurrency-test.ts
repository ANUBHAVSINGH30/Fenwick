import crypto from "crypto";
const idempotencyKey = "test-idempotency-128";

const eventId = "cmtag8wit0008sixdnhs9wu14";
const seatId = "cmtag8wjy000nsixd8owhoj17";

const sessionId = "ece8b3b8-cf1a-496f-830d-12eb70005be6";

const url = "http://localhost:3000/api/bookings";

async function makeBookingRequest(requestNumber: number) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cookie": `sessionId=${sessionId}`,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
            eventId,
            seatId,
        }),
    });

    const text = await response.text();

    let body;

    try {
        body = JSON.parse(text);
    } catch {
        body = {
            rawResponse: text,
        };
    }

    return {
        requestNumber,
        status: response.status,
        body,
    };
}

async function main() {
    console.log("Starting concurrent idempotency test...");

    const requests = Array.from(
        { length: 10 },
        (_, index) => makeBookingRequest(index + 1)
    );

    const results = await Promise.all(requests);

    console.log("\nResults:");

    for (const result of results) {
        console.log(
            `Request ${result.requestNumber}: ${result.status}`,
            result.body
        );
    }

    const successful = results.filter(
        (result) => result.status === 201
    );

    const replayed = results.filter(
        (result) => result.status === 200
    );

    console.log("\n-------------------------");
    console.log(`Created: ${successful.length}`);
    console.log(`Replayed: ${replayed.length}`);
    console.log("-------------------------");
}

main().catch((error) => {
    console.error("Test failed:", error);
});