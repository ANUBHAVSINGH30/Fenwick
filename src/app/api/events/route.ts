import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Decimal } from "@prisma/client/runtime/client";
import { eventSchema } from "../../../../lib/event.schema";
import { ZodError } from "zod";
import { getCUrrentUser } from "../../../../lib/auth";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient ({
    adapter,
});

interface CreateEventBody {
    title: string,
    description: string,
    category: string,
    date: Date,
    price: Decimal | number,
    venueId: string
}


//GET events
export async function GET(res: NextResponse,) {
    try{

        const Events = await prisma.event.findMany({
            include: {
                venue: true
            }
        });

        return NextResponse.json({
            Events,
            success: true,
            message: "here is all the events."
        },
        {status: 200});
    
    }catch(error){
        console.error("GET /api/events error:", error);
        return NextResponse.json({success: false, error: "Internal server error"}, {status: 500});
    }
};



//POST events
export async function POST( req: NextRequest) {
    try{
        //check if the user has a valid sessionID
        const user = await getCUrrentUser(req);

        //then check if...
        if(!user){
            return NextResponse.json({
                success: false,
                error: "Unauthorized"
            }, {status: 401})
        }

        const body : CreateEventBody = await req.json();

         // Runtime validation
        const validateData = eventSchema.parse(body);

        // Check that the venue exists
        const venue = await prisma.venue.findUnique({
            where: {
                id: validateData.venueId
            }
        });

        if (!venue) {
            return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
        };


        // Create the event
        const newEvent = await prisma.event.create({
                data: {
                title: validateData.title,
                description: validateData.description,
                category: validateData.category,
                date: new Date(validateData.date),
                price: validateData.price,
                venueId: validateData.venueId,
                userId: user.id
            }
        })
        return NextResponse.json({success: true, data: newEvent, message: "Event created successfully"}, {status: 201});

    }catch(error){

        // Client sent invalid data
        if(error instanceof ZodError) {
            return NextResponse.json({
                success: false,
                error: "Invalid event data",
                detail: error.issues
            }, {status: 400})
        };

        //unexpected server error
        console.error("POST /api/events error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}