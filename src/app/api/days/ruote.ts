import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
    const { userId, date, postWorkoutFeeling, postWorkoutComment } = await req.json();

    if (!userId || !date) {
        return NextResponse.json({ error: "userId and date required" }, { status: 400 });
    }

    try {
        const existing = await db.day.findFirst({ where: { date, userId } });

        const data: { postWorkoutFeeling?: string | null; postWorkoutComment?: string | null } = {};
        if (postWorkoutFeeling  !== undefined) data.postWorkoutFeeling  = postWorkoutFeeling;
        if (postWorkoutComment  !== undefined) data.postWorkoutComment  = postWorkoutComment;

        if (existing) {
        await db.day.update({ where: { id: existing.id }, data });
        } else {
        await db.day.create({ data: { date, userId, ...data } });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}