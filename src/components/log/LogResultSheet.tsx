"use client";

import { useState } from "react";
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
  initialSets?:         SetLog[];
  initialResultRounds?: RoundEntry[];
}

export default function LogResultSheet({
  open, onClose, session, onSave,
  initialSets = [], initialResultRounds = [],
}: LogResultSheetProps) {
  const [result, setResult] = useState("");
  const [notes,  setNotes]  = useState("");
  const [sets,   setSets]   = useState<SetLog[]>(initialSets);
  const [rounds, setRounds] = useState<RoundEntry[]>(initialResultRounds);

  if (!session) return null;

  const meta      = SESSION_TYPE_META[session.type];
  const useSets   = meta.useSets;
  const useRounds = session.type === "wod" || session.type === "zone";

  const canSave =
    useSets    ? sets.length > 0   :
    useRounds  ? rounds.length > 0 :
    result.trim().length > 0;

  const handleSave = () => {
    if (useSets)        onSave({ notes, sets });
    else if (useRounds) onSave({ notes, resultRounds: rounds });
    else                onSave({ result: result.trim(), notes });
    setResult(""); setNotes(""); setSets([]); setRounds([]);
    onClose();
  };

  const handleClose = () => {
    setResult(""); setNotes(""); setSets([]); setRounds([]);
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

      {/* free text — Run / other */}
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
    </Sheet>
  );
}