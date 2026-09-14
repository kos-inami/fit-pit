import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    const traineeId = session?.user?.id;
    if (!traineeId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const code = (body.code as string | undefined)?.trim().toUpperCase();
    if (!code) {
        return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    const trainer = await db.user.findUnique({ where: { inviteCode: code } });
    if (!trainer || !trainer.roles.includes("trainer")) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
    }
    if (trainer.id === traineeId) {
        return NextResponse.json({ error: "You can't connect to yourself" }, { status: 400 });
    }

    const existing = await db.trainerClient.findFirst({
        where: { traineeId, status: { in: ["pending", "active"] } },
    });
    if (existing) {
        return NextResponse.json(
            { error: "You already have a pending or active trainer connection" },
            { status: 409 }
        );
    }

    const relation = await db.trainerClient.upsert({
        where:  { trainerId_traineeId: { trainerId: trainer.id, traineeId } },
        create: { trainerId: trainer.id, traineeId, status: "pending" },
        update: { status: "pending", endedAt: null, createdAt: new Date() },
    });

    return NextResponse.json({ relation });
}
