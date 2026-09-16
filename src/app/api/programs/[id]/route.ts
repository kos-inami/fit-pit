import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram } from "@/lib/trainerAuth";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft:     ["published", "archived"],
    published: ["archived"],
    archived:  [],
};

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const owned = await getOwnedProgram(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const program = await db.program.findUnique({
        where:   { id },
        include: {
            weeks: {
                include: {
                    days: {
                        include: { sessions: { orderBy: { order: "asc" } } },
                        orderBy: { dayIndex: "asc" },
                    },
                },
                orderBy: { weekNumber: "asc" },
            },
        },
    });

    return NextResponse.json({ program });
}

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
    const owned = await getOwnedProgram(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, accessMode, status } = body;

    if (status !== undefined) {
        const allowed = ALLOWED_TRANSITIONS[owned.status] ?? [];
        if (!allowed.includes(status)) {
            return NextResponse.json(
                { error: `Cannot transition from ${owned.status} to ${status}` },
                { status: 400 }
            );
        }
    }

    const program = await db.program.update({
        where: { id },
        data: {
            ...(name        !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(accessMode  !== undefined && { accessMode: accessMode === "open" ? "open" : "assigned" }),
            ...(status      !== undefined && { status }),
        },
    });

    return NextResponse.json({ program });
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
    const owned = await getOwnedProgram(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const assignmentCount = await db.programAssignment.count({ where: { programId: id } });
    if (assignmentCount > 0) {
        return NextResponse.json(
            { error: "Cannot delete a program that has been assigned or enrolled in — archive it instead." },
            { status: 409 }
        );
    }

    await db.$transaction(async (tx) => {
        await tx.programSession.deleteMany({ where: { day: { week: { programId: id } } } });
        await tx.programDay.deleteMany({ where: { week: { programId: id } } });
        await tx.programWeek.deleteMany({ where: { programId: id } });
        await tx.program.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
}
