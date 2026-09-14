import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const traineeId = session?.user?.id;
    if (!traineeId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const relation = await db.trainerClient.findFirst({
        where:   { traineeId, status: { in: ["pending", "active"] } },
        include: { trainer: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ relation });
}
