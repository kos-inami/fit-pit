import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

function hasLoggedResult(s: {
    isRestDay: boolean; result: string | null; notes: string | null;
    type: string; resultRounds: string | null; sets: { id: string }[];
}): boolean {
    if (s.isRestDay) return !!s.notes && s.notes.trim() !== "";
    if (s.result && s.result.trim() !== "") return true;
    if (s.sets.length > 0) return true;
    if (s.type === "wod" || s.type === "zone") {
        const rounds = s.resultRounds ? JSON.parse(s.resultRounds) : [];
        if (rounds.length > 0) return true;
    }
    return false;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, assignmentId } = await params;
    const body = await req.json();
    const action = body.action as "complete" | "cancel" | undefined;
    if (!action || !["complete", "cancel"].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const assignment = await db.programAssignment.findUnique({
        where:   { id: assignmentId },
        include: { program: true },
    });
    if (!assignment || assignment.programId !== programId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isTrainer = assignment.program.trainerId === userId;
    const isTrainee = assignment.traineeId === userId;
    if (!isTrainer && !isTrainee) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (assignment.status !== "active") {
        return NextResponse.json({ error: "Assignment is not active" }, { status: 409 });
    }

    if (action === "complete") {
        const updated = await db.programAssignment.update({
            where: { id: assignmentId },
            data:  { status: "completed", completedById: userId, completedAt: new Date() },
        });
        return NextResponse.json({ assignment: updated });
    }

    // cancel
    const today = getTodayString();
    const futureSessions = await db.session.findMany({
        where: { assignmentId, day: { date: { gt: today } } },
        include: { sets: { select: { id: true } } },
    });
    const toDelete = futureSessions.filter(s => !hasLoggedResult(s));
    const toDeleteIds = toDelete.map(s => s.id);

    const updated = await db.$transaction(async (tx) => {
        if (toDeleteIds.length > 0) {
            await tx.set.deleteMany({ where: { sessionId: { in: toDeleteIds } } });
            await tx.session.deleteMany({ where: { id: { in: toDeleteIds } } });
        }
        return tx.programAssignment.update({
            where: { id: assignmentId },
            data:  { status: "cancelled" },
        });
    });

    return NextResponse.json({ assignment: updated, deletedSessions: toDeleteIds.length });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, assignmentId } = await params;
    const assignment = await db.programAssignment.findUnique({
        where:   { id: assignmentId },
        include: { program: true },
    });
    if (!assignment || assignment.programId !== programId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (assignment.program.trainerId !== trainerId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (assignment.status === "active") {
        return NextResponse.json({ error: "Cancel or complete it first" }, { status: 409 });
    }

    const sessionCount = await db.session.count({ where: { assignmentId } });
    if (sessionCount > 0) {
        return NextResponse.json({ error: "Sessions still reference this assignment" }, { status: 409 });
    }

    const laterRunCount = await db.programAssignment.count({ where: { previousAssignmentId: assignmentId } });
    if (laterRunCount > 0) {
        return NextResponse.json({ error: "A later re-run is linked to this as its previous assignment" }, { status: 409 });
    }

    await db.programAssignment.delete({ where: { id: assignmentId } });
    return NextResponse.json({ success: true });
}
