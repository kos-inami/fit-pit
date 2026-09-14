import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveClientLink } from "@/lib/trainerAuth";

export async function GET(
    _req: Request,
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
        select: {
            id: true, name: true, email: true,
            shareBodyStats: true, weight: true, height: true, age: true,
        },
    });
    if (!trainee) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
        client: {
            id:        trainee.id,
            name:      trainee.name,
            email:     trainee.email,
            startedAt: link.startedAt,
            weight:    trainee.shareBodyStats ? trainee.weight : null,
            height:    trainee.shareBodyStats ? trainee.height : null,
            age:       trainee.shareBodyStats ? trainee.age    : null,
        },
    });
}
