import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getOwnedProgramWeek } from "@/lib/trainerAuth";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; weekId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, weekId } = await params;
    const owned = await getOwnedProgram(trainerId, programId);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    const week = await getOwnedProgramWeek(programId, weekId);
    if (!week) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
        await tx.programSession.deleteMany({ where: { day: { weekId } } });
        await tx.programDay.deleteMany({ where: { weekId } });
        await tx.programWeek.delete({ where: { id: weekId } });

        // renumber later weeks to stay contiguous — one at a time, ascending,
        // so each target weekNumber is vacated before the next update needs it
        // (a single batch decrement risks a transient @@unique([programId, weekNumber]) conflict)
        const laterWeeks = await tx.programWeek.findMany({
            where:   { programId, weekNumber: { gt: week.weekNumber } },
            orderBy: { weekNumber: "asc" },
        });
        for (const w of laterWeeks) {
            await tx.programWeek.update({
                where: { id: w.id },
                data:  { weekNumber: w.weekNumber - 1 },
            });
        }

        // clamp any assignment whose week range now exceeds the program's length
        const newMaxWeek = await tx.programWeek.count({ where: { programId } });
        const assignments = await tx.programAssignment.findMany({ where: { programId } });
        for (const a of assignments) {
            const clampedStart = Math.max(1, Math.min(a.startWeek, newMaxWeek));
            const clampedEnd   = a.endWeek !== null ? Math.min(a.endWeek, newMaxWeek) : null;
            if (clampedStart !== a.startWeek || clampedEnd !== a.endWeek) {
                await tx.programAssignment.update({
                    where: { id: a.id },
                    data:  { startWeek: clampedStart, endWeek: clampedEnd },
                });
            }
        }
    }, { timeout: 15000 });

    return NextResponse.json({ success: true });
}
