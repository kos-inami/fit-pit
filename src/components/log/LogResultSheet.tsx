"use client";

import { useState, useEffect } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";
import SetLogger from "@/components/log/SetLogger";
import RoundLogger from "@/components/log/RoundLogger";
import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType, SetLog, RoundEntry } from "@/types";

interface LogResultSheetProps {
  open:                 boolean;
  onClose:              () => void;
  session:              { id: string; name: string; type: SessionType; aiNote?: string | null } | null;
  onSave:               (data: {
    result?:       string;
    notes?:        string;
    sets?:         SetLog[];
    resultRounds?: RoundEntry[];
  }) => void;
  onDelete?:            () => void;
  initialSets?:         SetLog[];
  initialResultRounds?: RoundEntry[];
  initialResult?:       string;
  initialNotes?:        string;
}

export default function LogResultSheet({
  open, onClose, session, onSave, onDelete,
  initialSets = [], initialResultRounds = [],
  initialResult = "", initialNotes = "",
}: LogResultSheetProps) {
  const [result, setResult] = useState(initialResult);
  const [notes,  setNotes]  = useState(initialNotes);
  const [sets,   setSets]   = useState<SetLog[]>(initialSets);
  const [rounds, setRounds] = useState<RoundEntry[]>(initialResultRounds);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // sync state when props change (handles reopen of same session)
  useEffect(() => {
    const id = setTimeout(() => {
      setResult(initialResult);
      setNotes(initialNotes);
    }, 0);
    return () => clearTimeout(id);
  }, [initialResult, initialNotes]);

  if (!session) return null;

  const meta      = SESSION_TYPE_META[session.type];
  const useSets   = meta.useSets;
  const useRounds = session.type === "wod" || session.type === "zone";

  const canSave =
    useSets   ? (sets.length > 0   || result.trim().length > 0) :
    useRounds ? (rounds.length > 0 || result.trim().length > 0) :
    result.trim().length > 0;

  const handleSave = () => {
    if (useSets)        onSave({ result: result.trim(), notes, sets });
    else if (useRounds) onSave({ result: result.trim(), notes, resultRounds: rounds });
    else                onSave({ result: result.trim(), notes });
    setResult(""); setNotes(""); setSets([]); setRounds([]);
    onClose();
  };

  const handleClose = () => {
    setResult(""); setNotes(""); setSets([]); setRounds([]);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose}>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[24px] tracking-[2px]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: meta.color }}>
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