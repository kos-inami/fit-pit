import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { dayId, energy, sore, soreOther, sleepHours, sleepQuality, notes } = body;

    if (!dayId) {
        return NextResponse.json({ error: "dayId required" }, { status: 400 });
    }

    const authSession = await auth();
    if (!authSession?.user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const day = await db.day.findUnique({ where: { id: dayId } });
    if (!day) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (day.userId !== authSession.user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    try {
        const recovery = await db.recovery.upsert({
        where:  { dayId },
        create: {
            dayId,
            energy:       energy       ?? 3,
            sore:         sore         ?? "[]",
            soreOther:    soreOther    ?? "",
            sleepHours:   sleepHours   ?? null,
            sleepQuality: sleepQuality ?? null,
            notes:        notes        ?? "",
        },
        update: {
            energy:       energy       ?? 3,
            sore:         sore         ?? "[]",
            soreOther:    soreOther    ?? "",
            sleepHours:   sleepHours   ?? null,
            sleepQuality: sleepQuality ?? null,
            notes:        notes        ?? "",
        },
        });
        return NextResponse.json({ recovery });
    } catch {
        return NextResponse.json({ error: "Failed to save recovery" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const dayId = searchParams.get("dayId");

    if (!dayId) {
        return NextResponse.json({ error: "dayId required" }, { status: 400 });
    }

    const authSession = await auth();
    if (!authSession?.user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const day = await db.day.findUnique({ where: { id: dayId } });
    if (!day) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (day.userId !== authSession.user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    try {
        await db.recovery.delete({ where: { dayId } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete recovery" }, { status: 500 });
    }
}
