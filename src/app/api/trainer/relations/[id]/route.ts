import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as "approve" | "decline" | "end" | undefined;
    if (!action || !["approve", "decline", "end"].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const relation = await db.trainerClient.findUnique({ where: { id } });
    if (!relation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "approve" || action === "decline") {
        if (relation.trainerId !== userId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
        if (relation.status !== "pending") {
            return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });
        }

        if (action === "decline") {
            const updated = await db.trainerClient.update({
                where: { id },
                data:  { status: "ended", endedAt: new Date() },
            });
            return NextResponse.json({ relation: updated });
        }

        // approve — re-check the trainee hasn't gained a different active trainer meanwhile
        const activeElsewhere = await db.trainerClient.findFirst({
            where: { traineeId: relation.traineeId, status: "active", id: { not: id } },
        });
        if (activeElsewhere) {
            return NextResponse.json(
                { error: "Trainee already has an active trainer" },
                { status: 409 }
            );
        }

        const updated = await db.trainerClient.update({
            where: { id },
            data:  { status: "active", startedAt: new Date() },
        });
        await notify(relation.traineeId, "connection_accepted", relation.id);
        return NextResponse.json({ relation: updated });
    }

    // end — either side
    if (relation.trainerId !== userId && relation.traineeId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (relation.status === "ended") {
        return NextResponse.json({ relation });
    }
    const updated = await db.trainerClient.update({
        where: { id },
        data:  { status: "ended", endedAt: new Date() },
    });
    return NextResponse.json({ relation: updated });
}
