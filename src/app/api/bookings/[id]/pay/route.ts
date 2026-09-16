import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, BookingStatus } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../../../lib/auth";
import { success, z } from "zod";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const paymentSchema = z.object({
    result: z.enum(["SUCCESS", "FAILED"])
});

export async function POST(req: NextRequest, {params}: {params: Promise< {id: string}> }) {
    try{
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

        const { id: bookingId} = await params;

        const body = await req.json();
        const validateData = paymentSchema.parse(body);

        const booking = await prisma.booking.findUnique({
            where: {
                id: bookingId
            }
        });

        if (!booking) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Booking not found",
                },
                { status: 404 }
            );
        }

        if (booking.userId !== user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to pay for this booking",
                },
                { status: 403 }
            );
        }

        if (booking.status !== BookingStatus.PENDING) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Booking is not pending",
                },
                { status: 409 }
            );
        }

        if (
            booking.expiresAt &&
            booking.expiresAt <= new Date()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Booking has expired",
                },
                { status: 409 }
            );
        }

        const result = prisma.$transaction(async (tx) => {
            const updatedBooking = await tx.booking.updateMany({
                where: {
                    id: bookingId,
                    status: BookingStatus.PENDING,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                data: {
                    status:
                        validateData.result === "SUCCESS"
                            ? BookingStatus.CONFIRMED
                            : BookingStatus.CANCELLED,
                },
            });

            if (updatedBooking.count === 0) {
                throw new Error("BOOKING_ALREADY_HANDLED");
            }

            if (validateData.result === "FAILED") {
                await tx.seat.update({
                    where: {
                        id: booking.seatId,
                    },
                    data: {
                        status: "AVAILABLE",
                    },
                });
            }

            return await tx.booking.findUnique({
                where: {
                    id: bookingId,
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: result,
            message:
                    validateData.result === "SUCCESS"
                        ? "Payment successful and booking confirmed"
                        : "Payment failed and booking cancelled",
        }, {status: 200})

    }catch(error){
        if (
            error instanceof Error &&
            error.message === "BOOKING_ALREADY_HANDLED"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Booking has already been handled",
                },
                { status: 409 }
            );
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid payment result",
                },
                { status: 400 }
            );
        }

        console.error("Payment error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}