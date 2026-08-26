import { NextRequest, NextResponse } from "next/server";
import redis from "../../../../../lib/redis";

export async function POST(req: NextRequest) {
    try{
        const sessionId = req.cookies.get("sessionId")?.value;

        if(sessionId){
            await redis.del(`session:${sessionId}`);
        }

        const response = NextResponse.json({
            success: true,
            message: "Logout successfull"
        }, {status: 200})

        response.cookies.delete("sessionId");

        return response;

    }catch(error){
        console.error("Logout error", error);

        return NextResponse.json({
            success: false,
            error: "Internal server error"
        }, {status: 500});
    }
}