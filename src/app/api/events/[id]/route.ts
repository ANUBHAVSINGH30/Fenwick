import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

//define the params type 
interface EventProps {
    params: Promise<{id: string}>;
}

export async function GET(res:NextResponse, {params}: EventProps) {
    try{
        const {id} = await params;

        const event = await prisma.event.findUnique({
            where: {
                id
            },
            include: {
                venue: true,
                seats: true
            },
        });

        //check if event exist 
        if(!event) {
            return NextResponse.json({
                success: false, msg: "No event found"
            },{status: 404});
        }

        return NextResponse.json({
            event,
            success: true,
            msg: "here is the selected event"
        },{
            status: 200
        });


    }catch(error){
        console.error(error);
        return NextResponse.json({error: "Internal server error"}, {status: 500})
    }
}   