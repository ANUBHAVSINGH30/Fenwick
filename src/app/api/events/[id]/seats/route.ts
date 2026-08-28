import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../../../lib/auth";
import { createSeatsSchema } from "../../../../../../lib/event.schema";
import { UserRole } from "@/generated/prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

interface EventProps {
    params: Promise<{id: string}>;
}

export async function GET(req: NextRequest, {params}: EventProps) {
    try{
        const {id} = await params;

        //check if event exist
        const event = await prisma.event.findUnique({
            where: {
                id,
            }
        })

        if (!event) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Event not found",
                },
                { status: 404 }
            );
        }

        //Get seat belonging to the events 
        const seats = await prisma.seat.findMany({
            where: {
                eventId: id,
            },
            orderBy: [
                {
                    row: "asc"
                },
                {
                    number: "asc"
                },
            ],
        });

        return NextResponse.json(
            {
                success: true,
                data: seats,
            },
            { status: 200 }
        );

    }catch(error){
        console.error("Get seats error ", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
};


export async function POST(req: NextRequest, {params}: EventProps ){
    try{
        // 1. Authentication
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

        // 2. Get event ID
        const { id } = await params;

        // 3. Find event
        const event = await prisma.event.findUnique({
            where: {
                id,
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

        // 4. Authorization
        if (
            event.userId !== user.id &&
            user.role !== UserRole.ADMIN
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to manage seats for this event",
                },
                { status: 403 }
            );
        }

        // 5. Read request body
        const body = await req.json();

        // 6. Validate
        const validatedData = createSeatsSchema.parse(body);

        // 7. Create seats
        const seats = await prisma.seat.createMany({
            data: validatedData.seats.map((seat) => ({
                row: seat.row,
                number: seat.number,
                eventId: id,
            })),
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    count: seats.count,
                },
                message: "Seats created successfully",
            },
            { status: 201 }
        );

    }catch(error){
        console.log("Seat creation error",error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}