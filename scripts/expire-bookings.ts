import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { expireBooking } from "../lib/booking-expiration";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

async function main(){
    const expiredBookings = await prisma.booking.findMany({
        where: {
            status: "PENDING",
            expiresAt: {
                lte: new Date(),
            },
        },
    });

    console.log(`Found ${expiredBookings.length} expired bookings`);

    for (const booking of expiredBookings) {
    try {
        await expireBooking(booking.id);

        console.log(`Expired booking: ${booking.id}`);
    } catch (error) {
        console.error(
            `Failed to expire booking ${booking.id}:`,
            error
        );
    }
}
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });{
    
}
