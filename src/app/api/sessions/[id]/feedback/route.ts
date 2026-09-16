import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveClientLink } from "@/lib/trainerAuth";
import { notify } from "@/lib/notify";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const trainerId = session?.user?.id;
    if (!trainerId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = (await req.json()).body as string | undefined;
    if (!body || !body.trim()) {
        return NextResponse.json({ error: "body required" }, { status: 400 });
    }

    const target = await db.session.findUnique({
        where:   { id: sessionId },
        include: { day: { select: { userId: true } }, feedback: true },
    });
    if (!target) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const traineeId = target.day.userId;
    const link = await getActiveClientLink(trainerId, traineeId);
    if (!link) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (target.feedback && target.feedback.trainerId !== trainerId) {
        return NextResponse.json({ error: "Feedback already exists from a different trainer" }, { status: 409 });
    }

    const isNew = !target.feedback;
    const feedback = await db.sessionFeedback.upsert({
        where:  { sessionId },
        create: { sessionId, trainerId, body: body.trim() },
        update: { body: body.trim() },
    });

    if (isNew) {
        await notify(traineeId, "feedback", sessionId);
    }

    return NextResponse.json({ feedback });
}
