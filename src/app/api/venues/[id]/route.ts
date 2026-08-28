import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCUrrentUser } from "../../../../../lib/auth";
import { venueSchema, VenueSchema } from "../../../../../lib/event.schema";
import { UserRole } from "@/generated/prisma/enums";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

interface VenueProps {
    params: Promise<{ id: string }>;
}

// GET /api/venues/:id
export async function GET(
    req: NextRequest,
    { params }: VenueProps
) {
    try {
        const { id } = await params;

        const venue = await prisma.venue.findUnique({
            where: {
                id,
            },
            include: {
                events: true,
            },
        });

        if (!venue) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Venue not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: venue,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Get venue error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}


export async function PATCH(
    req: NextRequest,
    { params }: VenueProps
) {
    try {
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

        const { id } = await params;

        // 2. Find venue
        const venue = await prisma.venue.findUnique({
            where: {
                id,
            },
        });

        if (!venue) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Venue not found",
                },
                { status: 404 }
            );
        }

        // 3. Authorization
        if (
            venue.userId !== user.id &&
            user.role !== UserRole.ADMIN
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to update this venue",
                },
                { status: 403 }
            );
        }

        // 4. Read body
        const body = await req.json();

        // 5. Validate
        const validatedData = venueSchema.partial().parse(body);

        // 6. Update
        const updatedVenue = await prisma.venue.update({
            where: {
                id,
            },
            data: validatedData,
        });

        return NextResponse.json(
            {
                success: true,
                data: updatedVenue,
                message: "Venue updated successfully",
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Update venue error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}


export async function DELETE(
    req: NextRequest,
    { params }: VenueProps
) {
    try {
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

        const { id } = await params;

        // 2. Find venue
        const venue = await prisma.venue.findUnique({
            where: {
                id,
            },
        });

        if (!venue) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Venue not found",
                },
                { status: 404 }
            );
        }

        // 3. Authorization
        if (
            venue.userId !== user.id &&
            user.role !== UserRole.ADMIN
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You are not allowed to delete this venue",
                },
                { status: 403 }
            );
        }

        // 4. Delete
        await prisma.venue.delete({
            where: {
                id,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Venue deleted successfully",
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Delete venue error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}