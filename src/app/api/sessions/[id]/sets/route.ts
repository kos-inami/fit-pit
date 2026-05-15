import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sessions/[id]/sets
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const sets = await db.set.findMany({
      where: { sessionId },
      orderBy: { setNumber: "asc" },
    });
    return NextResponse.json({ sets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 });
  }
}

// POST /api/sessions/[id]/sets — replace all sets
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const body = await req.json();
  const { sets } = body; // array of {setNumber, weight, reps, notes}

  if (!sets || !Array.isArray(sets)) {
    return NextResponse.json({ error: "sets array required" }, { status: 400 });
  }

  try {
    // delete existing sets
    await db.set.deleteMany({ where: { sessionId } });

    // create new sets
    const created = await db.set.createMany({
      data: sets.map((s: {
        setNumber: number;
        weight:    number | null;
        reps:      number | null;
        notes:     string;
      }) => ({
        sessionId,
        setNumber: s.setNumber,
        weight:    s.weight  ?? null,
        reps:      s.reps    ?? null,
        notes:     s.notes   ?? "",
      })),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save sets" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/sets?setId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const setId = searchParams.get("setId");

  if (!setId) {
    return NextResponse.json({ error: "setId required" }, { status: 400 });
  }

  try {
    await db.set.delete({ where: { id: setId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete set" }, { status: 500 });
  }
}