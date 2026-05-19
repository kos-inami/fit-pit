import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `You are an expert CrossFit coach AI. You know this athlete's full training history and give personalised coaching advice. Be direct and data-driven. Keep responses concise. Always respond ONLY in valid JSON with no markdown:
{
  "summary": "2-3 sentence overall coaching note for today",
  "perSession": { "0": "specific advice for session 1", "1": "specific advice for session 2" },
  "chips": ["short label 1", "short label 2", "short label 3"],
  "recoveryNote": "1 sentence on readiness based on recent recovery"
}`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessions, userId } = body;

  if (!sessions?.length || !userId) {
    return NextResponse.json({ error: "sessions and userId required" }, { status: 400 });
  }

  // ── get user's Gemini key ───────────────────────────────
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
    take:    40, // last 20 exchanges
  });

  // ── fetch recent training data ─────────────────────────
  const today    = new Date().toISOString().split("T")[0];
  const pastDays = await db.day.findMany({
    where: {
      userId,
      date: { lt: today },
    },
    include: {
      sessions: {
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
      recovery: true,
    },
    orderBy: { date: "desc" },
    take:    14,
  });

  // ── build training context ─────────────────────────────
  let historyText = "No past training data yet.";

  if (pastDays.length > 0) {
    historyText = pastDays.map(d => {
      const sessionsText = d.sessions.map(s => {
        if (s.sets.length > 0) {
          const setsStr = s.sets
            .map(set => `Set ${set.setNumber}: ${set.weight ?? "—"}kg × ${set.reps ?? "—"}`)
            .join(", ");
          return `${s.name} (${s.type}): ${setsStr}. Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
        }
        if (s.resultRounds) {
          try {
            const rounds = JSON.parse(s.resultRounds);
            const str = rounds.map((r: { roundNumber: number; details?: string; weight?: number; reps?: number; other?: string }) =>
              `Round ${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}${r.other ? ` ${r.other}` : ""}`
            ).join(", ");
            return `${s.name} (${s.type}): ${str}. Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
          } catch { /* fall through */ }
        }
        return `${s.name} (${s.type}): Result: ${s.result || "none"}. Notes: ${s.notes || "none"}`;
      }).join(" | ");

      const rec = d.recovery
        ? `Energy ${d.recovery.energy}/5, Sleep: ${d.recovery.sleepHours ?? "?"}h (quality ${d.recovery.sleepQuality ?? "?"}/5), Sore: ${d.recovery.sore}`
        : "No recovery logged";

      return `[${d.date}] ${sessionsText || "Rest day"} — Recovery: ${rec}`;
    }).join("\n");
  }

  // ── build today's planned sessions ─────────────────────
  const planned = sessions
    .map((s: { index: number; type: string; name: string; desc?: string }, i: number) =>
      `${i + 1}. ${s.name} (${s.type})${s.desc ? `: ${s.desc}` : ""}`
    )
    .join("\n");

  const newUserMessage = `Training history (last 14 days):\n${historyText}\n\nToday's planned sessions:\n${planned}\n\nProvide coaching advice.`;

  // ── call Gemini ────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(user.geminiKey);
    const model = genAI.getGenerativeModel({
      model:             "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // build chat history from stored messages
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

    // ── parse and return ───────────────────────────────
    const clean      = text.replace(/```json|```/g, "").trim();
    const suggestion = JSON.parse(clean);
    return NextResponse.json({ suggestion });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    // invalid key
    if (msg.includes("API_KEY_INVALID") || msg.includes("400") || msg.includes("API key not valid")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Check Account → AI Coaching." },
        { status: 401 }
      );
    }

    console.error("Gemini error:", msg);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}