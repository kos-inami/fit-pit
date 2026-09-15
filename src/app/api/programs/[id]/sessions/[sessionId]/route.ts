import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram, getOwnedProgramSession } from "@/lib/trainerAuth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, sessionId } = await params;
    const owned = await getOwnedProgram(trainerId, programId);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!(await getOwnedProgramSession(programId, sessionId))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { type, name, desc, planSets, rounds, referenceMovement } = body;

    const programSession = await db.programSession.update({
        where: { id: sessionId },
        data: {
            ...(type              !== undefined && { type }),
            ...(name              !== undefined && { name }),
            ...(desc              !== undefined && { desc }),
            ...(planSets          !== undefined && { planSets }),
            ...(rounds            !== undefined && { rounds }),
            ...(referenceMovement !== undefined && { referenceMovement }),
        },
    });

    return NextResponse.json({ session: programSession });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: programId, sessionId } = await params;
    const owned = await getOwnedProgram(trainerId, programId);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!(await getOwnedProgramSession(programId, sessionId))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.programSession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true });
}
