import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getOwnedProgramDay } from "@/lib/trainerAuth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; dayId: string }> }
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
    const sessionIds = body.sessionIds as string[] | undefined;
    if (!Array.isArray(sessionIds)) {
        return NextResponse.json({ error: "sessionIds required" }, { status: 400 });
    }

    await db.$transaction(
        sessionIds.map((id, order) =>
            db.programSession.update({
                where: { id, dayId },
                data:  { order },
            })
        )
    );

    return NextResponse.json({ success: true });
}
