import { NextResponse, NextRequest } from "next/server";
import { getCUrrentUser } from "../../../../../lib/auth";

export async function GET(req: NextRequest) {
    try{
        const user = await getCUrrentUser(req);

        if(!user){
            return NextResponse.json({
                success: false,
                error: "Unauthorized"
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email
            },
        }, {status: 200})

    }catch(error){
        console.error("Get current user error", error);

        return NextResponse.json({
            success: false,
            error: "Internal server error",
        }, {status: 500})
    }
}