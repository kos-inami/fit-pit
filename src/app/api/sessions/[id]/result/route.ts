import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const body = await req.json();
  const { result, notes, rounds, resultRounds } = body;

  try {
    const session = await db.session.update({
      where: { id: sessionId },
      data: {
        ...(result       !== undefined && { result       }),
        ...(notes        !== undefined && { notes        }),
        ...(rounds       !== undefined && { rounds       }),
        ...(resultRounds !== undefined && { resultRounds }),
      },
      include: { sets: true },
    });
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
  }
}