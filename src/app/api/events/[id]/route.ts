import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../../lib/auth";

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


export async function DELETE(req: NextRequest, {params}: EventProps) {
    try{
        //check for user is logged in or not 
        const user = await getCUrrentUser(req);

        if(!user){
            return NextResponse.json({
                success: false,
                error: "Unauthorized"
            }, {status: 401});
        }

        //get the event Id from the params 
        const {id} = await params;

        //find the event
        const event = await prisma.event.findUnique({
            where: {
                id,
            },
        });

        //check if the event exist 
        if(!event){
            return NextResponse.json({
                success: false,
                error: "Event not found"
            }, {status: 404})
        }

        //check ownership
        if(event.userId !== user.id){
            return NextResponse.json({
                success: false,
                error: "You are not allowed to delete this event"
            }, {status: 403})
        };

        await prisma.event.delete({
            where: {
                id,
            }
        });

        return NextResponse.json({
            success: true,
            message: "Event deleted successfully",
        }, {status: 201});

    }catch(error){
        console.error(error);

        return NextResponse.json({
            success: false,
            error: "Internal server error"
        }, {status: 500})
    }
}