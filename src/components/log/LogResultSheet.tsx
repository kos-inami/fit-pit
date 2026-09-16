"use client";

import { useState, useEffect } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";
import SetLogger from "@/components/log/SetLogger";
import RoundLogger from "@/components/log/RoundLogger";
import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType, SetLog, RoundEntry } from "@/types";
import { FEELINGS } from "@/lib/feelings";

interface LogResultSheetProps {
  open:                 boolean;
  onClose:              () => void;
  session:              { id: string; name: string; type: SessionType; aiNote?: string | null; isRestDay: boolean } | null;
  onSave:               (data: {
    result?:         string;
    notes?:          string;
    sets?:           SetLog[];
    resultRounds?:   RoundEntry[];
    feeling?:        string | null;
    feelingComment?: string | null;
  }) => void;
  onDelete?:            () => void;
  initialSets?:         SetLog[];
  initialResultRounds?: RoundEntry[];
  initialResult?:       string;
  initialNotes?:        string;
  initialFeeling?:        string | null;
  initialFeelingComment?: string | null;
}

function FeelingSection({ feeling, setFeeling, comment, setComment }: {
  feeling: string | null; setFeeling: (v: string | null) => void;
  comment: string; setComment: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <Label>How did it feel?</Label>
      <div className="flex gap-[6px] mb-2">
        {FEELINGS.map(f => {
          const selected = feeling === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFeeling(selected ? null : f.value)}
              className="flex-1 flex flex-col items-center gap-1 rounded-[10px] py-[8px] cursor-pointer transition-all"
              style={{
                background: selected ? "#001a0d" : "var(--s2)",
                border:     `1px solid ${selected ? "var(--grn)" : "var(--br)"}`,
              }}
            >
              <span className="text-[18px]">{f.emoji}</span>
              <span className="text-[9px] tracking-[0.5px]"
                style={{ fontFamily: "'DM Mono', monospace", color: selected ? "var(--grn)" : "var(--mu)" }}>
                {f.label}
              </span>
            </button>
          );
        })}
      </div>
      {feeling && (
        <textarea
          rows={2}
          placeholder="Add a comment... (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full rounded-[8px] p-[0.5rem] text-[12px] outline-none resize-none"
          style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Sans', sans-serif" }}
        />
      )}
    </div>
  );
}

export default function LogResultSheet({
  open, onClose, session, onSave, onDelete,
  initialSets = [], initialResultRounds = [],
  initialResult = "", initialNotes = "",
  initialFeeling = null, initialFeelingComment = null,
}: LogResultSheetProps) {
  const [result, setResult] = useState(initialResult);
  const [notes,  setNotes]  = useState(initialNotes);
  const [sets,   setSets]   = useState<SetLog[]>(initialSets);
  const [rounds, setRounds] = useState<RoundEntry[]>(initialResultRounds);
  const [feeling,        setFeeling]        = useState<string | null>(initialFeeling);
  const [feelingComment, setFeelingComment] = useState(initialFeelingComment ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // sync state when props change (handles reopen of same session)
  useEffect(() => {
    const id = setTimeout(() => {
      setResult(initialResult);
      setNotes(initialNotes);
      setFeeling(initialFeeling);
      setFeelingComment(initialFeelingComment ?? "");
    }, 0);
    return () => clearTimeout(id);
  }, [initialResult, initialNotes, initialFeeling, initialFeelingComment]);

  if (!session) return null;

  const isRestDay = session.isRestDay;
  const meta      = isRestDay ? null : SESSION_TYPE_META[session.type];
  const useSets   = meta?.useSets ?? false;
  const useRounds = !isRestDay && (session.type === "wod" || session.type === "zone");

  const canSave = isRestDay ? true :
    useSets   ? (sets.length > 0   || result.trim().length > 0) :
    useRounds ? (rounds.length > 0 || result.trim().length > 0) :
    result.trim().length > 0;

  const handleSave = () => {
    const feelingPayload = { feeling, feelingComment: feeling ? (feelingComment.trim() || null) : null };
    if (isRestDay)       onSave({ notes, ...feelingPayload });
    else if (useSets)    onSave({ result: result.trim(), notes, sets, ...feelingPayload });
    else if (useRounds)  onSave({ result: result.trim(), notes, resultRounds: rounds, ...feelingPayload });
    else                 onSave({ result: result.trim(), notes, ...feelingPayload });
    setResult(""); setNotes(""); setSets([]); setRounds([]); setFeeling(null); setFeelingComment("");
    onClose();
  };

  const handleClose = () => {
    setResult(""); setNotes(""); setSets([]); setRounds([]); setFeeling(null); setFeelingComment("");
    setConfirmDelete(false);
    onClose();
  };

  if (isRestDay) {
    return (
      <Sheet open={open} onClose={handleClose}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-[24px] tracking-[2px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>
            🛌 {session.name}
          </h2>
        </div>

        <Textarea
          label="Notes"
          placeholder="How did the rest day go?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <FeelingSection feeling={feeling} setFeeling={setFeeling} comment={feelingComment} setComment={setFeelingComment} />

        <Button onClick={handleSave} disabled={!canSave}>Save Note</Button>
        <div className="h-2" />
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[24px] tracking-[2px]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta!.color }}>
          {session.name}
        </h2>
        <TypeChip type={session.type} />
      </div>

      {/* AI target */}
      {session.aiNote && (
        <div className="rounded-[8px] p-3 mb-4"
          style={{ background: "#001a0d", border: "1px solid #003322" }}>
          <div className="text-[9px] tracking-[2px] uppercase mb-1"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
            Target
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "#b8d4c8" }}>
            {session.aiNote}
          </p>
        </div>
      )}

      {/* result comment — WOD / Zone / Strength / WL / Accessory */}
      {(useSets || useRounds) && (
        <div className="mt-[0.5rem]">
          <Textarea
            label="Result"
            placeholder="e.g. New PR! Finished in 5:32..."
            value={result}
            onChange={e => setResult(e.target.value)}
          />
        </div>
      )}

      {/* result sets — Strength / WL / Accessory */}
      {useSets && (
        <div className="mb-4">
          <Label>Log Sets (Actual)</Label>
          <SetLogger
            sets={sets.length > 0 ? sets : initialSets}
            onChange={setSets}
            defaultPercent={false}
          />
        </div>
      )}

      {/* result rounds — WOD / Zone */}
      {useRounds && (
        <div className="mb-4">
          <Label>Log Result Rounds</Label>
          <RoundLogger
            rounds={rounds.length > 0 ? rounds : initialResultRounds}
            onChange={setRounds}
          />
        </div>
      )}

      {/* free text result — Run / other */}
      {!useSets && !useRounds && (
        <Textarea
          label="Result"
          placeholder="e.g. 27:14  ·  5.1km  ·  Avg HR 148"
          value={result}
          onChange={e => setResult(e.target.value)}
        />
      )}

      <Textarea
        label="Notes"
        placeholder="How did it feel? What happened?"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <FeelingSection feeling={feeling} setFeeling={setFeeling} comment={feelingComment} setComment={setFeelingComment} />

      <Button onClick={handleSave} disabled={!canSave}>Save Result</Button>
      <div className="h-2" />
      <Button variant="outline" onClick={handleClose}>Cancel</Button>

      {onDelete && (
        <>
          <div className="h-[1px] my-5" style={{ background: "var(--br)" }} />
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-[8px] py-[11px] text-[12px] cursor-pointer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  background: "transparent",
                  border:     "1px solid var(--br2)",
                  color:      "var(--mu2)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmDelete(false); onDelete(); }}
                className="flex-1 rounded-[8px] py-[11px] text-[13px] tracking-[1px] cursor-pointer"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  background: "var(--red)",
                  border:     "none",
                  color:      "#fff",
                }}
              >
                Yes, Delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-[8px] py-[11px] text-[13px] tracking-[1px] cursor-pointer"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: "transparent",
                border:     "1px solid var(--red)",
                color:      "var(--red)",
              }}
            >
              Delete Result
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}