import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
}