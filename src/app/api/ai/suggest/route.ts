import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getTodayString } from "@/lib/utils";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessions, userId } = body;

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: "sessions required" }, { status: 400 });
  }

  // ── fetch past 14 days from DB ──────────────────────────
  let historyText = "No history yet — first session!";

  if (userId) {
    try {
      const today = getTodayString();

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
        take: 14,
      });

      if (pastDays.length > 0) {
        historyText = pastDays.map(d => {
          const sessionsText = d.sessions.map(s => {
            // sets (result)
            if (s.sets.length > 0) {
              const setsStr = s.sets
                .map(set => `Set ${set.setNumber}: ${set.weight ?? "—"}kg × ${set.reps ?? "—"} reps${set.notes ? ` (${set.notes})` : ""}`)
                .join(", ");
              return `${s.name} (${s.type}): ${setsStr}. Notes: ${s.notes || "none"}`;
            }
            // result rounds
            if (s.resultRounds) {
              try {
                const rounds = JSON.parse(s.resultRounds);
                const roundsStr = rounds
                  .map((r: { roundNumber: number; details?: string; weight?: number; reps?: number; other?: string }) =>
                    `Round ${r.roundNumber}: ${r.details || ""}${r.weight ? ` ${r.weight}kg` : ""}${r.reps ? ` ${r.reps}reps` : ""}${r.other ? ` ${r.other}` : ""}`
                  ).join(", ");
                return `${s.name} (${s.type}): ${roundsStr}. Notes: ${s.notes || "none"}`;
              } catch { /* fall through */ }
            }
            // text result
            return `${s.name} (${s.type}): ${s.result || "no result"}. Notes: ${s.notes || "none"}`;
          }).join(" | ");

          const rec = d.recovery
            ? `Energy ${d.recovery.energy}/5, Sleep: ${d.recovery.sleepHours ?? "?"}h (quality ${d.recovery.sleepQuality ?? "?"}/5), Sore: ${d.recovery.sore}`
            : "No recovery logged";

          return `[${d.date}] ${sessionsText} — Recovery: ${rec}`;
        }).join("\n");
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }

  // ── build planned sessions text ─────────────────────────
  const planned = sessions
    .map((s: { index: number; type: string; name: string; desc?: string }, i: number) =>
      `${i + 1}. ${s.name} (${s.type})${s.desc ? `: ${s.desc}` : ""}`
    )
    .join("\n");

  // ── call Claude ─────────────────────────────────────────
  try {
    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an expert CrossFit coach AI. Analyse the athlete's training history and give specific pre-session coaching advice for today's planned sessions. Be direct and data-driven. Respond ONLY in valid JSON with no markdown:
{
  "summary": "2-3 sentence overall coaching note for today",
  "perSession": { "0": "specific advice for session 1", "1": "specific advice for session 2" },
  "chips": ["short label 1", "short label 2", "short label 3"],
  "recoveryNote": "1 sentence on readiness based on recent recovery data"
}`,
      messages: [{
        role:    "user",
        content: `Training history (last 14 days):\n${historyText}\n\nToday's planned sessions:\n${planned}\n\nProvide coaching advice.`,
      }],
    });

    const text = message.content.find(b => b.type === "text")?.text || "";
    const suggestion = JSON.parse(text);
    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("AI error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}