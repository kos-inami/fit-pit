"use client";

import { useState, useMemo } from "react";
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

// ─── helpers ─────────────────────────────────────────────────
const TODAY_STR   = new Date().toISOString().split("T")[0];
const DAY_LETTERS = ["M","T","W","T","F","S","S"];
const FEEL_COLOR  = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];
const FEEL_LABEL  = ["Spent","Okay","Good","Pumped","Beast"];

function getWeekDates(offset: number): string[] {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function isDone(s: ProgSession): boolean {
  const meta = SESSION_TYPE_META[s.type];
  if (meta.useSets) return s.sets.length > 0;
  if (s.type === "wod" || s.type === "zone") return s.resultRounds.length > 0;
  return s.result !== null;
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
    return (
      json.suggestion?.perSession?.["0"] ??
      json.suggestion?.summary ??
      `Focus on quality for ${name}.`
    );
  } catch {
    return `Focus on controlled movement for ${name}.`;
  }
}

// ────────────────────────────────────────────────────────────
export default function ProgramPage() {
  const { data: authSession }  = useSession();
  const userId                 = authSession?.user?.id;

  const {
    days, getDay,
    addSession, editSession, removeSession,
    saveResult, setAINote, setAILoading,
    saveRecovery,
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
    const note = await fetchAI(s.name, s.type, s.desc, userId);
    setAINote(selectedDate, id, note);
  };

  const handleRecovery = (data: RecoveryLog) => {
    saveRecovery(selectedDate, data);
    setRecoveryOpen(false);
    showFlash("Recovery logged");
  };

  const handleCalendarSelect = (date: string) => {
    const diffDays = Math.floor(
      (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    setWeekOffset(Math.floor(diffDays / 7));
    setSelectedDate(date);
  };

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
          canGoNext={weekOffset < 0}
        />

        {/* action row */}
        <div className="flex gap-2 my-[0.5rem]">
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
        {selectedDay.recovery && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[10px] mb-4 cursor-pointer"
            style={{ background: "var(--s1)", border: "1px solid #003322" }}
            onClick={() => setRecoveryOpen(true)}
          >
            <span
              className="w-[8px] h-[8px] rounded-full flex-shrink-0"
              style={{ background: FEEL_COLOR[selectedDay.recovery.energy] }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[12px] font-medium"
                  style={{ color: FEEL_COLOR[selectedDay.recovery.energy] }}
                >
                  {FEEL_LABEL[selectedDay.recovery.energy]}
                </span>
                <span style={{ color: "var(--br2)" }}>·</span>
                <span
                  className="text-[11px]"
                  style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                >
                  {selectedDay.recovery.sleep}
                </span>
                {selectedDay.recovery.sore.length > 0 && (
                  <>
                    <span style={{ color: "var(--br2)" }}>·</span>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                    >
                      Sore: {selectedDay.recovery.sore.join(", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--mu)" }}>
              Edit
            </span>
          </div>
        )}

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
              <div className="flex items-start justify-between px-4 pt-3 pb-2"
                  style={{
                    borderBottom: "1px solid var(--br2)",
                  }}
                >
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
                <div
                  className="mx-4 mb-3 rounded-[8px] p-3"
                  style={{ background: "#001a0d", border: "1px solid #003322" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                      style={{ background: "var(--grn)", animation: "pulse 2s infinite" }}
                    />
                    <span
                      className="text-[9px] tracking-[2px] uppercase"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
                    >
                      Coach Note
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#b8d4c8" }}>
                    {s.aiNote}
                  </p>
                </div>
              )}

              {/* ── PLAN: sets (Strength/WL/Accessory) ── */}
              {meta.useSets && s.planSets.length > 0 && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <div
                    className="text-[9px] tracking-[1.5px] uppercase mb-[0.25rem]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                  >
                    Planned Sets
                  </div>
                  <div className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-1 px-1">
                    {["#","KG","REPS","NOTE"].map(h => (
                      <span
                        key={h}
                        className="text-[9px] tracking-[1px] uppercase text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {s.planSets.map(set => (
                    <div key={set.setNumber} className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-1">
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--mu2)" }}
                      >
                        {set.setNumber}
                      </span>
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
                      >
                        {set.weight ?? "—"}
                      </span>
                      <span
                        className="text-[12px] text-center"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
                      >
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
                    className="text-[9px] tracking-[1.5px] uppercase mb-[0.25rem]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                  >
                    Workout Plan
                  </div>
                  {s.rounds.map(r => (
                    <div
                      key={r.roundNumber}
                      className="rounded-[7px] px-3 py-2 mb-1"
                      style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
                    >
                      <div
                        className="text-[11px] tracking-[1px] mb-[2px]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--mu2)" }}
                      >
                        Round {r.roundNumber}
                      </div>
                      {r.details && (
                        <div
                          className="text-[11px] whitespace-pre-line"
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
                          <span className="text-[10px]" style={{ color: "var(--mu)" }}>
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
                <div className="mx-4 mb-2 flex items-center gap-2 p-[0.25rem]">
                  <div className="h-[1px] flex-1" style={{ background: "var(--br)" }} />
                  <span
                    className="text-[9px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
                  >
                    Result
                  </span>
                  <div className="h-[1px] flex-1" style={{ background: "var(--br)" }} />
                </div>
              )}

              {/* ── RESULT: sets (Strength/WL/Accessory) ── */}
              {meta.useSets && s.sets.length > 0 && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <div className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-1 px-1">
                    {["#","KG","REPS","NOTE"].map(h => (
                      <span
                        key={h}
                        className="text-[9px] tracking-[1px] uppercase text-center"
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
                      <span className="text-[11px]" style={{ color: "var(--mu2)" }}>
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
                      className="rounded-[7px] px-3 py-2 p-[0.25rem]"
                      style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
                    >
                      <div
                        className="text-[11px] tracking-[1px] mb-1"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                      >
                        Round {r.roundNumber}
                      </div>
                      {r.details && (
                        <div
                          className="text-[11px] whitespace-pre-line mb-1"
                          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
                        >
                          {r.details}
                        </div>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        {r.weight !== null && (
                          <span className="text-[11px]"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {r.weight}kg
                          </span>
                        )}
                        {r.reps !== null && (
                          <span className="text-[11px]"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {r.reps} reps
                          </span>
                        )}
                        {r.other && (
                          <span className="text-[11px]" style={{ color: "var(--mu2)" }}>
                            {r.other}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RESULT: free text (Run/other) ── */}
              {!meta.useSets && s.type !== "wod" && s.type !== "zone" && s.result && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <p className="text-[14px]" style={{ color: meta.color }}>
                    {s.result}
                  </p>
                </div>
              )}

              {/* notes */}
              {s.notes && (
                <div className="mx-4 mb-3 p-[0.5rem]">
                  <p className="text-[12px] italic" style={{ color: "var(--mu2)" }}>
                    &ldquo;{s.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* ── action row ── */}
              <div
                className="flex border-t"
                style={{ borderColor: `${meta.color}22` }}
              >
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
                  onClick={() => setLogTarget(s)}
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

                {/* <button
                  onClick={() => setConfirmId(s.id)}
                  className="px-4 py-[10px] text-[10px] cursor-pointer"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: "transparent",
                    border:     "none",
                    color:      "var(--red)",
                  }}
                >
                  ✕
                </button> */}
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
        key={logTarget?.id ?? "log-closed"}
        open={logTarget !== null}
        onClose={() => setLogTarget(null)}
        session={logTarget}
        onSave={handleSaveResult}
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
      />

      <RecoverySheet
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onSave={handleRecovery}
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
    </>
  );
}