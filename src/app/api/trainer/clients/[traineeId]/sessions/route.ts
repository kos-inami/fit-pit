import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveClientLink } from "@/lib/trainerAuth";
import { getTodayString } from "@/lib/utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ traineeId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { traineeId } = await params;
    const link = await getActiveClientLink(trainerId, traineeId);
    if (!link) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const trainee = await db.user.findUnique({
        where:  { id: traineeId },
        select: { shareRecovery: true, shareFeeling: true },
    });
    if (!trainee) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || getTodayString();

    const day = await db.day.findUnique({
        where:   { userId_date: { userId: traineeId, date } },
        include: {
            sessions: {
                include: { sets: { orderBy: { setNumber: "asc" } } },
                orderBy: { order: "asc" },
            },
            recovery: true,
        },
    });

    if (day && !trainee.shareRecovery) {
        day.recovery = null;
    }
    if (day && !trainee.shareFeeling) {
        day.postWorkoutFeeling = null;
        day.postWorkoutComment = null;
    }

    return NextResponse.json({ day });
}
