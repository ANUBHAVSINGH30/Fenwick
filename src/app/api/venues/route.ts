import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../lib/auth";
import { venueSchema, VenueSchema } from "../../../../lib/event.schema";
import { preloadStyle } from "next/dist/server/app-render/entry-base";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

export async function GET() {
    try {
        const venues = await prisma.venue.findMany({
            orderBy: {
                city: "asc",
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: venues,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Get venues error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
};


export async function POST(req: NextRequest) {
    try{
        //1.Authentication
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

        //2. AUthorization
        if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to create venues",
                },
                { status: 403 }
            );
        }

        //3. read body
        const body = await req.json();

        //4. validate body
        const validatedData = venueSchema.parse(body);

        //5. create venue
        const venue = await prisma.venue.create({
            data: {
                name: validatedData.name,
                city: validatedData.city,
                address: validatedData.address,
                userId: user.id,
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: venue,
                message: "Venue created successfully",
            },
            { status: 201 }
        );

    }catch(error){
       console.error("Create venue error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}