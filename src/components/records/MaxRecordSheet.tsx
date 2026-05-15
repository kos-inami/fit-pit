"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { RecordType, MaxRecordEntry, formatRecordValue } from "@/types";

const RECORD_TYPES: { value: RecordType; label: string; placeholder: string }[] = [
  { value: "weight",   label: "Weight (kg)",  placeholder: "e.g. 102.5"  },
  { value: "time",     label: "Time (secs)",  placeholder: "e.g. 312 (= 5:12)" },
  { value: "reps",     label: "Reps",         placeholder: "e.g. 50"     },
  { value: "distance", label: "Distance (km)",placeholder: "e.g. 5.1"    },
];

interface MaxRecordSheetProps {
  open:       boolean;
  onClose:    () => void;
  onSave:     (entry: Omit<MaxRecordEntry, "id">) => void;
  editEntry?: MaxRecordEntry | null;
}

export default function MaxRecordSheet({
  open, onClose, onSave, editEntry,
}: MaxRecordSheetProps) {
  const [movement, setMovement] = useState(editEntry?.movement ?? "");
  const [type,     setType]     = useState<RecordType>(editEntry?.type ?? "weight");
  const [value,    setValue]    = useState(editEntry?.value?.toString() ?? "");
  const [notes,    setNotes]    = useState(editEntry?.notes ?? "");
  const [date,     setDate]     = useState(
    editEntry?.date ?? new Date().toISOString().split("T")[0]
  );

  const typeMeta  = RECORD_TYPES.find(t => t.value === type)!;
  const canSave   = movement.trim().length > 0 && value.trim().length > 0;
  const isEdit    = !!editEntry;

  const reset = () => {
    setMovement(""); setType("weight"); setValue(""); setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      movement: movement.toUpperCase().trim(),
      type,
      value:    parseFloat(value),
      notes:    notes.trim(),
      date,
    });
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Sheet open={open} onClose={handleClose} title={isEdit ? "Edit Record" : "Add Max Record"}>

      <Input
        label="Movement"
        placeholder="e.g. Back Squat, Fran, 5K Run"
        value={movement}
        onChange={e => setMovement(e.target.value)}
      />

      {/* type picker */}
      <div className="mb-[14px]">
        <Label>Record Type</Label>
        <div className="grid grid-cols-2 gap-[7px] mt-[7px]">
          {RECORD_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className="rounded-[9px] py-[10px] text-center cursor-pointer transition-all"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize:   12,
                background: type === t.value ? "var(--acc)" : "var(--s2)",
                border:     `1px solid ${type === t.value ? "var(--acc)" : "var(--br)"}`,
                color:      type === t.value ? "#000" : "var(--mu2)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={typeMeta.label}
        placeholder={typeMeta.placeholder}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => setValue(e.target.value)}
      />

      {/* live preview */}
      {value && !isNaN(parseFloat(value)) && (
        <div
          className="rounded-[8px] px-4 py-3 mb-[14px] text-center"
          style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
        >
          <span
            className="text-[22px] tracking-[1px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
          >
            {formatRecordValue(parseFloat(value), type)}
          </span>
        </div>
      )}

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      <Textarea
        label="Notes (optional)"
        placeholder="Competition, gym, conditions..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <Button onClick={handleSave} disabled={!canSave}>
        {isEdit ? "Save Changes" : "Add Record"}
      </Button>
      <div className="h-2" />
      <Button variant="outline" onClick={handleClose}>Cancel</Button>
    </Sheet>
  );
}