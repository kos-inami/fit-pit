import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveClientLink } from "@/lib/trainerAuth";
import { assignProgramToTrainee } from "@/lib/programGeneration";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const traineeId = session?.user?.id;
    if (!traineeId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId } = await params;
    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const link = await getActiveClientLink(program.trainerId, traineeId);
    if (!link) {
        return NextResponse.json({ error: "No active trainer-client link" }, { status: 403 });
    }
    if (program.status !== "published" || program.accessMode !== "open") {
        return NextResponse.json({ error: "Program is not open for self-enrolment" }, { status: 400 });
    }

    const body = await req.json();
    const startDate = body.startDate as string | undefined;
    const startWeek = body.startWeek ? parseInt(body.startWeek) : 1;
    const endWeek    = body.endWeek ? parseInt(body.endWeek) : null;

    if (!startDate) {
        return NextResponse.json({ error: "startDate required" }, { status: 400 });
    }

    const result = await assignProgramToTrainee({
        programId,
        trainerId: program.trainerId,
        traineeId,
        assignedById: traineeId,
        startDate,
        startWeek,
        endWeek,
    });

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ assignment: result.assignment, generatedCount: result.generatedCount }, { status: 201 });
}
