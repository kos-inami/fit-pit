import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const q      = searchParams.get("q")?.trim()    ?? "";
    const type   = searchParams.get("type")?.trim() ?? "";

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!q && !type) {
        return NextResponse.json({ sessions: [] });
    }

    try {
        const sessions = await db.session.findMany({
        where: {
            day: { userId },
            ...(type ? { type } : {}),
            ...(q ? {
            OR: [
                { name:   { contains: q, mode: "insensitive" } },
                { desc:   { contains: q, mode: "insensitive" } },
                { result: { contains: q, mode: "insensitive" } },
                { notes:  { contains: q, mode: "insensitive" } },
            ],
            } : {}),
        },
        include: {
            day:  { select: { date: true } },
            sets: { orderBy: { setNumber: "asc" }},
        },
        orderBy: { day: { date: "desc" } },
        take: 50,
        });

        return NextResponse.json({ sessions });
    } catch {
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}