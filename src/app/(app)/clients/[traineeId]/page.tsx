"use client";

import { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/ui/TopNav";
import WeekSelector from "@/components/program/WeekSelector";
import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType } from "@/types";
import { RecordEntry, CATEGORY_META, getBestLabel, getLastDate } from "@/lib/records";
import { getLocalDateString, getTodayString } from "@/lib/utils";
import { FEELINGS } from "@/lib/feelings";
import AssignLibrarySessionSheet from "@/components/program/AssignLibrarySessionSheet";

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

interface ClientHeader {
  id: string; name: string; email: string;
  startedAt: string | null;
  weight: number | null; height: number | null; age: number | null;
}

interface DBSet {
  id: string; setNumber: number; weight: number | null; reps: number | null; notes: string | null;
}
interface DBSession {
  id: string; type: string; name: string; desc: string | null;
  result: string | null; notes: string | null;
  rounds: string | null; resultRounds: string | null; planSets: string | null;
  isRestDay: boolean; sets: DBSet[];
  feedback: { body: string; updatedAt: string } | null;
  feeling: string | null;
  feelingComment: string | null;
}
interface DBDay {
  id: string; date: string; sessions: DBSession[];
  recovery: { energy: number; sore: string; soreOther: string | null; sleepHours: number | null; sleepQuality: number | null; notes: string | null } | null;
}

export default function ClientDetailPage({ params }: { params: Promise<{ traineeId: string }> }) {
  const { traineeId } = use(params);
  const router = useRouter();

  const [client,  setClient]  = useState<ClientHeader | null>(null);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [day,     setDay]     = useState<DBDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [ending,  setEnding]  = useState(false);
  const [assignLibraryOpen, setAssignLibraryOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/trainer/clients/${traineeId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(json => setClient(json.client))
      .catch(() => setError("Not authorized to view this client"))
      .finally(() => setLoading(false));

    fetch(`/api/trainer/clients/${traineeId}/records`)
      .then(r => r.json())
      .then(json => setRecords(json.records ?? []))
      .catch(() => {});
  }, [traineeId]);

  const loadDay = useCallback(() => {
    fetch(`/api/trainer/clients/${traineeId}/sessions?date=${selectedDate}`)
      .then(r => r.json())
      .then(json => setDay(json.day ?? null))
      .catch(() => {});
  }, [traineeId, selectedDate]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekDayData = weekDates.map((date, i) => ({
    date,
    dayLetter:    DAY_LETTERS[i],
    dayNum:       new Date(date + "T00:00:00").getDate(),
    isToday:      date === TODAY_STR,
    isPast:       date <= TODAY_STR,
    sessionCount: date === day?.date ? day.sessions.length : 0,
  }));

  const handleEnd = async () => {
    if (!client) return;
    setEnding(true);
    try {
      const conn = await fetch("/api/trainer/clients").then(r => r.json());
      const relation = (conn.clients ?? []).find(
        (c: { trainee: { id: string } }) => c.trainee.id === client.id
      );
      if (relation) {
        await fetch(`/api/trainer/relations/${relation.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: "end" }),
        });
      }
      router.push("/clients");
    } catch { /* ignore */ }
    setEnding(false);
  };

  const byCategory = (cat: "wl" | "workout" | "run") =>
    records.filter(r => r.category === cat);
  const byMovement = (recs: RecordEntry[]) => {
    const map: Record<string, RecordEntry[]> = {};
    recs.forEach(r => { (map[r.movement] ??= []).push(r); });
    return map;
  };

  if (loading) {
    return (
      <>
        <TopNav title="CLIENT" />
        <main className="px-[18px] pt-5 text-center text-[12px]"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Loading...
        </main>
      </>
    );
  }

  if (error || !client) {
    return (
      <>
        <TopNav title="CLIENT" />
        <main className="px-[18px] pt-5 text-center text-[13px]" style={{ color: "var(--mu2)" }}>
          {error || "Not found"}
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav title={client.name.toUpperCase()} />
      <main className="px-[18px] pt-5 pb-28">

        {/* header */}
        <div className="rounded-[12px] p-4 mb-5"
          style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[18px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{client.name}</div>
              <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>{client.email}</div>
            </div>
            <button
              onClick={handleEnd}
              disabled={ending}
              className="rounded-[8px] px-3 py-[7px] text-[11px] cursor-pointer"
              style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--red)", color: "var(--red)" }}
            >
              {ending ? "..." : "Disconnect"}
            </button>
          </div>
          {(client.weight || client.height || client.age) && (
            <div className="flex gap-4 mt-2 pt-2" style={{ borderTop: "1px solid var(--br)" }}>
              {client.weight && <span className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>{client.weight}kg</span>}
              {client.height && <span className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>{client.height}cm</span>}
              {client.age    && <span className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>{client.age}yo</span>}
            </div>
          )}
          <button
            onClick={() => setAssignLibraryOpen(true)}
            className="w-full mt-3 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--acc)", color: "var(--acc)" }}
          >
            Assign from Library →
          </button>
        </div>

        {/* week selector */}
        <WeekSelector
          days={weekDayData}
          selected={selectedDate}
          onSelect={setSelectedDate}
          onPrevWeek={() => setWeekOffset(w => w - 1)}
          onNextWeek={() => setWeekOffset(w => w + 1)}
          canGoNext={weekOffset < 8}
        />

        {/* recovery / feeling */}
        {day?.recovery && (
          <div className="rounded-[10px] p-3 mb-3" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            <div className="text-[9px] tracking-[1.5px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Recovery</div>
            <div className="text-[12px]" style={{ color: "var(--mu2)" }}>
              Energy {day.recovery.energy}/5
              {day.recovery.sleepHours ? ` · ${day.recovery.sleepHours}h sleep` : ""}
            </div>
          </div>
        )}
        {/* sessions */}
        {!day || day.sessions.length === 0 ? (
          <div className="rounded-[12px] py-[1.5rem] text-center mb-5"
            style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
            <div className="text-[13px]" style={{ color: "var(--mu2)" }}>No sessions this day</div>
          </div>
        ) : (
          day.sessions.map(s => <ReadOnlySessionCard key={s.id} session={s} onFeedbackSaved={loadDay} />)
        )}

        {/* max records */}
        <div className="text-[10px] tracking-[2px] uppercase mb-3 mt-5" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Max Records
        </div>
        {(["wl","workout","run"] as const).map(cat => {
          const recs = byCategory(cat);
          if (recs.length === 0) return null;
          const movements = byMovement(recs);
          return (
            <div key={cat} className="mb-4">
              <div className="text-[11px] tracking-[1px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: CATEGORY_META[cat].color }}>
                {CATEGORY_META[cat].label}
              </div>
              <div className="rounded-[10px] overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                {Object.entries(movements).map(([movement, recs], i, arr) => (
                  <div key={movement} className="px-3 py-[10px] flex items-center justify-between"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--br)" : "none" }}>
                    <div>
                      <div className="text-[13px]">{movement}</div>
                      <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {getLastDate(recs)}
                      </div>
                    </div>
                    <div className="text-[13px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                      {getBestLabel(recs, cat)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            No max records yet
          </div>
        )}

      </main>

      <AssignLibrarySessionSheet
        open={assignLibraryOpen}
        onClose={() => setAssignLibraryOpen(false)}
        traineeId={traineeId}
        onAssigned={loadDay}
      />
    </>
  );
}

function FeedbackEditor({ sessionId, feedback, onSaved }: {
  sessionId: string; feedback: { body: string; updatedAt: string } | null; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(feedback?.body ?? "");
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/sessions/${sessionId}/feedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body: draft.trim() }),
      });
      setEditing(false);
      onSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="mx-4 mb-3 p-[0.5rem] rounded-[8px]" style={{ background: "var(--s2)", border: "1px solid var(--acc)" }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          placeholder="Leave feedback for this session..."
          className="w-full rounded-[6px] px-2 py-[6px] text-[12px] outline-none resize-none mb-2"
          style={{ background: "var(--s1)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Mono', monospace" }}
        />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !draft.trim()}
            className="flex-1 rounded-[6px] py-[6px] text-[11px] cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: "var(--acc)", border: "none", color: "#000" }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setDraft(feedback?.body ?? ""); }}
            className="flex-1 rounded-[6px] py-[6px] text-[11px] cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3">
      {feedback && (
        <div className="p-[0.5rem] rounded-[8px] mb-2" style={{ background: "var(--s2)", border: "1px solid var(--acc)" }}>
          <div className="text-[9px] tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
            Your Feedback
          </div>
          <p className="text-[12px] whitespace-pre-line" style={{ color: "var(--tx)" }}>{feedback.body}</p>
        </div>
      )}
      <button onClick={() => setEditing(true)}
        className="text-[11px] cursor-pointer"
        style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "none", color: "var(--acc)" }}>
        {feedback ? "Edit Feedback" : "+ Add Feedback"}
      </button>
    </div>
  );
}

function ReadOnlySessionCard({ session: s, onFeedbackSaved }: { session: DBSession; onFeedbackSaved: () => void }) {
  const planSets     = s.planSets     ? JSON.parse(s.planSets)     : [];
  const rounds       = s.rounds       ? JSON.parse(s.rounds)       : [];
  const resultRounds = s.resultRounds ? JSON.parse(s.resultRounds) : [];

  if (s.isRestDay) {
    return (
      <div className="rounded-[11px] mb-[10px] overflow-hidden"
        style={{ background: "var(--s1)", border: "1px solid var(--br2)" }}>
        <div className="p-4">
          <div className="text-[18px] mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>🛌 {s.name}</div>
          {s.desc && <div className="text-[13px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>{s.desc}</div>}
          {s.notes && <div className="text-[12px] italic mt-2" style={{ color: "var(--mu)" }}>&ldquo;{s.notes}&rdquo;</div>}
          {s.feeling && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[16px]">{FEELINGS.find(f => f.value === s.feeling)?.emoji}</span>
              <div>
                <span className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                  {FEELINGS.find(f => f.value === s.feeling)?.label}
                </span>
                {s.feelingComment && (
                  <p className="text-[11px] italic" style={{ color: "var(--mu)" }}>&ldquo;{s.feelingComment}&rdquo;</p>
                )}
              </div>
            </div>
          )}
        </div>
        <FeedbackEditor sessionId={s.id} feedback={s.feedback} onSaved={onFeedbackSaved} />
      </div>
    );
  }

  const meta    = SESSION_TYPE_META[s.type as SessionType];
  const useSets = meta.useSets;

  return (
    <div className="rounded-[11px] mb-[10px] overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${meta.color}0f 0%, var(--s1) 60%)`, border: `1px solid ${meta.color}44` }}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[18px] tracking-[1px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{s.name}</span>
          <TypeChip type={s.type as SessionType} />
        </div>
        {s.desc && <div className="text-[13px] whitespace-pre-line" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>{s.desc}</div>}
      </div>

      {useSets && planSets.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-[9px] tracking-[1.5px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Planned</div>
          {planSets.map((set: { setNumber: number; weight: number | null; reps: number | null }) => (
            <div key={set.setNumber} className="text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
              {set.setNumber}. {set.weight ?? "—"}kg × {set.reps ?? "—"}
            </div>
          ))}
        </div>
      )}

      {(s.type === "wod" || s.type === "zone") && rounds.length > 0 && (
        <div className="px-4 pb-2 text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
          {rounds.map((r: { roundNumber: number; details: string }) => (
            <div key={r.roundNumber}>Round {r.roundNumber}: {r.details}</div>
          ))}
        </div>
      )}

      {s.result && (
        <div className="px-4 pb-2 text-[13px] whitespace-pre-line" style={{ color: meta.color }}>{s.result}</div>
      )}

      {useSets && s.sets.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-[9px] tracking-[1.5px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Result</div>
          {s.sets.map(set => (
            <div key={set.id} className="text-[12px]" style={{ fontFamily: "'DM Mono', monospace" }}>
              {set.setNumber}. {set.weight ?? "—"}kg × {set.reps ?? "—"}
            </div>
          ))}
        </div>
      )}

      {(s.type === "wod" || s.type === "zone") && resultRounds.length > 0 && (
        <div className="px-4 pb-2 text-[12px]" style={{ fontFamily: "'DM Mono', monospace" }}>
          {resultRounds.map((r: { roundNumber: number; details: string }) => (
            <div key={r.roundNumber}>Round {r.roundNumber}: {r.details}</div>
          ))}
        </div>
      )}

      {s.notes && (
        <div className="px-4 pb-3 text-[12px] italic whitespace-pre-line" style={{ color: "var(--mu2)" }}>
          &ldquo;{s.notes}&rdquo;
        </div>
      )}

      {s.feeling && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <span className="text-[16px]">{FEELINGS.find(f => f.value === s.feeling)?.emoji}</span>
          <div>
            <span className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
              {FEELINGS.find(f => f.value === s.feeling)?.label}
            </span>
            {s.feelingComment && (
              <p className="text-[11px] italic" style={{ color: "var(--mu)" }}>&ldquo;{s.feelingComment}&rdquo;</p>
            )}
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--br)" }}>
        <FeedbackEditor sessionId={s.id} feedback={s.feedback} onSaved={onFeedbackSaved} />
      </div>
    </div>
  );
}
