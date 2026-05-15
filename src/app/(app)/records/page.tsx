"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import TopNav from "@/components/ui/TopNav";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── types ───────────────────────────────────────────────────
type Category = "wl" | "workout" | "run";

interface RecordEntry {
  id:          string;
  movement:    string;
  category:    Category;
  details?:    string | null;
  weight?:     number | null;
  reps?:       number | null;
  distance?:   number | null;
  timeSeconds?: number | null;
  notes?:      string | null;
  date:        string;
}

// ─── constants ───────────────────────────────────────────────
const DEFAULT_WL = [
  "Back Squat", "Front Squat", "Snatch", "Power Snatch",
  "Clean & Jerk", "Clean", "Deadlift", "Bench Press", "Push Press",
];

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  wl:      { label: "Weight Lifting", color: "#5cb8ff" },
  workout: { label: "Workout",        color: "#3cffa0" },
  run:     { label: "Run",            color: "#e8ff3c" },
};

// ─── helpers ─────────────────────────────────────────────────
function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function parseTime(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return parseInt(str) || 0;
}

function getBestLabel(records: RecordEntry[], category: Category): string {
  if (records.length === 0) return "";
  if (category === "wl") {
    const best = Math.max(...records.map(r => r.weight ?? 0));
    return `${best}kg`;
  }
  if (category === "workout") {
    const r = records[0];
    const parts: string[] = [];
    if (r.weight) parts.push(`${r.weight}kg`);
    if (r.reps)   parts.push(`${r.reps} reps`);
    return parts.join(" · ") || "Logged";
  }
  if (category === "run") {
    const best = records.reduce((a, b) =>
      (a.timeSeconds ?? Infinity) < (b.timeSeconds ?? Infinity) ? a : b
    );
    const parts: string[] = [];
    if (best.distance)   parts.push(`${best.distance}km`);
    if (best.timeSeconds) parts.push(formatTime(best.timeSeconds));
    return parts.join(" · ") || "Logged";
  }
  return "Logged";
}

function getLastDate(records: RecordEntry[]): string {
  if (records.length === 0) return "";
  return new Date(records[0].date + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ────────────────────────────────────────────────────────────
export default function RecordsPage() {
  const { data: authSession }   = useSession();
  const userId                  = authSession?.user?.id;

  const [records,    setRecords]    = useState<RecordEntry[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [activeTab,  setActiveTab]  = useState<Category>("wl");
  const [flash,      setFlash]      = useState<string | null>(null);

  // sheets
  const [addMovOpen,   setAddMovOpen]   = useState(false);
  const [logTarget,    setLogTarget]    = useState<{ name: string; category: Category; details?: string } | null>(null);
  const [historyTarget,setHistoryTarget]= useState<string | null>(null); // movement name
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [editRecord,   setEditRecord]   = useState<RecordEntry | null>(null);

  // ── load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/records?userId=${userId}`)
      .then(r => r.json())
      .then(json => { setRecords(json.records ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [userId]);

  // ── derived ───────────────────────────────────────────────
  const byMovement = useMemo(() => {
    const map: Record<string, RecordEntry[]> = {};
    records.forEach(r => {
      if (!map[r.movement]) map[r.movement] = [];
      map[r.movement].push(r);
    });
    return map;
  }, [records]);

  // movements list for current tab
  const movementsForTab = useMemo(() => {
    if (activeTab === "wl") {
      // defaults + any custom WL
      const custom = [...new Set(
        records.filter(r => r.category === "wl").map(r => r.movement)
      )].filter(m => !DEFAULT_WL.includes(m));
      return [...DEFAULT_WL, ...custom];
    }
    return [...new Set(
      records.filter(r => r.category === activeTab).map(r => r.movement)
    )];
  }, [records, activeTab, byMovement]);

  const historyRecords = useMemo(() =>
    historyTarget ? (byMovement[historyTarget] ?? []) : [],
    [historyTarget, byMovement]
  );

  // ── flash ─────────────────────────────────────────────────
  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  // ── handlers ─────────────────────────────────────────────
  const handleLogRecord = async (data: {
    movement:    string;
    category:    Category;
    details?:    string;
    weight?:     number;
    reps?:       number;
    distance?:   number;
    timeSeconds?: number;
    notes?:      string;
    date:        string;
  }) => {
    if (!userId) return;
    const res  = await fetch("/api/records", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...data, userId }),
    });
    const json = await res.json();
    if (json.record) {
      setRecords(prev => [json.record, ...prev]);
      showFlash("Record saved");
    }
  };

  const handleEditRecord = async (data: Partial<RecordEntry>) => {
    if (!editRecord) return;
    const res  = await fetch("/api/records", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ recordId: editRecord.id, ...data }),
    });
    const json = await res.json();
    if (json.record) {
      setRecords(prev => prev.map(r => r.id === editRecord.id ? json.record : r));
      setEditRecord(null);
      showFlash("Record updated");
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    setRecords(prev => prev.filter(r => r.id !== confirmId));
    await fetch(`/api/records?recordId=${confirmId}`, { method: "DELETE" });
    setConfirmId(null);
    showFlash("Record deleted");
  };

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <TopNav title="RECORDS" />

      <main className="px-[18px] pt-5 pb-28">

        {/* category tabs */}
        <div className="flex gap-[6px] mb-5 mb-[0.5rem]">
          {(["wl","workout","run"] as Category[]).map(cat => {
            const m = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="flex-1 rounded-full py-[8px] text-[11px] tracking-[1px] cursor-pointer transition-all"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  background: activeTab === cat ? m.color : "var(--s2)",
                  border:     `1px solid ${activeTab === cat ? m.color : "var(--br)"}`,
                  color:      activeTab === cat ? "#000" : "var(--mu2)",
                  fontWeight: activeTab === cat ? 600 : 400,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* loading */}
        {!loaded && (
          <div className="text-center pt-[12px]"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--mu)" }}>
            Loading...
          </div>
        )}

        {/* movement list */}
        {loaded && movementsForTab.map(name => {
          const entries = byMovement[name] ?? [];
          const best    = getBestLabel(entries, activeTab);
          const lastDate = getLastDate(entries);
          const meta    = CATEGORY_META[activeTab];

          return (
            <div
              key={name}
              className="rounded-[12px] mb-[10px] overflow-hidden p-[0.5rem] pb-[0]"
              style={{
                background: `linear-gradient(135deg, ${meta.color}0a 0%, var(--s1) 60%)`,
                border:     `1px solid ${meta.color}44`,
              }}
            >
              {/* head */}
              <div
                className="flex items-start justify-between pt-[0.25rem] pb-[0.5rem] cursor-pointer"
                onClick={() => entries.length > 0 && setHistoryTarget(name)}
              >
                <div className="flex-1">
                  <div className="text-[18px] tracking-[1px] mb-[2px]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {name}
                  </div>
                  {entries.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[18px] tracking-[0.5px] mr-[0.5rem]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                        {best}
                      </span>
                      <span className="text-[10px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {lastDate}
                      </span>
                      <span className="text-[10px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        · {entries.length} {entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px]"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                      No records yet
                    </div>
                  )}
                </div>
                {entries.length > 0 && (
                  <span className="text-[11px] mt-1"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                    History →
                  </span>
                )}
              </div>

              {/* actions */}
              <div className="flex border-t" style={{ borderColor: `${meta.color}22` }}>
                <button
                  onClick={() => setLogTarget({ name, category: activeTab })}
                  className="flex-1 py-[9px] text-[11px] tracking-[1px] cursor-pointer"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: "transparent",
                    border:     "none",
                    color:      meta.color,
                  }}
                >
                  + Log Record
                </button>
              </div>
            </div>
          );
        })}

        {/* empty state for workout/run */}
        {loaded && activeTab !== "wl" && movementsForTab.length === 0 && (
          <div className="rounded-[12px] py-10 text-center mb-4"
            style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
            <div className="text-[22px] mb-2">🏆</div>
            <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
              No {CATEGORY_META[activeTab].label} movements yet
            </div>
            <div className="text-[11px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Tap + Add below to create one
            </div>
          </div>
        )}

        {/* add movement */}
        <Button onClick={() => setAddMovOpen(true)}>
          + Add {CATEGORY_META[activeTab].label} Movement
        </Button>
      </main>

      {/* ── Add Movement Sheet ── */}
      <AddMovementSheet
        open={addMovOpen}
        category={activeTab}
        onClose={() => setAddMovOpen(false)}
        onSave={(data) => {
          setAddMovOpen(false);
          setLogTarget({ name: data.title, category: activeTab, details: data.details });
        }}
      />

      {/* ── Log Record Sheet ── */}
      {logTarget && (
        <LogRecordSheet
          open={logTarget !== null}
          movement={logTarget.name}
          category={logTarget.category}
          onClose={() => setLogTarget(null)}
          onSave={(data) => {
            handleLogRecord({ ...data, movement: logTarget.name, category: logTarget.category });
            setLogTarget(null);
          }}
        />
      )}

      {/* ── Edit Record Sheet ── */}
      {editRecord && (
        <LogRecordSheet
          open={editRecord !== null}
          movement={editRecord.movement}
          category={editRecord.category as Category}
          initial={editRecord}
          onClose={() => setEditRecord(null)}
          onSave={(data) => handleEditRecord(data)}
        />
      )}

      {/* ── History Sheet ── */}
      <Sheet
        open={historyTarget !== null}
        onClose={() => setHistoryTarget(null)}
        title={historyTarget ?? ""}
      >
        <div className="space-y-[8px]">
          {historyRecords.map((r) => {
            const meta = CATEGORY_META[r.category as Category];
            return (
              <div
                key={r.id}
                className="rounded-[10px] overflow-hidden"
                style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                      {new Date(r.date + "T00:00:00").toLocaleDateString("en-AU", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* WL */}
                  {r.category === "wl" && r.weight && (
                    <div className="text-[22px] tracking-[1px]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                      {r.weight}kg
                    </div>
                  )}

                  {/* Workout */}
                  {r.category === "workout" && (
                    <div className="flex gap-3 flex-wrap">
                      {r.weight && (
                        <span className="text-[18px] tracking-[1px]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                          {r.weight}kg
                        </span>
                      )}
                      {r.reps && (
                        <span className="text-[18px] tracking-[1px]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                          {r.reps} reps
                        </span>
                      )}
                    </div>
                  )}

                  {/* Run */}
                  {r.category === "run" && (
                    <div className="flex gap-3 flex-wrap">
                      {r.distance && (
                        <span className="text-[18px] tracking-[1px]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                          {r.distance}km
                        </span>
                      )}
                      {r.timeSeconds && (
                        <span className="text-[18px] tracking-[1px]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
                          {formatTime(r.timeSeconds)}
                        </span>
                      )}
                    </div>
                  )}

                  {r.notes && (
                    <p className="text-[12px] italic mt-1" style={{ color: "var(--mu2)" }}>
                      &ldquo;{r.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* actions */}
                <div className="flex border-t" style={{ borderColor: "var(--br)" }}>
                  <button
                    onClick={() => { setEditRecord(r); setHistoryTarget(null); }}
                    className="flex-1 py-[8px] text-[11px] cursor-pointer"
                    style={{
                      fontFamily:  "'DM Mono', monospace",
                      background:  "transparent",
                      border:      "none",
                      borderRight: "1px solid var(--br)",
                      color:       "var(--mu2)",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmId(r.id)}
                    className="flex-1 py-[8px] text-[11px] cursor-pointer"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: "transparent",
                      border:     "none",
                      color:      "var(--red)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <Button
            onClick={() => {
              setLogTarget({
                name:     historyTarget!,
                category: historyRecords[0]?.category as Category ?? activeTab,
              });
              setHistoryTarget(null);
            }}
          >
            + Add Entry
          </Button>
        </div>
      </Sheet>

      {/* confirm delete */}
      <ConfirmDialog
        open={confirmId !== null}
        message="Delete this record entry? This can't be undone."
        onConfirm={handleDelete}
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
          <div className="px-6 py-3"
            style={{
              animation:  "slideDown .25s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div className="text-[22px] tracking-[3px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>
              {flash}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── Add Movement Sheet ───────────────────────────────────────
function AddMovementSheet({
  open, category, onClose, onSave,
}: {
  open:     boolean;
  category: Category;
  onClose:  () => void;
  onSave:   (data: { title: string; details: string }) => void;
}) {
  const [title,   setTitle]   = useState("");
  const [details, setDetails] = useState("");

  const reset = () => { setTitle(""); setDetails(""); };

  return (
    <Sheet
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={`Add ${CATEGORY_META[category].label} Movement`}
    >
      <Input
        label="Movement Title"
        placeholder={
          category === "workout" ? "e.g. Fran, Murph, Grace" :
          category === "run"     ? "e.g. 5K Run, 1 Mile, 10K" :
          "Movement name"
        }
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <Textarea
        label="Details (optional)"
        placeholder={
          category === "workout" ? "e.g. 21-15-9 Thrusters / Pull-ups" :
          category === "run"     ? "e.g. Outdoor track, flat course" :
          "Description"
        }
        value={details}
        onChange={e => setDetails(e.target.value)}
      />
      <Button
        disabled={!title.trim()}
        onClick={() => {
          onSave({ title: title.toUpperCase().trim(), details: details.trim() });
          reset();
        }}
      >
        Next: Log First Record
      </Button>
      <div className="h-2" />
      <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
    </Sheet>
  );
}

// ─── Log Record Sheet ─────────────────────────────────────────
function LogRecordSheet({
  open, movement, category, initial, onClose, onSave,
}: {
  open:      boolean;
  movement:  string;
  category:  Category;
  initial?:  RecordEntry | null;
  onClose:   () => void;
  onSave:    (data: {
    weight?:      number;
    reps?:        number;
    distance?:    number;
    timeSeconds?: number;
    notes?:       string;
    date:         string;
  }) => void;
}) {
  const [weight,   setWeight]   = useState(initial?.weight?.toString()   ?? "");
  const [reps,     setReps]     = useState(initial?.reps?.toString()     ?? "");
  const [distance, setDistance] = useState(initial?.distance?.toString() ?? "");
  const [timeStr,  setTimeStr]  = useState(
    initial?.timeSeconds ? formatTime(initial.timeSeconds) : ""
  );
  const [notes,    setNotes]    = useState(initial?.notes ?? "");
  const [date,     setDate]     = useState(
    initial?.date ?? new Date().toISOString().split("T")[0]
  );

  const meta = CATEGORY_META[category];

  const reset = () => {
    setWeight(""); setReps(""); setDistance(""); setTimeStr(""); setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const canSave =
    category === "wl"      ? !!weight :
    category === "workout" ? !!(weight || reps) :
    category === "run"     ? !!(distance || timeStr) :
    false;

  const handleSave = () => {
    onSave({
      weight:      weight      ? parseFloat(weight)   : undefined,
      reps:        reps        ? parseInt(reps)        : undefined,
      distance:    distance    ? parseFloat(distance)  : undefined,
      timeSeconds: timeStr     ? parseTime(timeStr)    : undefined,
      notes:       notes       || undefined,
      date,
    });
    reset();
  };

  return (
    <Sheet
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={movement}
    >
      <div className="mb-4 text-[10px] tracking-[2px] uppercase"
        style={{ fontFamily: "'DM Mono', monospace", color: meta.color }}>
        {meta.label}
      </div>

      {/* WL — weight only */}
      {category === "wl" && (
        <Input
          label="Max Weight (kg)"
          type="number"
          inputMode="decimal"
          placeholder="e.g. 102.5"
          value={weight}
          onChange={e => setWeight(e.target.value)}
        />
      )}

      {/* Workout — weight + reps */}
      {category === "workout" && (
        <>
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 43"
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
          <Input
            label="Reps"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 21"
            value={reps}
            onChange={e => setReps(e.target.value)}
          />
        </>
      )}

      {/* Run — distance + time */}
      {category === "run" && (
        <>
          <Input
            label="Distance (km)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 5.0"
            value={distance}
            onChange={e => setDistance(e.target.value)}
          />
          <Input
            label="Time (mm:ss or hh:mm:ss)"
            placeholder="e.g. 27:14"
            value={timeStr}
            onChange={e => setTimeStr(e.target.value)}
          />
        </>
      )}

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      <Textarea
        label="Notes (optional)"
        placeholder="Conditions, how it felt..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <Button disabled={!canSave} onClick={handleSave}>
        {initial ? "Save Changes" : "Save Record"}
      </Button>
      <div className="h-2" />
      <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
    </Sheet>
  );
}