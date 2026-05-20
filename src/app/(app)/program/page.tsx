"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import TopNav from "@/components/ui/TopNav";
import WeekSelector from "@/components/program/WeekSelector";
import CalendarSheet from "@/components/program/CalendarSheet";
import AddSessionSheet from "@/components/log/AddSessionSheet";
import LogResultSheet from "@/components/log/LogResultSheet";
import RecoverySheet from "@/components/log/RecoverySheet";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TypeChip from "@/components/session/TypeChip";
import { useProgram, ProgSession } from "@/contexts/ProgramContext";
import { SESSION_TYPE_META, SessionType, SetLog, RoundEntry, RecoveryLog } from "@/types";
import { getLocalDateString, getTodayString } from "@/lib/utils";
import { useSearchParams } from "next/navigation";




// ─── helpers ─────────────────────────────────────────────────
const TODAY_STR   = getTodayString();
const DAY_LETTERS = ["M","T","W","T","F","S","S"];

function getWeekDates(offset: number): string[] {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return getLocalDateString(d);
  });
}

function isDone(s: ProgSession): boolean {
  if (s.result !== null && s.result.trim() !== "") return true;
  const meta = SESSION_TYPE_META[s.type];
  if (meta.useSets) return s.sets.length > 0;
  if (s.type === "wod" || s.type === "zone") return s.resultRounds.length > 0;
  return false;
}

async function fetchAI(
  name:    string,
  type:    string,
  desc:    string,
  userId?: string
): Promise<string> {
  try {
    const res  = await fetch("/api/ai/suggest", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        sessions: [{ index: 0, type, name, desc }],
        userId:   userId ?? null,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      return json.error ?? "AI request failed.";
    }

    return (
      json.suggestion?.perSession?.["0"] ??
      json.suggestion?.summary ??
      `Focus on quality for ${name}.`
    );
  } catch {
    return "Could not reach AI. Check your connection.";
  }
}

// ────────────────────────────────────────────────────────────
function ProgramPage() {
  const { data: authSession }  = useSession();
  const userId                 = authSession?.user?.id;

const {
  days, getDay,
  addSession, editSession, removeSession,
  saveResult, clearResult, setAINote, clearAINote, setAILoading,
  saveRecovery, deleteRecovery,
} = useProgram();

  const [weekOffset,   setWeekOffset]   = useState(0);
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [addOpen,      setAddOpen]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<ProgSession | null>(null);
  const [logTarget,    setLogTarget]    = useState<ProgSession | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [flash,        setFlash]        = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<ProgSession | null>(null);
  const [copyDate,   setCopyDate]   = useState(TODAY_STR);
  const [logCounter, setLogCounter] = useState(0);
  const [recoveryAccordion, setRecoveryAccordion] = useState(false);


  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const weekDayData = weekDates.map((date, i) => ({
    date,
    dayLetter:    DAY_LETTERS[i],
    dayNum:       new Date(date + "T00:00:00").getDate(),
    isToday:      date === TODAY_STR,
    isPast:       date <= TODAY_STR,
    sessionCount: getDay(date).sessions.length,
  }));

  const selectedDay       = getDay(selectedDate);
  const datesWithSessions = Object.keys(days).filter(d => days[d].sessions.length > 0);

  const selectedLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long",
  });

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  // ── handlers ─────────────────────────────────────────────
  const handleAdd = (data: {
    type: SessionType; name: string; desc: string;
    planSets: SetLog[]; rounds: RoundEntry[];
  }) => {
    addSession(selectedDate, {
      ...data,
      sets: [], result: null, notes: null, resultRounds: [],
    });
    showFlash("Session added");
  };

  const handleEdit = (id: string, data: {
    type: SessionType; name: string; desc: string;
    planSets: SetLog[]; rounds: RoundEntry[];
  }) => {
    editSession(selectedDate, id, {
      name:     data.name,
      desc:     data.desc,
      planSets: data.planSets,
      rounds:   data.rounds,
    });
    setEditTarget(null);
    showFlash("Session updated");
  };

  const handleRemove = () => {
    if (confirmId) removeSession(selectedDate, confirmId);
    setConfirmId(null);
    showFlash("Session removed");
  };

  const handleSaveResult = (data: {
    result?: string; notes?: string; sets?: SetLog[]; resultRounds?: RoundEntry[];
  }) => {
    if (!logTarget) return;
    saveResult(selectedDate, logTarget.id, data);
    setLogTarget(null);
    showFlash("Result saved");
  };

const handleAI = async (id: string) => {
  const s = selectedDay.sessions.find(x => x.id === id);
    if (!s) return;
    setAILoading(selectedDate, id, true);

    try {
      const res  = await fetch("/api/ai/suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessions: [{
            index:    0,
            id:       s.id,
            type:     s.type,
            name:     s.name,
            desc:     s.desc,
            planSets: s.planSets,
            rounds:   s.rounds,
          }],
          userId,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAINote(selectedDate, id, json.error ?? "AI request failed.");
        return;
      }

      const note =
        json.suggestion?.perSession?.["0"] ??
        json.suggestion?.summary ??
        `Focus on quality for ${s.name}.`;

      setAINote(selectedDate, id, note);
    } catch {
      setAINote(selectedDate, id, "Could not reach AI. Check your connection.");
    }
  };

  const handleRecovery = (data: RecoveryLog) => {
    saveRecovery(selectedDate, data);
    setRecoveryOpen(false);
    showFlash("Recovery logged");
  };

  const handleDeleteRecovery = () => {
    deleteRecovery(selectedDate);
    setRecoveryOpen(false);
    showFlash("Recovery removed");
  };

  const handleCalendarSelect = (date: string) => {
    const diffDays = Math.floor(
      (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    setWeekOffset(Math.floor(diffDays / 7));
    setSelectedDate(date);
  };

  const handleCopy = () => {
    if (!copyTarget) return;
    addSession(copyDate, {
      type:         copyTarget.type,
      name:         copyTarget.name,
      desc:         copyTarget.desc,
      planSets:     copyTarget.planSets,
      rounds:       copyTarget.rounds,
      sets:         [],
      result:       null,
      notes:        null,
      resultRounds: [],
    });
    setCopyTarget(null);
    showFlash(`Copied to ${copyDate}`);
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const dateParam = searchParams.get("date");
    const id = setTimeout(() => {
      if (dateParam) {
        setSelectedDate(dateParam);
        const diffDays = Math.floor(
          (new Date(dateParam).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        setWeekOffset(Math.floor(diffDays / 7));
      } else {
        // no date param — reset to today
        setSelectedDate(TODAY_STR);
        setWeekOffset(0);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [searchParams]);

  const openLogSheet = (s: ProgSession) => {
    setLogCounter(c => c + 1);
    setLogTarget(s);
  };

  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile?userId=${userId}`)
      .then(r => r.json())
      .then(json => setAiEnabled(!!json.user?.geminiKey))
      .catch(() => {});
  }, [userId]);

  // ────────────────────────────────────────────────────────
  return (
    <>
      <TopNav
        title="PROGRAM"
        right={
          <button
            onClick={() => setCalendarOpen(true)}
            className="rounded-[8px] px-3 py-[6px] text-[11px] cursor-pointer"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: "var(--s2)",
              border:     "1px solid var(--br)",
              color:      "var(--mu2)",
            }}
          >
            📅 History
          </button>
        }
      />

      <main className="px-[18px] pt-5 pb-28">

        {/* week selector */}
        <WeekSelector
          days={weekDayData}
          selected={selectedDate}
          onSelect={setSelectedDate}
          onPrevWeek={() => setWeekOffset(w => w - 1)}
          onNextWeek={() => setWeekOffset(w => w + 1)}
          canGoNext={weekOffset < 8}
        />

        {/* action row */}
        <div className="flex gap-[6] my-[0.5rem]">
          <button
            onClick={() => setAddOpen(true)}
            className="flex-1 rounded-[9px] py-[11px] text-[14px] tracking-[1.5px] cursor-pointer"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              background: "var(--acc)",
              border:     "none",
              color:      "#000",
            }}
          >
            + Add Session
          </button>
          <button
            onClick={() => setRecoveryOpen(true)}
            className="flex-1 rounded-[9px] py-[11px] text-[14px] tracking-[1.5px] cursor-pointer"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              background: "transparent",
              border:     `1px solid ${selectedDay.recovery ? "var(--grn)" : "var(--br2)"}`,
              color:      selectedDay.recovery ? "var(--grn)" : "var(--mu2)",
            }}
          >
            {selectedDay.recovery ? "✓ Recovery" : "Log Recovery"}
          </button>
        </div>

        {/* recovery summary */}
        {selectedDay.recovery && (() => {
          const e = [
            { value: 5, color: "#3cffa0", emoji: "⚡", label: "Excellent" },
            { value: 4, color: "#a8ff78", emoji: "💪", label: "Good"      },
            { value: 3, color: "#e8ff3c", emoji: "🙂", label: "Moderate"  },
            { value: 2, color: "#ff9055", emoji: "😐", label: "Low"       },
            { value: 1, color: "#ff4c2b", emoji: "😴", label: "Exhausted" },
          ].find(x => x.value === selectedDay.recovery!.energy)!;

          const rec = selectedDay.recovery!;

          return (
            <div className="rounded-[10px] mb-[0.5rem] p-[0.5rem] overflow-hidden"
              style={{ background: "var(--s1)", border: "1px solid #003322" }}>

              {/* accordion header */}
              <button
                onClick={() => setRecoveryAccordion(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{ background: "transparent", border: "none" }}
              >
                <div className="flex items-center">
                  {/* <span className="text-[16px]">{e.emoji}</span> */}
                  <span className="text-[10px] tracking-[1px] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                    Recovery Summary
                  </span>
                  {/* <span className="text-[11px] font-medium" style={{ color: e.color }}>
                    · {e.label}
                  </span> */}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setRecoveryOpen(true); }}
                    className="text-[10px] cursor-pointer px-2 py-[3px] rounded-full"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: "transparent",
                      border:     "none",
                      color:      "var(--mu2)",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </button>

              {/* accordion content */}
              {recoveryAccordion && (
                <div className="px-4 pb-4 pt-1"
                  style={{ borderTop: "1px solid var(--br)" }}>

                  {/* energy */}
                  <div className="flex items-center justify-between py-[0.5rem]"
                    style={{ borderBottom: "1px solid var(--br)" }}>
                    <span className="text-[10px] tracking-[1.5px] uppercase"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                      Energy
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: e.color }}>
                      {e.emoji} - {e.value} — {e.label}
                    </span>
                  </div>

                  {/* sleep */}
                  {(rec.sleepHours || rec.sleepQuality) && (
                    <div className="flex items-center justify-between py-[0.5rem]"
                      style={{ borderBottom: "1px solid var(--br)" }}>
                      <span className="text-[10px] tracking-[1.5px] uppercase"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Sleep
                      </span>
                      <span className="text-[10px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                        {rec.sleepHours ? `${rec.sleepHours}h` : ""}
                        {rec.sleepHours && rec.sleepQuality ? " · " : ""}
                        {rec.sleepQuality ? `Quality ${rec.sleepQuality}/5` : ""}
                      </span>
                    </div>
                  )}

                  {/* sore areas */}
                  {rec.sore.length > 0 && (
                    <div className="py-[0.5rem]" style={{ borderBottom: rec.soreOther || rec.notes ? "1px solid var(--br)" : "none" }}>
                      <span className="text-[10px] tracking-[1.5px] uppercase block mb-[0.5rem]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Sore Areas
                      </span>
                      <div className="flex flex-wrap gap-[5px]">
                        {rec.sore.map(area => (
                          <span key={area}
                            className="text-[10px] px-[0.5rem] py-[3px] rounded-full"
                            style={{ fontFamily: "'DM Mono', monospace", background: "#1a0000", border: "1px solid var(--red)", color: "var(--red)" }}>
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* sore other */}
                  {rec.soreOther && (
                    <div className="py-[0.5rem]"
                      style={{ borderBottom: rec.notes ? "1px solid var(--br)" : "none" }}>
                      <div className="text-[10px] tracking-[1.5px] uppercase mb-[0.25rem]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Other
                      </div>
                      <div className="text-[12px]"
                        style={{ color: "var(--mu2)" }}>
                        {rec.soreOther}
                      </div>
                    </div>
                  )}

                  {/* notes */}
                  {rec.notes && (
                    <div className="pt-[0.5rem]">
                      <span className="text-[10px] tracking-[1.5px] uppercase block mb-[0.25rem]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Notes
                      </span>
                      <p className="text-[12px] italic" style={{ color: "var(--mu2)" }}>
                        &ldquo;{rec.notes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* empty state */}
        {selectedDay.sessions.length === 0 && (
          <div
            className="rounded-[12px] py-10 text-center"
            style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}
          >
            <div className="text-[24px] mb-2">📋</div>
            <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
              No sessions planned
            </div>
            <div
              className="text-[11px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
            >
              Tap + Add Session above
            </div>
          </div>
        )}

        {/* ── session cards ── */}
        {selectedDay.sessions.map((s) => {
          const meta    = SESSION_TYPE_META[s.type];
          const done    = isDone(s);
          const hasResult = done;

          return (
            <div
              key={s.id}
              className="rounded-[11px] mb-[10px] overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${meta.color}0f 0%, var(--s1) 60%)`,
                border:     `1px solid ${meta.color}44`,
              }}
            >
              {/* head */}
              <div className="flex items-start justify-between px-4 pt-3 pb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[20px] tracking-[1px] mx-[.5rem] my-[.5rem]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {s.name}
                    </span>
                    <TypeChip type={s.type} />
                  </div>
                  {s.desc && (
                    <div
                      className="text-[14px] mx-[.5rem] mb-[.5rem] leading-relaxed mt-1 whitespace-pre-line"
                      style={{ 
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {s.desc}
                    </div>
                  )}
                </div>
                {done && (
                  <span
                    className="text-[12px] mx-[.5rem] my-[.5rem] flex-shrink-0"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      color:      "var(--grn)",
                      background: "#001a0d",
                    }}
                  >
                    ✓ Done
                  </span>
                )}
              </div>

              {/* AI note */}
              {s.aiNote && (
                <div className="mx-4 mb-3 rounded-[8px] p-3"
                  style={{ background: "#001a0d", border: "1px solid #003322" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{ background: "var(--grn)", animation: "pulse 2s infinite" }} />
                      <span className="text-[9px] tracking-[2px] uppercase"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                        Coach Note
                      </span>
                    </div>
                    <button
                      onClick={() => clearAINote(selectedDate, s.id)}
                      className="text-[11px] cursor-pointer"
                      style={{
                        background: "none",
                        border:     "none",
                        color:      "var(--mu)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#b8d4c8" }}>
                    {s.aiNote}
                  </p>
                </div>
              )}

              {/* ── PLAN: sets (Strength/WL/Accessory) ── */}
              {meta.useSets && s.planSets.length > 0 && (
                <div className="mx-4 mb-3">
                  <div className="text-[9px] tracking-[1.5px] uppercase mb-1"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Planned Sets
                  </div>

                  {/* headers */}
                  <div className="grid grid-cols-[22px_1fr_1fr_1fr_1fr] gap-2 mb-1 px-1">
                    {["#", "KG", "%", "REPS", "NOTES"].map(h => (
                      <span key={h}
                        className="text-[9px] tracking-[1px] uppercase text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* rows */}
                  {s.planSets.map(set => (
                    <div key={set.setNumber} className="grid grid-cols-[22px_1fr_1fr_1fr_1fr] gap-2 mb-1">
                      <span className="text-[12px] text-center"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--mu2)" }}>
                        {set.setNumber}
                      </span>
                      <span className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                        {set.weight != null ? `${set.weight}kg` : "—"}
                      </span>
                      <span className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                        {set.percentage != null
                          ? `${set.percentage}%`
                          : set.weight != null && set.maxWeight
                            ? `${Math.round((set.weight / set.maxWeight) * 100)}%`
                            : "—"}
                      </span>
                      <span className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                        {set.reps ?? "—"}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--mu)" }}>
                        {set.notes || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PLAN: rounds (WOD/Zone) ── */}
              {(s.type === "wod" || s.type === "zone") && s.rounds.length > 0 && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <div
                    className="text-[12px] tracking-[1.5px] uppercase mb-[0.25rem]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                  >
                    Workout Plan
                  </div>
                  {s.rounds.map(r => (
                    <div
                      key={r.roundNumber}
                      className="rounded-[8px] p-[0.5rem] mb-[0.5rem]"
                      style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
                    >
                      <div
                        className="text-[14px] tracking-[1px] mb-[2px]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: `${meta.color}` }}
                      >
                        Round {r.roundNumber}
                      </div>
                      {r.details && (
                        <div
                          className="text-[12px] whitespace-pre-line"
                          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                        >
                          {r.details}
                        </div>
                      )}
                      <div className="flex gap-3 flex-wrap mt-1">
                        {r.weight !== null && (
                          <span
                            className="text-[10px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                          >
                            {r.weight}kg
                          </span>
                        )}
                        {r.reps !== null && (
                          <span
                            className="text-[10px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                          >
                            {r.reps} reps
                          </span>
                        )}
                        {r.other && (
                          <span className="text-[12px]" style={{ color: "var(--mu)" }}>
                            {r.other}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RESULT divider ── */}
              {hasResult && (
                <div className="mx-4 mb-2 flex items-center gap-2 pb-[0.5rem]">
                  <div className="h-[1px] flex-1" style={{ background: "var(--br)" }} />
                  <span
                    className="text-[12px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
                  >
                    Result
                  </span>
                  <div className="h-[1px] flex-1" style={{ background: "var(--br)" }} />
                </div>
              )}


              {/* ── RESULT: comment (all types) ── */}
              {s.result && (
                <div className="p-[0.5rem] mb-[0.5rem]">
                  <p className="text-[13px] whitespace-pre-line" style={{ color: meta.color }}>{s.result}</p>
                </div>
              )}

              {/* ── RESULT: sets (Strength/WL/Accessory) ── */}
              {meta.useSets && s.sets.length > 0 && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <div className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-1 px-1">
                    {["#","WEIGHT","REPS","NOTE"].map(h => (
                      <span
                        key={h}
                        className="text-[12px] tracking-[1px] uppercase text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {s.sets.map(set => (
                    <div key={set.setNumber} className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-1">
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                      >
                        {set.setNumber}
                      </span>
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {set.weight ?? "—"}
                      </span>
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {set.reps ?? "—"}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--mu2)" }}>
                        {set.notes || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RESULT: result rounds (WOD/Zone) ── */}
              {(s.type === "wod" || s.type === "zone") && s.resultRounds.length > 0 && (
                <div className="mx-4 mb-3 space-y-[5px] p-[0.25rem]">
                  {s.resultRounds.map(r => (
                    <div
                      key={r.roundNumber}
                      className="rounded-[7px] p-[0.5rem] mb-[0.5rem]"
                      style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
                    >
                      <div
                        className="text-[14px] tracking-[1px] mb-[0.25rem]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                      >
                        Round {r.roundNumber}
                      </div>
                      {r.details && (
                        <div
                          className="text-[12px] whitespace-pre-line mb-[0.25rem]"
                          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
                        >
                          {r.details}
                        </div>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        {r.weight !== null && (
                          <span className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {r.weight}kg
                          </span>
                        )}
                        {r.reps !== null && (
                          <span className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {r.reps} reps
                          </span>
                        )}
                        {r.other && (
                          <span className="text-[12px]" style={{ color: "var(--mu2)" }}>
                            {r.other}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* notes */}
              {s.notes && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <p className="text-[12px] italic whitespace-pre-line" style={{ color: "var(--mu2)" }}>
                    &ldquo;{s.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* ── action row ── */}
              <div
                className="flex border-t"
                style={{ borderColor: `${meta.color}22` }}
              >

              {/* AI button — only if key configured */}
              {aiEnabled && (
                <button
                  onClick={() => handleAI(s.id)}
                  disabled={s.aiLoading}
                  className="flex-1 py-[10px] text-[10px] tracking-[0.5px] cursor-pointer transition-colors"
                  style={{
                    fontFamily:  "'DM Mono', monospace",
                    background:  "transparent",
                    border:      "none",
                    borderRight: `1px solid ${meta.color}22`,
                    color:       s.aiLoading ? "var(--mu)" : "var(--grn)",
                  }}
                >
                  {s.aiLoading ? "..." : s.aiNote ? "↻ AI" : "⚡ AI"}
                </button>
              )}

                <button
                  onClick={() => setEditTarget(s)}
                  className="flex-1 py-[10px] text-[10px] tracking-[0.5px] cursor-pointer transition-colors"
                  style={{
                    fontFamily:  "'DM Mono', monospace",
                    background:  "transparent",
                    border:      "none",
                    borderRight: `1px solid ${meta.color}22`,
                    color:       "var(--mu2)",
                  }}
                >
                  Edit Plan
                </button>

                <button
                  onClick={() => openLogSheet(s)}
                  className="flex-1 py-[10px] text-[10px] tracking-[0.5px] cursor-pointer transition-colors"
                  style={{
                    fontFamily:  "'DM Mono', monospace",
                    background:  "transparent",
                    border:      "none",
                    borderRight: `1px solid ${meta.color}22`,
                    color:       done ? "var(--grn)" : meta.color,
                  }}
                >
                  {done ? "Edit Result" : "Log Result"}
                </button>

                <button
                  onClick={() => { setCopyTarget(s); setCopyDate(TODAY_STR); }}
                  className="flex-1 py-[10px] text-[10px] tracking-[0.5px] cursor-pointer transition-colors"
                  style={{
                    fontFamily:  "'DM Mono', monospace",
                    background:  "transparent",
                    border:      "none",
                    borderRight: `1px solid ${meta.color}22`,
                    color:       "var(--mu2)",
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          );
        })}

      </main>

      {/* ── sheets ── */}
      <AddSessionSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />

      <AddSessionSheet
        key={editTarget?.id ?? "edit-closed"}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onAdd={handleAdd}
        editSession={editTarget ? {
          id:       editTarget.id,
          type:     editTarget.type,
          name:     editTarget.name,
          desc:     editTarget.desc,
          planSets: editTarget.planSets,
          rounds:   editTarget.rounds,
        } : null}
        onEdit={handleEdit}
        onDelete={() => {
          setEditTarget(null);
          setConfirmId(editTarget!.id);
        }}
      />

      <LogResultSheet
        key={logTarget ? `${logTarget.id}-${logCounter}` : "log-closed"}
        open={logTarget !== null}
        onClose={() => setLogTarget(null)}
        session={logTarget}
        onSave={handleSaveResult}
        onDelete={logTarget && isDone(logTarget) ? () => {
          if (!logTarget) return;
          clearResult(selectedDate, logTarget.id);
          setLogTarget(null);
          showFlash("Result deleted");
        } : undefined}
        initialSets={
          logTarget?.sets.length
            ? logTarget.sets
            : logTarget?.planSets ?? []
        }
        initialResultRounds={
          logTarget?.resultRounds.length
            ? logTarget.resultRounds
            : logTarget?.rounds ?? []
        }
        initialResult={logTarget?.result ?? ""}
        initialNotes={logTarget?.notes  ?? ""}
      />

      <RecoverySheet
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onSave={handleRecovery}
        onDelete={selectedDay.recovery ? handleDeleteRecovery : undefined}
        initial={selectedDay.recovery}
      />

      <CalendarSheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        datesWithSessions={datesWithSessions}
        onSelectDate={handleCalendarSelect}
      />

      <ConfirmDialog
        open={confirmId !== null}
        message="Remove this session? This can't be undone."
        onConfirm={handleRemove}
        onCancel={() => setConfirmId(null)}
      />

      {/* flash */}
      {flash && (
        <div className="absolute left-1/2 -translate-x-1/2 w-full z-[100] flex justify-center pt-5 px-4 pointer-events-none"
            style={{
                top: "0",
                padding: "2.5rem 0",
                background: "rgba(8,8,8,0.5)",
                backdropFilter: "blur(6px)",
            }}>
          <div
            className="px-6 py-3 rounded-[12px]"
            style={{
              background: "rgba(8,8,8,0.95)",
              boxShadow:  "0 4px 24px rgba(0,0,0,0.5)",
              animation:  "slideDown .25s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div
              className="text-[22px] tracking-[3px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
            >
              {flash}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* ── Copy Session Sheet ── */}
      {copyTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bottom-[0] left-[0] w-full"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setCopyTarget(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[20px] p-[1rem] pb-[2rem]"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-[1rem]">
              <div>
                <div className="text-[20px] tracking-[1px]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Copy Session
                </div>
                <div className="text-[11px] mt-[2px]"
                  style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                  {copyTarget.name}
                </div>
              </div>
              <button
                onClick={() => setCopyTarget(null)}
                style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", fontSize: 20 }}
              >
                ×
              </button>
            </div>

            {/* date picker */}
            <div className="mb-[1rem]">
              <div className="text-[10px] tracking-[1.5px] uppercase mb-[0.25rem]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Copy to Date
              </div>
              <input
                type="date"
                value={copyDate}
                onChange={e => setCopyDate(e.target.value)}
                className="w-full rounded-[8px] px-[10px] py-[10px] text-[14px] outline-none"
                style={{
                  background: "var(--s2)",
                  border:     "1px solid var(--br)",
                  color:      "var(--tx)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            {/* quick date buttons */}
            <div className="flex gap-2 mb-[1rem]">
              {[
                { label: "Today",     date: TODAY_STR },
                { label: "Tomorrow",  date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return getLocalDateString(d); })() },
                { label: "Next Week", date: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return getLocalDateString(d); })() },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setCopyDate(opt.date)}
                  className="flex-1 rounded-[8px] py-[8px] text-[11px] cursor-pointer transition-colors"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: copyDate === opt.date ? "var(--acc)" : "var(--s2)",
                    border:     `1px solid ${copyDate === opt.date ? "var(--acc)" : "var(--br)"}`,
                    color:      copyDate === opt.date ? "#000" : "var(--mu2)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* confirm */}
            <button
              onClick={handleCopy}
              disabled={!copyDate || copyDate === selectedDate}
              className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: (!copyDate || copyDate === selectedDate) ? "var(--s3)" : "var(--acc)",
                border:     "none",
                color:      (!copyDate || copyDate === selectedDate) ? "var(--mu)" : "#000",
              }}
            >
              {copyDate === selectedDate ? "Same Date — Pick Another" : "Copy Session"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ProgramPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ProgramPage />
    </Suspense>
  );
}

export default ProgramPageWrapper;