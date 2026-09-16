import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveClientLink } from "@/lib/trainerAuth";

interface ComparisonSession {
    id:           string;
    name:         string;
    type:         string;
    result:       string | null;
    resultRounds: string | null;
    planSets:     string | null;
    sets:         { id: string; setNumber: number; weight: number | null; reps: number | null; notes: string | null }[];
    date:         string;
}

function groupByName(sessions: ComparisonSession[]): Map<string, ComparisonSession[]> {
    const map = new Map<string, ComparisonSession[]>();
    for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
        const arr = map.get(s.name);
        if (arr) arr.push(s); else map.set(s.name, [s]);
    }
    return map;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const callerId = session?.user?.id;
    if (!callerId) {
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
    if (!assignment.previousAssignmentId) {
        return NextResponse.json({ error: "No previous run to compare against" }, { status: 400 });
    }

    const isTrainer = assignment.program.trainerId === callerId;
    const isTrainee = assignment.traineeId === callerId;
    if (isTrainer) {
        const link = await getActiveClientLink(callerId, assignment.traineeId);
        if (!link) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
    } else if (!isTrainee) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const fetchSessions = async (assignmentId: string): Promise<ComparisonSession[]> => {
        const rows = await db.session.findMany({
            where:   { assignmentId, isRestDay: false },
            include: { sets: { orderBy: { setNumber: "asc" } }, day: { select: { date: true } } },
        });
        return rows.map(r => ({
            id: r.id, name: r.name, type: r.type,
            result: r.result, resultRounds: r.resultRounds, planSets: r.planSets,
            sets: r.sets, date: r.day.date,
        }));
    };

    const [currentSessions, previousSessions] = await Promise.all([
        fetchSessions(assignment.id),
        fetchSessions(assignment.previousAssignmentId),
    ]);

    const currentByName  = groupByName(currentSessions);
    const previousByName = groupByName(previousSessions);

    const pairs: { name: string; current: ComparisonSession; previous: ComparisonSession }[] = [];
    const unmatchedCurrent: ComparisonSession[]  = [];
    const unmatchedPrevious: ComparisonSession[] = [];

    const names = new Set([...currentByName.keys(), ...previousByName.keys()]);
    for (const name of names) {
        const curr = currentByName.get(name)  ?? [];
        const prev = previousByName.get(name) ?? [];
        const pairCount = Math.min(curr.length, prev.length);
        for (let i = 0; i < pairCount; i++) {
            pairs.push({ name, current: curr[i], previous: prev[i] });
        }
        unmatchedCurrent.push(...curr.slice(pairCount));
        unmatchedPrevious.push(...prev.slice(pairCount));
    }

    return NextResponse.json({ pairs, unmatchedCurrent, unmatchedPrevious });
}
