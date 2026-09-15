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
