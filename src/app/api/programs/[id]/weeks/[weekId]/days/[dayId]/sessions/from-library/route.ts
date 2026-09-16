import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getOwnedProgramDay, getOwnedLibrarySession } from "@/lib/trainerAuth";

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
    const librarySessionId = body.librarySessionId as string | undefined;
    if (!librarySessionId) {
        return NextResponse.json({ error: "librarySessionId required" }, { status: 400 });
    }

    const library = await getOwnedLibrarySession(trainerId, librarySessionId);
    if (!library) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingCount = await db.programSession.count({ where: { dayId } });

    const programSession = await db.programSession.create({
        data: {
            dayId,
            type:              library.type,
            name:              library.name,
            desc:              library.desc,
            planSets:          library.planSets,
            rounds:            library.rounds,
            referenceMovement: library.referenceMovement,
            order:             existingCount,
        },
    });

    return NextResponse.json({ session: programSession }, { status: 201 });
}
