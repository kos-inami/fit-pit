import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `You are an expert CrossFit and strength coach AI. You know this athlete's complete training history, max records, and recovery data. Give highly specific, personalised coaching advice.

Always include:
- For strength/weightlifting: exact weight recommendations in kg based on their max records and recent performance
- For WODs/conditioning: target time, pace, or round splits based on past results
- For running: target pace per km based on past run times
- For recovery advice: adjust intensity based on energy and soreness levels

Be direct and data-driven. 2-3 sentences max per session.

Always respond ONLY in valid JSON with no markdown:
{
  "summary": "overall coaching note for today",
  "perSession": {
    "0": "specific advice with exact weights or paces for session 1",
    "1": "specific advice for session 2"
  },
  "chips": ["short label 1", "short label 2", "short label 3"],
  "recoveryNote": "1 sentence on readiness"
}`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessions, userId } = body;

  if (!sessions?.length || !userId) {
    return NextResponse.json({ error: "sessions and userId required" }, { status: 400 });
  }

  // ── get user's Gemini key ──────────────────────────────
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { geminiKey: true },
  });

  if (!user?.geminiKey) {
    return NextResponse.json(
      { error: "No Gemini API key. Add yours in Account → AI Coaching." },
      { status: 402 }
    );
  }

  // ── fetch conversation history ─────────────────────────
  const history = await db.aIMessage.findMany({
    where:   { userId },
    orderBy: { createdAt: "asc" },
    take:    40,
  });

  // ── fetch past training data ───────────────────────────
  const today    = new Date().toISOString().split("T")[0];
  const pastDays = await db.day.findMany({
    where: { userId, date: { lt: today } },
    include: {
      sessions: {
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
      recovery: true,
    },
    orderBy: { date: "desc" },
    take:    14,
  });

  // ── fetch max records ──────────────────────────────────
  const maxRecords = await db.maxRecord.findMany({
    where:   { userId },
    orderBy: { date: "desc" },
  });

  // ── build max records context ──────────────────────────
  const maxRecordsText = maxRecords.length > 0
    ? maxRecords
        .reduce((acc: Record<string, number>, r) => {
          if (r.weight && (!acc[r.movement] || r.weight > acc[r.movement])) {
            acc[r.movement] = r.weight;
          }
          return acc;
        }, {} as Record<string, number>)
    : {};

  const maxRecordsStr = Object.entries(maxRecordsText)
    .map(([movement, weight]) => `${movement}: ${weight}kg`)
    .join(", ") || "No max records logged yet";

  // ── build training history ─────────────────────────────
  let historyText = "No past training data yet.";

  if (pastDays.length > 0) {
    historyText = pastDays.map(d => {
      const sessText = d.sessions.map(s => {
        if (s.sets.length > 0) {
          const setsStr = s.sets
            .map(set => `Set ${set.setNumber}: ${set.weight ?? "—"}kg × ${set.reps ?? "—"} reps`)
            .join(", ");
          return `${s.name} (${s.type}): ${setsStr}. Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
        }
        if (s.resultRounds) {
          try {
            const rounds = JSON.parse(s.resultRounds);
            const str = rounds
              .map((r: { roundNumber: number; details?: string; weight?: number; reps?: number; other?: string }) =>
                `Rd${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}${r.other ? ` ${r.other}` : ""}`)
              .join(", ");
            return `${s.name} (${s.type}): ${str}. Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
          } catch { /* fall through */ }
        }
        return `${s.name} (${s.type}): Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
      }).join(" | ");

      const rec = d.recovery
        ? `Energy ${d.recovery.energy}/5, Sleep: ${d.recovery.sleepHours ?? "?"}h (quality ${d.recovery.sleepQuality ?? "?"}/5), Sore: ${d.recovery.sore}`
        : "No recovery";

      return `[${d.date}] ${sessText || "Rest"} — Recovery: ${rec}`;
    }).join("\n");
  }

  // ── build today's sessions context ─────────────────────
  const todaySessionsText = sessions.map((s: {
    index: number; id?: string; type: string; name: string;
    desc?: string; planSets?: { setNumber: number; weight?: number | null; percentage?: number | null; reps?: number | null }[];
    rounds?: { roundNumber: number; details?: string; weight?: number | null; reps?: number | null; other?: string }[];
  }, i: number) => {
    let plan = s.desc ? `Description: ${s.desc}` : "";

    if (s.planSets?.length) {
      const setsStr = s.planSets.map(set =>
        set.percentage
          ? `Set ${set.setNumber}: ${set.percentage}% (≈${set.weight ?? "?"}kg) × ${set.reps ?? "?"} reps`
          : `Set ${set.setNumber}: ${set.weight ?? "?"}kg × ${set.reps ?? "?"} reps`
      ).join(", ");
      plan += ` Planned sets: ${setsStr}`;
    }

    if (s.rounds?.length) {
      const roundsStr = s.rounds.map(r =>
        `Rd${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}${r.other ? ` ${r.other}` : ""}`
      ).join(", ");
      plan += ` Planned rounds: ${roundsStr}`;
    }

    return `${i + 1}. ${s.name} (${s.type})${plan ? ` — ${plan.trim()}` : ""}`;
  }).join("\n");

  const newUserMessage = `MAX RECORDS:\n${maxRecordsStr}\n\nTRAINING HISTORY (last 14 days):\n${historyText}\n\nTODAY'S PLANNED SESSIONS:\n${todaySessionsText}\n\nProvide specific coaching advice with exact weight or pace recommendations where applicable.`;

  // ── call Gemini ────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(user.geminiKey.trim());
    const model = genAI.getGenerativeModel({
      model:             "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const chatHistory = history.map(m => ({
      role:  m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    const chat   = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(newUserMessage);
    const text   = result.response.text();

    // ── store messages ─────────────────────────────────
    await db.aIMessage.createMany({
      data: [
        { userId, role: "user",      content: newUserMessage },
        { userId, role: "assistant", content: text           },
      ],
    });

    // ── parse response ─────────────────────────────────
    const clean      = text.replace(/```json|```/g, "").trim();
    const suggestion = JSON.parse(clean);

    // ── save per-session aiNote to DB ──────────────────
    const perSession = suggestion.perSession ?? {};
    await Promise.all(
      sessions.map(async (s: { id?: string }, i: number) => {
        if (!s.id || !perSession[String(i)]) return;
        await db.session.update({
          where: { id: s.id },
          data:  { aiNote: perSession[String(i)] },
        });
      })
    );

    return NextResponse.json({ suggestion });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", msg);

    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Check Account → AI Coaching." },
        { status: 401 }
      );
    }
    if (msg.includes("quota") || msg.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}