import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const relations = await db.trainerClient.findMany({
        where:   { trainerId },
        include: { trainee: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
    });

    const clients = await Promise.all(relations.map(async (r) => {
        const lastDay = await db.day.findFirst({
            where:   { userId: r.traineeId },
            orderBy: { date: "desc" },
            select:  { date: true },
        });
        return {
            id:            r.id,
            status:        r.status,
            startedAt:     r.startedAt,
            endedAt:       r.endedAt,
            createdAt:     r.createdAt,
            trainee:       r.trainee,
            lastActivity:  lastDay?.date ?? null,
        };
    }));

    return NextResponse.json({ clients });
}
