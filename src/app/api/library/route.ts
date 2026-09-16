import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SESSION_TYPE_META } from "@/types";

export async function GET() {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessions = await db.librarySession.findMany({
        where:   { trainerId },
        orderBy: [{ type: "asc" }, { order: "asc" }],
    });

    return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { type, name, desc, planSets, rounds, referenceMovement } = body;

    if (!type || !name) {
        return NextResponse.json({ error: "type, name required" }, { status: 400 });
    }
    if (!(type in SESSION_TYPE_META)) {
        return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
    }

    const existingCount = await db.librarySession.count({ where: { trainerId, type } });

    const librarySession = await db.librarySession.create({
        data: {
            trainerId,
            type, name,
            desc:              desc ?? null,
            planSets:          planSets ?? null,
            rounds:            rounds ?? null,
            referenceMovement: referenceMovement ?? null,
            order:             existingCount,
        },
    });

    return NextResponse.json({ session: librarySession }, { status: 201 });
}
