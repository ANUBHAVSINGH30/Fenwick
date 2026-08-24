import { NextRequest } from "next/server";
import redis from "./redis";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

export async function getCUrrentUser(req: NextRequest) {
    const sessionId = req.cookies.get("sessionId")?.value;

    if(!sessionId){
        return null;
    }

    const userId = await redis.get(`session:${sessionId}`);

    if(!userId){
        return null;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });

    return user;
}

