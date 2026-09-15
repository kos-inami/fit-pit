import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProgram } from "@/lib/trainerAuth";

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
    const owned = await getOwnedProgram(trainerId, id);
    if (!owned) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const original = await db.program.findUnique({
        where:   { id },
        include: {
            weeks: {
                include: { days: { include: { sessions: true }, orderBy: { dayIndex: "asc" } } },
                orderBy: { weekNumber: "asc" },
            },
        },
    });
    if (!original) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const clone = await db.program.create({
        data: {
            trainerId,
            name:        `${original.name} (Copy)`,
            description: original.description,
            accessMode:  original.accessMode,
            status:      "draft",
            weeks: {
                create: original.weeks.map(week => ({
                    weekNumber: week.weekNumber,
                    days: {
                        create: week.days.map(day => ({
                            dayIndex:  day.dayIndex,
                            isRestDay: day.isRestDay,
                            sessions: {
                                create: day.sessions.map(s => ({
                                    type:              s.type,
                                    name:              s.name,
                                    desc:              s.desc,
                                    planSets:          s.planSets,
                                    rounds:            s.rounds,
                                    referenceMovement: s.referenceMovement,
                                    order:             s.order,
                                })),
                            },
                        })),
                    },
                })),
            },
        },
    });

    return NextResponse.json({ program: clone }, { status: 201 });
}
