import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const programs = await db.program.findMany({
        where:   { trainerId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ programs });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name as string | undefined)?.trim();
    if (!name) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const program = await db.program.create({
        data: {
            trainerId,
            name,
            description: body.description ?? null,
            accessMode:  body.accessMode === "open" ? "open" : "assigned",
        },
    });

    return NextResponse.json({ program }, { status: 201 });
}
