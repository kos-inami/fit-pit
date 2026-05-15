import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const date   = searchParams.get("date") || getTodayString();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const day = await db.day.findUnique({
      where: { userId_date: { userId, date } },
      include: {
        sessions: {
          include: { sets: { orderBy: { setNumber: "asc" } } },
          orderBy: { order: "asc" },
        },
        recovery:     true,
        aiSuggestion: true,
      },
    });
    return NextResponse.json({ day });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, date, type, name, desc, order } = body;

  if (!userId || !type || !name) {
    return NextResponse.json({ error: "userId, type, name required" }, { status: 400 });
  }

  const sessionDate = date || getTodayString();

  try {
    const day = await db.day.upsert({
      where:  { userId_date: { userId, date: sessionDate } },
      create: { userId, date: sessionDate },
      update: {},
    });

    const session = await db.session.create({
      data: {
        dayId: day.id,
        type, name,
        desc:  desc  || "",
        order: order || 0,
      },
      include: { sets: true },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { sessionId, name, desc, rounds, planSets } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const session = await db.session.update({
      where: { id: sessionId },
      data: {
        ...(name     !== undefined && { name     }),
        ...(desc     !== undefined && { desc     }),
        ...(rounds   !== undefined && { rounds   }),
        ...(planSets !== undefined && { planSets }),
      },
    });
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    await db.set.deleteMany({ where: { sessionId } });
    await db.session.delete({ where: { id: sessionId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}