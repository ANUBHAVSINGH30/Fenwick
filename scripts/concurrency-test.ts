import crypto from "crypto";
const idempotencyKey = crypto.randomUUID();

const eventId = "cmtag8wit0008sixdnhs9wu14";
const seatId = "cmtag8wjy000isixdfflvygwp";

const sessionId = "f2f6dad1-0919-4e97-955b-df33d5273502";

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
    console.log("Starting concurrency test...");

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

    console.log("\n-------------------------");
    console.log(`Successful bookings: ${successful.length}`);
    console.log("-------------------------");
}

main().catch((error) => {
    console.error("Test failed:", error);
});