const eventId = "cmtag8wit0008sixdnhs9wu14";
const seatId = "cmtag8wjy000msixdqt2s9f52";

const sessionId = "52d53a17-42f4-4a81-8919-506f94037896";

const url = "http://localhost:3000/api/bookings";

async function makeBookingRequest(requestNumber: number) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cookie": `sessionId=${sessionId}`,
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