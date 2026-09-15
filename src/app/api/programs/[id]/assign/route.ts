import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getActiveClientLink } from "@/lib/trainerAuth";
import { buildMaxRecordMap, generateForWeekRange } from "@/lib/programGeneration";

const MAX_WEEKS_PER_ACTION = 26;

export async function POST(
    req: NextRequest,
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
    if (owned.status !== "published") {
        return NextResponse.json({ error: "Program must be published to assign" }, { status: 400 });
    }

    const body = await req.json();
    const traineeId = body.traineeId as string | undefined;
    const startDate = body.startDate as string | undefined;
    const startWeek = body.startWeek ? parseInt(body.startWeek) : 1;
    const endWeek    = body.endWeek ? parseInt(body.endWeek) : null;

    if (!traineeId || !startDate) {
        return NextResponse.json({ error: "traineeId, startDate required" }, { status: 400 });
    }

    const link = await getActiveClientLink(trainerId, traineeId);
    if (!link) {
        return NextResponse.json({ error: "No active trainer-client link" }, { status: 403 });
    }

    const lastWeek = await db.programWeek.findFirst({
        where:   { programId },
        orderBy: { weekNumber: "desc" },
    });
    const maxProgramWeek = lastWeek?.weekNumber ?? 0;
    const effectiveEndWeek = endWeek ?? maxProgramWeek;

    if (effectiveEndWeek < startWeek) {
        return NextResponse.json({ error: "endWeek must be >= startWeek" }, { status: 400 });
    }
    if (effectiveEndWeek - startWeek + 1 > MAX_WEEKS_PER_ACTION) {
        return NextResponse.json(
            { error: `Cannot generate more than ${MAX_WEEKS_PER_ACTION} weeks in a single action — assign in parts or extend by appending.` },
            { status: 400 }
        );
    }

    const previous = await db.programAssignment.findFirst({
        where:   { programId, traineeId },
        orderBy: { assignedAt: "desc" },
    });

    const result = await db.$transaction(async (tx) => {
        const assignment = await tx.programAssignment.create({
            data: {
                programId,
                traineeId,
                startDate,
                startWeek,
                endWeek,
                assignedById: trainerId,
                previousAssignmentId: previous?.id ?? null,
            },
        });

        const maxRecordMap = await buildMaxRecordMap(tx, traineeId);
        const generatedCount = await generateForWeekRange({
            tx,
            programId,
            trainerId,
            traineeId,
            assignmentId: assignment.id,
            startDate,
            startWeek,
            fromWeek: startWeek,
            toWeek:   effectiveEndWeek,
            maxRecordMap,
        });

        return { assignment, generatedCount };
    }, { timeout: 15000 });

    return NextResponse.json(result, { status: 201 });
}
