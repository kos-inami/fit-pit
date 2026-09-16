import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedLibrarySession } from "@/lib/trainerAuth";

export async function POST(
    _req: Request,
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

    const existingCount = await db.librarySession.count({ where: { trainerId, type: owned.type } });

    const copy = await db.librarySession.create({
        data: {
            trainerId,
            type:              owned.type,
            name:              `${owned.name} (copy)`,
            desc:              owned.desc,
            planSets:          owned.planSets,
            rounds:            owned.rounds,
            referenceMovement: owned.referenceMovement,
            order:             existingCount,
        },
    });

    return NextResponse.json({ session: copy }, { status: 201 });
}
