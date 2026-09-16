import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnedLibrarySession, getActiveClientLink } from "@/lib/trainerAuth";
import { generateLibrarySessionForTrainee } from "@/lib/programGeneration";

export async function POST(
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
    const traineeId = body.traineeId as string | undefined;
    const date = body.date as string | undefined;
    if (!traineeId || !date) {
        return NextResponse.json({ error: "traineeId, date required" }, { status: 400 });
    }

    const link = await getActiveClientLink(trainerId, traineeId);
    if (!link) {
        return NextResponse.json({ error: "No active trainer-client link" }, { status: 403 });
    }

    const generatedSession = await generateLibrarySessionForTrainee({
        trainerId, traineeId, date,
        library: {
            type:              owned.type,
            name:              owned.name,
            desc:              owned.desc,
            planSets:          owned.planSets,
            rounds:            owned.rounds,
            referenceMovement: owned.referenceMovement,
        },
    });

    return NextResponse.json({ session: generatedSession }, { status: 201 });
}
