import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId   = searchParams.get("userId");
  const movement = searchParams.get("movement");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const records = await db.maxRecord.findMany({
      where: {
        userId,
        ...(movement ? { movement } : {}),
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ records });
  } catch {
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    userId, movement, category, details,
    weight, reps, distance, timeSeconds, notes, date,
  } = body;

  if (!userId || !movement || !category) {
    return NextResponse.json(
      { error: "userId, movement, category required" },
      { status: 400 }
    );
  }

  try {
    const record = await db.maxRecord.create({
      data: {
        userId, movement, category,
        details:     details     ?? null,
        weight:      weight      ?? null,
        reps:        reps        ?? null,
        distance:    distance    ?? null,
        timeSeconds: timeSeconds ?? null,
        notes:       notes       ?? "",
        date:        date        ?? new Date().toISOString().split("T")[0],
      },
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { recordId, ...data } = body;

  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  try {
    const record = await db.maxRecord.update({
      where: { id: recordId },
      data,
    });
    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId");

  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  try {
    await db.maxRecord.delete({ where: { id: recordId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}