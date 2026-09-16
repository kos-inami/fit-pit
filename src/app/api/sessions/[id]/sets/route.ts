import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function verifySessionOwner(sessionId: string, callerId: string) {
  const target = await db.session.findUnique({
    where:   { id: sessionId },
    include: { day: { select: { userId: true } } },
  });
  if (!target) return { ok: false as const, status: 404, error: "Not found" };
  if (target.day.userId !== callerId) return { ok: false as const, status: 403, error: "Not authorized" };
  return { ok: true as const };
}

// GET /api/sessions/[id]/sets
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const check = await verifySessionOwner(sessionId, authSession.user.id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

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

  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const check = await verifySessionOwner(sessionId, authSession.user.id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
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

  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const target = await db.set.findUnique({
    where:   { id: setId },
    include: { session: { select: { day: { select: { userId: true } } } } },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.session.day.userId !== authSession.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    await db.set.delete({ where: { id: setId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete set" }, { status: 500 });
  }
}
