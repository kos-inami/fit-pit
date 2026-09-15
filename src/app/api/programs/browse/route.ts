import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const traineeId = session?.user?.id;
    if (!traineeId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const link = await db.trainerClient.findFirst({
        where: { traineeId, status: "active" },
    });
    if (!link) {
        return NextResponse.json({ programs: [] });
    }

    const programs = await db.program.findMany({
        where:   { trainerId: link.trainerId, status: "published", accessMode: "open" },
        select:  { id: true, name: true, description: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ programs });
}
