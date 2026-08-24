import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError, email, string, success, z } from "zod";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const signupSchema = z.object({
    name : z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
});

export async function POST(req: NextRequest) {
    try{
        const body = await req.json();

        const validateData = signupSchema.parse(body);

        const existingUser = await prisma.user.findUnique({
            where: {
                email: validateData.email,
            },
        });

        if(existingUser){
            return NextResponse.json({
                success: false,
                message: "Email already exist"
            }, {status: 409})
        };

        const passwordHash = await bcrypt.hash(validateData.password, 12);

        const user = await prisma.user.create({
            data: {
                name: validateData.name,
                email: validateData.email,
                passwordHash,
            },
        });

        return NextResponse.json({
            success: true,
            message: "user created successfully",
            data: {
                id: user.id,
                name: user.name,
                email: user.email
            },
        }, {status: 201});

    }catch(error){
        if (error instanceof ZodError){
            return NextResponse.json({
                success: false,
                error: "Invalid inputs",
                details: error.issues
            }, {status: 400})
        }

        console.error("Signup error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}