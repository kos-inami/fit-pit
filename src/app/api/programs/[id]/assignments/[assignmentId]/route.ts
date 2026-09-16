import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

type DbClient = typeof db | Prisma.TransactionClient;

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

async function loadOwnedAssignment(programId: string, assignmentId: string, trainerId: string) {
    const assignment = await db.programAssignment.findUnique({
        where:   { id: assignmentId },
        include: { program: true },
    });
    if (!assignment || assignment.programId !== programId) {
        return { error: "Not found" as const, status: 404 };
    }
    if (assignment.program.trainerId !== trainerId) {
        return { error: "Not authorized" as const, status: 403 };
    }
    return { assignment };
}

/** Future sessions with no logged result — the same set the existing "cancel" action deletes. */
async function findUnloggedFutureSessions(client: DbClient, assignmentId: string) {
    const today = getTodayString();
    const futureSessions = await client.session.findMany({
        where:   { assignmentId, day: { date: { gt: today } } },
        include: { sets: { select: { id: true } } },
    });
    return futureSessions.filter(s => !hasLoggedResult(s));
}

/**
 * GET returns a preview count for the confirmation dialog, with zero writes:
 * how many future/unlogged sessions would be deleted, and how many other
 * sessions (past ones, plus future ones with a logged result) would instead
 * be kept — frozen by nulling their assignmentId.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, assignmentId } = await params;
    const owned = await loadOwnedAssignment(programId, assignmentId, trainerId);
    if ("error" in owned) {
        return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    const toDelete    = await findUnloggedFutureSessions(db, assignmentId);
    const totalCount  = await db.session.count({ where: { assignmentId } });

    return NextResponse.json({
        toDeleteCount: toDelete.length,
        toKeepCount:   totalCount - toDelete.length,
    });
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
    const owned = await loadOwnedAssignment(programId, assignmentId, trainerId);
    if ("error" in owned) {
        return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    const result = await db.$transaction(async (tx) => {
        const toDelete = await findUnloggedFutureSessions(tx, assignmentId);
        const toDeleteIds = toDelete.map(s => s.id);

        if (toDeleteIds.length > 0) {
            await tx.set.deleteMany({ where: { sessionId: { in: toDeleteIds } } });
            await tx.session.deleteMany({ where: { id: { in: toDeleteIds } } });
        }

        const kept = await tx.session.updateMany({
            where: { assignmentId, id: { notIn: toDeleteIds } },
            data:  { assignmentId: null },
        });

        await tx.programAssignment.updateMany({
            where: { previousAssignmentId: assignmentId },
            data:  { previousAssignmentId: null },
        });

        await tx.programAssignment.delete({ where: { id: assignmentId } });

        return { deletedSessions: toDeleteIds.length, keptSessions: kept.count };
    });

    return NextResponse.json({ success: true, ...result });
}
