import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { success } from "zod";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

export async function expireBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: {
            id: bookingId,
        },
    });

    if(!booking){
        throw new Error("BOOKING_NOT_FOUND");
    };

    if(booking.status !== "PENDING"){
        throw new Error("BOOKING_NOT_PENDING");
    }

    if(!booking.expiresAt || booking.expiresAt > new Date()) {
        throw new Error("BOOKING_NOT_EXPIRED");
    };

    const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.updateMany({
        where: {
            id: bookingId,
            status:"PENDING",
            expiresAt: {
                lte: new Date(),
            }
        },
        data: {
            status: "EXPIRED",
        },
    });

    if(updatedBooking.count === 0) {
        throw new Error("BOOKING_ALREADY_HANDLED")
    }

    await tx.seat.update({
        where: {
            id: booking.seatId,
        },
        data: {
            status: "AVAILABLE",
        },
    });

    return updatedBooking;
});

return {
    success: true,
    booking: bookingId,
};  
}