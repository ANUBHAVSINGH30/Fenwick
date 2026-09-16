import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../../../lib/auth";
import { finishAccumulatingVaryParams } from "next/dist/server/app-render/vary-params";
import { error } from "console";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

export async function POST(req: NextRequest, {params}: {params:  Promise<{ id: string }> }) {
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

        const {id: bookingId} = await params;

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

        if (
            booking.userId !== user.id &&
            user.role !== "ADMIN"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to cancel this booking",
                },
                { status: 403 }
            );
        }

        if(
            booking.status !== "PENDING" &&
            booking.status !== "CONFIRMED"
        ) {
            return NextResponse.json({
                success: false,
                error: "Booking can not be cancelled"
            }, {status: 409})
        }

        const result = prisma.$transaction(async (tx) => {
            const updatedBooking = await tx.booking.updateMany({
                where: {
                    id: bookingId,
                    status: {
                        in: ["PENDING", "CONFIRMED"]
                    },
                },
                data: {
                    status: "CANCELLED"
                }
            })

            if (updatedBooking.count === 0) {
                throw new Error("BOOKING_ALREADY_HANDLED");
            }

            await tx.seat.update({
                where: {
                    id: booking.seatId,
                },
                data: {
                    status: "AVAILABLE",
                },
            });

            return await tx.booking.findUnique({
                where: {
                    id: bookingId,
                },
            });
        })


        return NextResponse.json(
            {
                success: true,
                data: result,
                message: "Booking cancelled successfully",
            },
            { status: 200 }
        );

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

        console.error("Cancel booking error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}
