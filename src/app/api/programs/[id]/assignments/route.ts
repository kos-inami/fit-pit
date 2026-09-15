import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram } from "@/lib/trainerAuth";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId } = await params;
    const owned = await getOwnedProgram(trainerId, programId);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const assignments = await db.programAssignment.findMany({
        where:   { programId },
        include: { trainee: { select: { id: true, name: true } } },
        orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({ assignments });
}
