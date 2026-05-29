"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/ui/TopNav";
import WeekStrip, { WeekDayData, WeekDayState } from "@/components/home/WeekStrip";
import TypeChip from "@/components/session/TypeChip";
import RecoverySheet from "@/components/log/RecoverySheet";
import { useProgram } from "@/contexts/ProgramContext";
import { SESSION_TYPE_META, RecoveryLog } from "@/types";
import { getLocalDateString, getTodayString } from "@/lib/utils";

const TODAY_STR   = getTodayString();
const DAY_LETTERS = ["M","T","W","T","F","S","S"];
const FEELINGS = [
  { value: "crushed", emoji: "🤪", label: "Crushed" },
  { value: "strong",  emoji: "🤩", label: "Strong"  },
  { value: "good",    emoji: "😊", label: "Good"    },
  { value: "okay",    emoji: "😐", label: "Okay"    },
  { value: "tired",   emoji: "😴", label: "Tired"   },
];

function getThisWeekDates(): string[] {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return getLocalDateString(d);
  });
}

function isSessionComplete(s: {
  sets: unknown[]; rounds: unknown[];
  resultRounds: unknown[]; result: string | null; type: string;
}) {
  if (s.result !== null && (s.result as string).trim() !== "") return true;
  const meta = SESSION_TYPE_META[s.type as keyof typeof SESSION_TYPE_META];
  if (meta.useSets) return (s.sets as unknown[]).length > 0;
  if (s.type === "wod" || s.type === "zone") return (s.resultRounds as unknown[]).length > 0;
  return false;
}

export default function HomePage() {
  const router = useRouter();
  const { getDay, days, saveRecovery, saveFeeling } = useProgram();

  const [recoveryOpen,   setRecoveryOpen]   = useState(false);
  const [feelingComment, setFeelingComment] = useState("");
  const [savingComment,  setSavingComment]  = useState(false);

  const weekDates = getThisWeekDates();
  const todayDay  = getDay(TODAY_STR);
  const sessions  = todayDay.sessions;
  const lastAI    = todayDay.aiSuggestion;

  const dayComplete = sessions.length > 0 && sessions.every(
    s => isSessionComplete(s as Parameters<typeof isSessionComplete>[0])
  );

  const weekDayData: WeekDayData[] = weekDates.map((date, i) => {
    const d           = getDay(date);
    const isToday     = date === TODAY_STR;
    const isPast      = date < TODAY_STR;
    const isFuture    = date > TODAY_STR;
    const hasSessions = d.sessions.length > 0;
    const allDone     = hasSessions && d.sessions.every(
      s => isSessionComplete(s as Parameters<typeof isSessionComplete>[0])
    );

    let state: WeekDayState = "empty";
    if      (isToday)                state = "today";
    else if (isPast  && allDone)     state = "done";
    else if (isPast  && hasSessions) state = "incomplete";
    else if (isFuture && hasSessions) state = "upcoming";

    return { label: DAY_LETTERS[i], state, date };
  });

  const todayLabel = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "short",
  });

  const handleDayClick  = (date: string) => router.push(`/program?date=${date}`);
  const handleRecovery  = (data: RecoveryLog) => { saveRecovery(TODAY_STR, data); setRecoveryOpen(false); };

  const handleSaveComment = async () => {
    if (!feelingComment.trim()) return;
    setSavingComment(true);
    await saveFeeling(TODAY_STR, todayDay.postWorkoutFeeling, feelingComment.trim());
    setSavingComment(false);
  };

  // suppress unused
  void Object.values(days);

  return (
    <>
      <TopNav title="FIT PIT" />

      <main className="px-[18px] pt-5 pb-28">

        <WeekStrip days={weekDayData} onDayClick={handleDayClick} />

        {/* today header */}
        <div className="my-[1rem] text-center">
          <div className="text-[16px] tracking-[2px] uppercase mb-[1rem]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Today · {todayLabel}
          </div>

          {/* post-workout feeling */}
          {dayComplete && sessions.length > 0 && (
            <div className="rounded-[12px] mb-[1rem] p-[1rem] overflow-hidden"
              style={{ background: "linear-gradient(135deg, #001a0d, #002216)", border: "1px solid var(--grn)" }}>

              <div className="px-4 pt-4 pb-3 text-center">
                <div className="text-[32px] mb-1">🏆</div>
                <div className="text-[22px] tracking-[2px]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--grn)" }}>
                  All Done Today!
                </div>
              </div>

              {todayDay.postWorkoutFeeling ? (
                /* saved state */
                <div className="px-[1rem] pt-[0.5rem] pb-[0.5rem]">
                  {/* feeling badge */}
                  <div className="flex justify-center items-center relative mb-3">
                    <div className="text-center">
                      <span className="text-[28px]">
                        {FEELINGS.find(f => f.value === todayDay.postWorkoutFeeling)?.emoji}
                      </span>
                      <div className="text-[14px] mt-1"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                        {FEELINGS.find(f => f.value === todayDay.postWorkoutFeeling)?.label}
                      </div>
                    </div>
                    <button
                      onClick={() => { saveFeeling(TODAY_STR, null, null); setFeelingComment(""); }}
                      className="text-[10px] cursor-pointer"
                      style={{
                        background: "none", border: "none", color: "var(--mu)",
                        fontFamily: "'DM Mono', monospace",
                        position: "absolute", right: "0", top: "0",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* comment display or input */}
                  {todayDay.postWorkoutComment ? (
                    <div className="rounded-[8px] p-[0.5rem] text-left mt-[0.5rem]"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #003322" }}>
                      <div className="text-[9px] tracking-[1.5px] uppercase mb-[0.25rem]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Comment
                      </div>
                      <p className="text-[12px]" style={{ color: "#b8d4c8" }}>
                        {todayDay.postWorkoutComment}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-[0.5rem]">
                      <textarea
                        rows={3}
                        placeholder="Add a comment... (optional)"
                        value={feelingComment}
                        onChange={e => setFeelingComment(e.target.value)}
                        className="w-full rounded-[8px] p-[0.5rem] text-[12px] outline-none resize-none"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border:     "1px solid #003322",
                          color:      "#b8d4c8",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      />
                      {feelingComment.trim() && (
                        <button
                          onClick={handleSaveComment}
                          disabled={savingComment}
                          className="w-full mt-2 rounded-[8px] py-[8px] text-[12px] cursor-pointer"
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            background: savingComment ? "var(--s3)" : "var(--grn)",
                            border:     "none",
                            color:      savingComment ? "var(--mu)" : "#000",
                          }}
                        >
                          {savingComment ? "Saving..." : "Save Comment"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* prompt — select feeling + optional comment */
                <div className="px-[1rem] pt-[1rem]">
                  <div className="text-[11px] tracking-[1px] uppercase mb-[0.5rem] text-center"
                    style={{ fontFamily: "'DM Mono', monospace", color: "#b8d4c8" }}>
                    How did you feel?
                  </div>

                  {/* emoji row */}
                  <div className="flex gap-[6px] mb-[0.5rem]">
                    {FEELINGS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => saveFeeling(TODAY_STR, f.value, feelingComment.trim() || null)}
                        className="flex-1 flex flex-col items-center gap-1 rounded-[10px] py-[10px] cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #003322" }}
                      >
                        <span className="text-[20px]">{f.emoji}</span>
                        <span className="text-[9px] tracking-[0.5px]"
                          style={{ fontFamily: "'DM Mono', monospace", color: "#b8d4c8" }}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* optional comment */}
                  <textarea
                    rows={3}
                    placeholder="Add a comment... (optional)"
                    value={feelingComment}
                    onChange={e => setFeelingComment(e.target.value)}
                    className="w-full rounded-[8px] p-[0.5rem] text-[12px] outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border:     "1px solid #003322",
                      color:      "#b8d4c8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {/* <div className="text-[10px] mt-1 text-center"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Tap an emoji to save
                  </div> */}
                </div>
              )}
            </div>
          )}

          <div>
            <button
              onClick={() => setRecoveryOpen(true)}
              className="rounded-[8px] w-full py-[0.5rem] text-[12px] tracking-[1px] cursor-pointer"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: todayDay.recovery ? "var(--grn)" : "transparent",
                border:     `1px solid ${todayDay.recovery ? "var(--grn)" : "var(--org)"}`,
                color:      todayDay.recovery ? "#000" : "var(--org)",
              }}
            >
              {todayDay.recovery ? "✓ Recovery" : "+ Recovery"}
            </button>
          </div>
        </div>

        {/* today sessions */}
        {sessions.length === 0 ? (
          <Link href="/program" style={{ textDecoration: "none" }}>
            <div className="rounded-[12px] p-[1rem] mb-[1rem] text-center cursor-pointer"
              style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
              <div className="text-[14px] mb-1 p-[0.5rem]" style={{ color: "var(--mu)" }}>
                Nothing planned yet
              </div>
              <div className="text-[14px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                Tap to plan today&apos;s workout →
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[12px] mb-5 overflow-hidden"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            {sessions.map((s, i) => {
              const meta = SESSION_TYPE_META[s.type];
              const done = isSessionComplete(s as Parameters<typeof isSessionComplete>[0]);
              return (
                <div key={s.id}
                  className="flex items-center justify-between"
                  style={{
                    padding:      ".5rem",
                    borderBottom: i < sessions.length - 1 ? "1px solid var(--br)" : "none",
                    background:   `linear-gradient(90deg, ${meta.color}08 0%, transparent 100%)`,
                  }}>
                  <div className="py-[0.25rem] min-w-0">
                    <TypeChip type={s.type} />
                    <div className="text-[18px] tracking-[0.5px] px-[0.25rem] mt-[0.5rem]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      {s.name}
                    </div>
                  </div>
                  {done ? (
                    <span className="text-[12px] flex-shrink-0 ml-2"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                      ✓ Done
                    </span>
                  ) : (
                    <span className="text-[12px] flex-shrink-0 ml-2"
                      style={{ fontFamily: "'DM Mono', monospace", color: "#ff9055" }}>
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
            <Link href="/program" style={{ textDecoration: "none" }}>
              <div className="p-[1.25rem] text-center text-[12px] tracking-[1px] cursor-pointer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color:      "var(--org)",
                  borderTop:  "1px solid var(--org)",
                }}>
                {dayComplete ? "View in Program →" : "Log Results in Program →"}
              </div>
            </Link>
          </div>
        )}

        {/* AI coach note */}
        {lastAI && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[2px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                AI Coach Note
              </div>
            </div>
            <div className="rounded-[12px] p-4 mb-5"
              style={{ background: "#001a0d", border: "1px solid #003322" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{ background: "var(--grn)", animation: "pulse 2s infinite" }} />
                <span className="text-[9px] tracking-[2px] uppercase"
                  style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                  AI Coach · Today
                </span>
              </div>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#b8d4c8" }}>
                {lastAI.summary}
              </p>
              <div className="flex flex-wrap gap-[5px]">
                {lastAI.chips.map(c => (
                  <span key={c} className="text-[10px] px-2 py-[3px] rounded-full"
                    style={{ fontFamily: "'DM Mono', monospace", background: "#002216", border: "1px solid #003322", color: "var(--grn)" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      <RecoverySheet
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onSave={handleRecovery}
        onDelete={todayDay.recovery ? () => {
          saveRecovery(TODAY_STR, null as unknown as RecoveryLog);
          setRecoveryOpen(false);
        } : undefined}
        initial={todayDay.recovery}
      />

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
      `}</style>
    </>
  );
}