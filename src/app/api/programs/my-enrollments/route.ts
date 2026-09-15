import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const traineeId = session?.user?.id;
    if (!traineeId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const assignments = await db.programAssignment.findMany({
        where:   { traineeId },
        include: { program: { select: { id: true, name: true, trainerId: true } } },
        orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({ assignments });
}
