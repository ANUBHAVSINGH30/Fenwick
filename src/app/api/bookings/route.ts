import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../lib/auth"; 
import { createBookingSchema } from "../../../../lib/booking.schema";
import { set } from "zod";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

export async function POST(req: NextRequest) {
    try{
        //1. Authenticate user
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

        //2. Read request body
        const body = await req.json();

        // 3. Validate request
        const validatedData = createBookingSchema.parse(body);

        const {eventId, seatId} = validatedData;

        //4.Check event 
        const event = await prisma.event.findUnique({
            where: {
                id: eventId
            },
        });

        if(!event){
            return NextResponse.json({
                success: false,
                error: "Event not found"
            }, {status: 404})
        }

        //5.Check seats
        const seats = await prisma.seat.findUnique({
            where: {
                id: seatId
            },
        });

        if(!seats){
            return NextResponse.json({
                success: false,
                error: "Seat not found"
            }, {status: 404})
        }

        //6. make sure the seat belong to this event
        if(seats.eventId !== eventId){
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat does not belong to this event",
                },
                { status: 400 }
            );
        }

        //7.Check availability
        if( seats.status !== "AVAILABLE"){
            return NextResponse.json(
                {
                    success: false,
                    error: "Seat is not available",
                },
                { status: 409 }
            );
        }

        //8.Create booking 
        const booking = await prisma.$transaction(async (tx) => {
            const currentSeat = await tx.seat.findUnique({
                where: {
                    id: seatId,
                },
            });

            if(!currentSeat){
                throw new Error("Seat not found");
            }

            if(currentSeat.eventId !== eventId){
                throw new Error("Seat does not belong to this event");
            }

            if(currentSeat.status !== "AVAILABLE"){
                throw new Error ("Seat is not Available");
            }

            const newBooking = await tx.booking.create({
                data: {
                    userId: user.id,
                    eventId,
                    seatId,
                    status: "PENDING",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                },
            });

            await tx.seat.update({
                where: {
                    id: seatId,
                },
                data: {
                    status: "BOOKED",
                },
            });

            return newBooking;
        })

        return NextResponse.json(
            {
                success: true,
                data: booking,
                message: "Seat booked successfully",
            },
            { status: 201 }
        );

    }catch(error){
        console.log("Create booking error: ",error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}