import crypto from "crypto";

const eventId = "cmtag8wit0008sixdnhs9wu14";
const seatId = "cmtag8wjy000osixdv5g7wiln";

const sessions = [
    "ece8b3b8-cf1a-496f-830d-12eb70005be6",
    // Add another valid user's session ID here
    "365208dc-2058-4cb0-9f3a-ad2bf167f078",
];

const url = "http://localhost:3000/api/bookings";

async function makeBookingRequest(
    requestNumber: number,
    sessionId: string
) {
    const idempotencyKey = `redis-lock-test-${crypto.randomUUID()}`;

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
        sessionId,
        idempotencyKey,
        status: response.status,
        body,
    };
}

async function main() {
    console.log("Starting Redis lock concurrency test...\n");

    const requests = sessions.map((sessionId, index) =>
        makeBookingRequest(index + 1, sessionId)
    );

    const results = await Promise.all(requests);

    console.log("Results:\n");

    for (const result of results) {
        console.log(
            `Request ${result.requestNumber}: ${result.status}`,
            result.body
        );
    }

    const created = results.filter(
        (result) => result.status === 201
    );

    const lockRejected = results.filter(
        (result) =>
            result.status === 409 &&
            result.body?.error === "Seat is currently being booked"
    );

    console.log("\n-------------------------");
    console.log(`Created: ${created.length}`);
    console.log(`Redis lock rejected: ${lockRejected.length}`);
    console.log("-------------------------");

    if (created.length === 1 && lockRejected.length === sessions.length - 1) {
        console.log("✅ Redis lock concurrency test PASSED");
    } else {
        console.log("❌ Redis lock concurrency test FAILED");
    }
}

main().catch((error) => {
    console.error("Test failed:", error);
});