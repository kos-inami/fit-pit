"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Select, Textarea, Label } from "@/components/ui/Input";
import { RecoveryLog } from "@/types";

const FATIGUE_OPTIONS = [
  { emoji: "😴", label: "Spent"  },
  { emoji: "🙂", label: "Okay"   },
  { emoji: "💪", label: "Good"   },
  { emoji: "🔥", label: "Pumped" },
  { emoji: "⚡", label: "Beast"  },
];

const BODY_PARTS = [
  "Shoulders", "Lower Back", "Quads", "Hamstrings",
  "Calves", "Forearms", "Core", "Glutes",
];

interface RecoverySheetProps {
  open:    boolean;
  onClose: () => void;
  onSave:  (data: RecoveryLog) => void;
}

export default function RecoverySheet({ open, onClose, onSave }: RecoverySheetProps) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [sore,   setSore]   = useState<string[]>([]);
  const [sleep,  setSleep]  = useState("6–8h — decent");
  const [notes,  setNotes]  = useState("");

  const toggleSore = (part: string) => {
    setSore(prev =>
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    );
  };

  const handleSave = () => {
    onSave({ energy: energy ?? 2, sore, sleep, notes });
    setEnergy(null); setSore([]); setSleep("6–8h — decent"); setNotes("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Recovery Check">

      {/* energy */}
      <div className="mb-5">
        <Label>Overall Energy</Label>
        <div className="grid grid-cols-5 gap-[5px] mt-[7px]">
          {FATIGUE_OPTIONS.map((f, i) => (
            <button
              key={i}
              onClick={() => setEnergy(i)}
              className="rounded-[8px] py-[9px] flex flex-col items-center gap-[3px] transition-all cursor-pointer"
              style={{
                background:  energy === i ? "#161600" : "var(--s2)",
                border:      `1px solid ${energy === i ? "var(--acc)" : "var(--br)"}`,
              }}
            >
              <span className="text-[18px]">{f.emoji}</span>
              <span className="text-[9px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* sore areas */}
      <div className="mb-5">
        <Label>Sore / Tight Areas</Label>
        <div className="grid grid-cols-2 gap-[5px] mt-[7px]">
          {BODY_PARTS.map((part) => (
            <button
              key={part}
              onClick={() => toggleSore(part)}
              className="rounded-[8px] px-3 py-[9px] flex items-center gap-2 text-[13px] transition-all cursor-pointer text-left"
              style={{
                background: sore.includes(part) ? "#1a0500" : "var(--s2)",
                border:     `1px solid ${sore.includes(part) ? "var(--red)" : "var(--br)"}`,
                color:      sore.includes(part) ? "#ff8066"  : "var(--tx)",
              }}
            >
              <span
                className="w-[15px] h-[15px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-[9px]"
                style={{
                  background: sore.includes(part) ? "var(--red)" : "transparent",
                  border:     `1.5px solid ${sore.includes(part) ? "var(--red)" : "var(--br)"}`,
                  color: "#fff",
                }}
              >
                {sore.includes(part) ? "✓" : ""}
              </span>
              {part}
            </button>
          ))}
        </div>
      </div>

      {/* sleep */}
      <Select
        label="Sleep Last Night"
        value={sleep}
        onChange={(e) => setSleep(e.target.value)}
      >
        <option>8+h — great</option>
        <option>6–8h — decent</option>
        <option>4–6h — poor</option>
        <option>Under 4h — rough</option>
      </Select>

      {/* notes */}
      <Textarea
        label="Anything else?"
        placeholder="Diet, stress, motivation, life stuff..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Button onClick={handleSave}>Complete Day</Button>
      <div className="h-2" />
      <Button variant="outline" onClick={onClose}>Skip Recovery</Button>
    </Sheet>
  );
}