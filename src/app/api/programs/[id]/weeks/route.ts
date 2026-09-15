import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram } from "@/lib/trainerAuth";
import { buildMaxRecordMap, generateForWeekRange } from "@/lib/programGeneration";

export async function POST(
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

    const result = await db.$transaction(async (tx) => {
        const last = await tx.programWeek.findFirst({
            where:   { programId },
            orderBy: { weekNumber: "desc" },
        });
        const weekNumber = (last?.weekNumber ?? 0) + 1;

        const week = await tx.programWeek.create({
            data: {
                programId,
                weekNumber,
                days: {
                    create: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i + 1 })),
                },
            },
        });

        let generatedCount = 0;
        if (owned.status === "published") {
            const openEndedAssignments = await tx.programAssignment.findMany({
                where: { programId, status: "active", endWeek: null },
            });
            for (const assignment of openEndedAssignments) {
                const maxRecordMap = await buildMaxRecordMap(tx, assignment.traineeId);
                generatedCount += await generateForWeekRange({
                    tx,
                    programId,
                    trainerId,
                    traineeId:    assignment.traineeId,
                    assignmentId: assignment.id,
                    startDate:    assignment.startDate,
                    startWeek:    assignment.startWeek,
                    fromWeek:     weekNumber,
                    toWeek:       weekNumber,
                    maxRecordMap,
                });
            }
        }

        return { week, generatedCount };
    }, { timeout: 15000 });

    return NextResponse.json(result, { status: 201 });
}
