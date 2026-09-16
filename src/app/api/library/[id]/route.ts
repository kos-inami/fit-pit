import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedLibrarySession } from "@/lib/trainerAuth";
import { SESSION_TYPE_META } from "@/types";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const owned = await getOwnedLibrarySession(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { type, name, desc, planSets, rounds, referenceMovement } = body;

    if (type !== undefined && !(type in SESSION_TYPE_META)) {
        return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
    }

    const librarySession = await db.librarySession.update({
        where: { id },
        data: {
            ...(type              !== undefined && { type }),
            ...(name              !== undefined && { name }),
            ...(desc              !== undefined && { desc }),
            ...(planSets          !== undefined && { planSets }),
            ...(rounds            !== undefined && { rounds }),
            ...(referenceMovement !== undefined && { referenceMovement }),
        },
    });

    return NextResponse.json({ session: librarySession });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const owned = await getOwnedLibrarySession(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.librarySession.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
