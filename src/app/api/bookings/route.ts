import { NextRequest, NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../lib/auth";
import { createBookingSchema } from "../../../../lib/booking.schema";
import crypto from "crypto";
import {
    acquireSeatLock,
    releaseSeatLock,
} from "../../../../lib/lock";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

async function waitForIdempotencyCompletion(
    userId: string,
    key: string,
    maxAttempts = 20,
    delayMs = 100
) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const idempotencyRecord = await prisma.idempotencyKey.findUnique({
            where: {
                userId_key: {
                    userId,
                    key,
                },
            },
        });

        if (!idempotencyRecord) {
            return null;
        }

        if (
            idempotencyRecord.status === "COMPLETED" &&
            idempotencyRecord.bookingId
        ) {
            return await prisma.booking.findUnique({
                where: {
                    id: idempotencyRecord.bookingId,
                },
            });
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return null;
}

export async function POST(req: NextRequest) {
    let userId: string | null = null;
    let idempotencyKey: string | null = null;

    try {
        // 1. Authenticate user
        const user = await getCUrrentUser(req);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized",
                },
                { status: 401 }
            );
        }

        userId = user.id

        // 2. Get idempotency key
        idempotencyKey = req.headers.get("Idempotency-Key");

        if (!idempotencyKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Idempotency-Key header is required",
                },
                { status: 400 }
            );
        }

        // 3. Check if this request was already processed
        const existingIdempotentKey =
            await prisma.idempotencyKey.findUnique({
                where: {
                    userId_key: {
                        userId: user.id,
                        key: idempotencyKey,
                    },
                },
            });

        if (existingIdempotentKey) {
            // Already completed
            if (
                existingIdempotentKey.status === "COMPLETED" &&
                existingIdempotentKey.bookingId
            ) {
                const existingBooking = await prisma.booking.findUnique({
                    where: {
                        id: existingIdempotentKey.bookingId,
                    },
                });

                if (existingBooking) {
                    return NextResponse.json(
                        {
                            success: true,
                            data: existingBooking,
                            message: "Booking already processed",
                        },
                        { status: 200 }
                    );
                }
            }

            // Another identical request is currently processing
            if (existingIdempotentKey.status === "PROCESSING") {
                const existingBooking =
                    await waitForIdempotencyCompletion(
                        user.id,
                        idempotencyKey
                    );

                if (existingBooking) {
                    return NextResponse.json(
                        {
                            success: true,
                            data: existingBooking,
                            message: "Booking already processed",
                        },
                        { status: 200 }
                    );
                }

                return NextResponse.json(
                    {
                        success: false,
                        error: "Request is still being processed",
                    },
                    { status: 409 }
                );
            }
        }

        // 4. Create idempotency claim
        const idempotencyClaim = await prisma.idempotencyKey.create({
            data: {
                userId: user.id,
                key: idempotencyKey,
                status: "PROCESSING",
            },
        });

        // 5. Read request body
        const body = await req.json();

        // 6. Validate request
        const validatedData = createBookingSchema.parse(body);

        const { eventId, seatId } = validatedData;

        // 7. Check event
        const event = await prisma.event.findUnique({
            where: {
                id: eventId,
            },
        });

        if (!event) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Event not found",
                },
                { status: 404 }
            );
        }

        // 8. Check seat
        const seat = await prisma.seat.findUnique({
            where: {
                id: seatId,
            },
        });

        if (!seat) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat not found",
                },
                { status: 404 }
            );
        }

        // 9. Make sure seat belongs to event
        if (seat.eventId !== eventId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat does not belong to this event",
                },
                { status: 400 }
            );
        }

        // 10. Check seat availability
        if (seat.status !== "AVAILABLE") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat is not available",
                },
                { status: 409 }
            );
        }

        // 11. Create Redis lock
        const lockToken = crypto.randomUUID();

        const lockAcquired = await acquireSeatLock(
            seatId,
            lockToken
        );

        if (!lockAcquired) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat is currently being booked",
                },
                { status: 409 }
            );
        }

        // 12. Create booking inside transaction
        try {
            const booking = await prisma.$transaction(async (tx) => {
                // Re-check seat inside transaction
                const currentSeat = await tx.seat.findUnique({
                    where: {
                        id: seatId,
                    },
                });

                if (!currentSeat) {
                    throw new Error("SEAT_NOT_FOUND");
                }

                if (currentSeat.eventId !== eventId) {
                    throw new Error("INVALID_SEAT_EVENT");
                }

                if (currentSeat.status !== "AVAILABLE") {
                    throw new Error("SEAT_NOT_AVAILABLE");
                }

                // Create booking
                const newBooking = await tx.booking.create({
                    data: {
                        userId: user.id,
                        eventId,
                        seatId,
                        status: "PENDING",
                        expiresAt: new Date(
                            Date.now() + 10 * 60 * 1000
                        ),
                    },
                });

                // Mark idempotency request as completed
                await tx.idempotencyKey.update({
                    where: {
                        id: idempotencyClaim.id,
                    },
                    data: {
                        bookingId: newBooking.id,
                        status: "COMPLETED",
                    },
                });

                // Mark seat as booked
                await tx.seat.update({
                    where: {
                        id: seatId,
                    },
                    data: {
                        status: "BOOKED",
                    },
                });

                return newBooking;
            });

            return NextResponse.json(
                {
                    success: true,
                    data: booking,
                    message: "Seat booked successfully",
                },
                { status: 201 }
            );
        } finally {
            // Always release Redis lock
            await releaseSeatLock(seatId, lockToken);
        }
    } catch (error) {
        console.log("Create booking error:", error);

        // Transaction errors
        if (error instanceof Error) {
            if (error.message === "SEAT_NOT_FOUND") {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Seat not found",
                    },
                    { status: 404 }
                );
            }

            if (error.message === "INVALID_SEAT_EVENT") {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Seat does not belong to this event",
                    },
                    { status: 400 }
                );
            }

            if (error.message === "SEAT_NOT_AVAILABLE") {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Seat is not available",
                    },
                    { status: 409 }
                );
            }
        }

        // Concurrent idempotency claim
        console.log("ERROR CODE:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            console.log("Idempotency race detected");

            if (!userId || !idempotencyKey) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Request is still being processed",
                    },
                    { status: 409 }
                );
            }

            const existingBooking =
                await waitForIdempotencyCompletion(
                    userId,
                    idempotencyKey
                );

            if (existingBooking) {
                return NextResponse.json(
                    {
                        success: true,
                        data: existingBooking,
                        message: "Booking already processed",
                    },
                    { status: 200 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: "Request is still being processed",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}