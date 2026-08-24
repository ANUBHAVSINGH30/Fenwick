import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError, email, httpUrl, success, z } from "zod";
import crypto from "crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import redis from "../../../../../lib/redis";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const siginSchema = z.object({
    email: z.string().email(),
    password : z.string().min(8)
});

export async function POST(req: NextRequest) {
    try{
        const body = await req.json();

        const validatedData = siginSchema.parse(body);

        const user = await prisma.user.findUnique({
            where: {
                email: validatedData.email,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid email or password",
                },
                { status: 401 }
            );
        }

        const passwordMatch = bcrypt.compare(validatedData.password, user.passwordHash);

        if (!passwordMatch) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid email or password",
                },
                { status: 401 }
            );
        }

        const sessionId = crypto.randomUUID();

        await redis.set(
            `session:${sessionId}`,
            user.id,
            "EX",
            60 * 60 * 24 * 7
        );

        const response = NextResponse.json({
            success: true,
            message: "Signin Successfull",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,   
            },
        }, {status: 200});

        response.cookies.set("sessionId", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/"
        });

        return response;

    }catch(error){
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid input",
                    details: error.issues,
                },
                { status: 400 }
            );
        };

        console.error("Signin error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}