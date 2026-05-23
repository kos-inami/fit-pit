import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `You are an expert CrossFit and strength coach AI. Give highly specific, personalised coaching advice based on today's sessions and recovery data. 

Always include:
- For strength/weightlifting: specific weight recommendations in kg
- For WODs/conditioning: target time or round splits
- For running: target pace per km

Be direct, 2-3 sentences per session. Reference recovery data when relevant.

Respond ONLY in valid JSON with no markdown:
{
  "summary": "brief overall note for today",
  "perSession": {
    "0": "specific advice for session 1",
    "1": "specific advice for session 2"
  },
  "chips": ["label 1", "label 2"],
  "recoveryNote": "1 sentence on readiness"
}`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessions, userId, recovery } = body;

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

  // ── fetch recent conversation history ─────────────────
  const rawHistory = await db.aIMessage.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    6, // last 3 exchanges only
  });

  const history = rawHistory.reverse().map(m => ({
    ...m,
    content: m.content.slice(0, 800), // cap each message
  }));

  // ── build today's context (compact) ───────────────────
  const recoveryText = recovery
    ? `Energy: ${recovery.energy}/5 | Sleep: ${recovery.sleepHours ?? "?"}h (quality ${recovery.sleepQuality ?? "?"}/5) | Sore: ${Array.isArray(recovery.sore) ? recovery.sore.join(", ") || "none" : "none"}${recovery.notes ? ` | Notes: ${recovery.notes}` : ""}`
    : "No recovery logged today";

  const sessionsText = sessions.map((s: {
    index:        number;
    id?:          string;
    type:         string;
    name:         string;
    desc?:        string;
    planSets?:    { setNumber: number; weight?: number | null; percentage?: number | null; reps?: number | null }[];
    rounds?:      { roundNumber: number; details?: string; weight?: number | null; reps?: number | null; other?: string }[];
    sets?:        { setNumber: number; weight?: number | null; reps?: number | null }[];
    resultRounds?: { roundNumber: number; details?: string; weight?: number | null; reps?: number | null; other?: string }[];
    result?:      string | null;
    notes?:       string | null;
  }, i: number) => {
    const parts: string[] = [`${i + 1}. ${s.name} (${s.type})`];

    if (s.desc) parts.push(`Plan: ${s.desc}`);

    if (s.planSets?.length) {
      const ps = s.planSets.map(set =>
        set.percentage
          ? `Set ${set.setNumber}: ${set.percentage}%→${set.weight ?? "?"}kg×${set.reps ?? "?"}`
          : `Set ${set.setNumber}: ${set.weight ?? "?"}kg×${set.reps ?? "?"}`
      ).join(", ");
      parts.push(`Planned: ${ps}`);
    }

    if (s.rounds?.length) {
      const rs = s.rounds.map(r =>
        `Rd${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}`
      ).join(", ");
      parts.push(`Planned rounds: ${rs}`);
    }

    if (s.sets?.length) {
      const rs = s.sets.map(set =>
        `Set ${set.setNumber}: ${set.weight ?? "?"}kg×${set.reps ?? "?"}`
      ).join(", ");
      parts.push(`Result sets: ${rs}`);
    }

    if (s.resultRounds?.length) {
      const rr = s.resultRounds.map(r =>
        `Rd${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}${r.other ? ` ${r.other}` : ""}`
      ).join(", ");
      parts.push(`Result rounds: ${rr}`);
    }

    if (s.result) parts.push(`Result: ${s.result}`);
    if (s.notes)  parts.push(`Notes: ${s.notes}`);

    return parts.join(" | ");
  }).join("\n");

  const newUserMessage = `TODAY'S RECOVERY:\n${recoveryText}\n\nTODAY'S SESSIONS:\n${sessionsText}\n\nProvide coaching advice.`;

  // ── call Gemini ────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(user.geminiKey.trim());
    const model = genAI.getGenerativeModel({
      model:             "gemini-2.0-flash-lite",
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

    // ── parse ──────────────────────────────────────────
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