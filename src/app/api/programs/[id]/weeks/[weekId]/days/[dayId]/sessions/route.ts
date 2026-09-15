import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getOwnedProgramDay } from "@/lib/trainerAuth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; weekId: string; dayId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, dayId } = await params;
    const owned = await getOwnedProgram(trainerId, programId);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!(await getOwnedProgramDay(programId, dayId))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { type, name, desc, planSets, rounds, referenceMovement } = body;
    if (!type || !name) {
        return NextResponse.json({ error: "type, name required" }, { status: 400 });
    }

    const existingCount = await db.programSession.count({ where: { dayId } });

    const programSession = await db.programSession.create({
        data: {
            dayId,
            type, name,
            desc:              desc ?? null,
            planSets:          planSets ?? null,
            rounds:            rounds ?? null,
            referenceMovement: referenceMovement ?? null,
            order:             existingCount,
        },
    });

    return NextResponse.json({ session: programSession }, { status: 201 });
}
