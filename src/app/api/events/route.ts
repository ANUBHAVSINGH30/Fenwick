import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Decimal } from "@prisma/client/runtime/client";

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
        return NextResponse.json({error}, {status: 500});
    }
};

export async function POST( req: NextRequest, body: CreateEventBody) {
    try{
        const body : CreateEventBody = await req.json();

        if (
            !body.title ||
            !body.date ||
            !body.category ||
            body.price == null ||
            !body.description ||
            !body.venueId
        ){
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log("before venue")
        const venue = await prisma.venue.findUnique({
            where: {
                id: body.venueId
            }
        });
        console.log("after venue")

        if (!venue) {
            return NextResponse.json({ error: "Venue not found" }, { status: 404 });
        }

        console.log("before event")
        const newEvent = await prisma.event.create({
                data: {
                title: body.title,
                description: body.description,
                category: body.category,
                date: new Date(body.date),
                price: body.price,
                venueId: body.venueId
            }
        })
        console.log("after event")

        return NextResponse.json({success: true, data: newEvent}, {status: 201});

    }catch(error){
        const message = error instanceof Error ? error.message : "something went wrong";
        return NextResponse.json({error: message}, {status: 500})
    }
}