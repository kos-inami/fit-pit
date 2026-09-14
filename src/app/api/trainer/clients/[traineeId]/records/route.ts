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

    const records = await db.maxRecord.findMany({
        where:   { userId: traineeId },
        orderBy: { date: "desc" },
    });

    return NextResponse.json({ records });
}
