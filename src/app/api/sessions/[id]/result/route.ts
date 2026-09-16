import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const body = await req.json();
  const { result, notes, rounds, resultRounds, feeling, feelingComment } = body;

  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const target = await db.session.findUnique({
    where:   { id: sessionId },
    include: { day: { select: { userId: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.day.userId !== authSession.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const session = await db.session.update({
      where: { id: sessionId },
      data: {
        ...(result         !== undefined && { result         }),
        ...(notes          !== undefined && { notes          }),
        ...(rounds         !== undefined && { rounds         }),
        ...(resultRounds   !== undefined && { resultRounds   }),
        ...(feeling        !== undefined && { feeling        }),
        ...(feelingComment !== undefined && { feelingComment }),
      },
      include: { sets: true },
    });
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
  }
}
