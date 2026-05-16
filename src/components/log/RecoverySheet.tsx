"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { RecoveryLog } from "@/types";

interface RecoverySheetProps {
  open:      boolean;
  onClose:   () => void;
  onSave:    (data: RecoveryLog) => void;
  onDelete?: () => void;
  initial?:  RecoveryLog | null;
}

const ENERGY_LEVELS = [
  { value: 5, label: "Excellent", color: "#3cffa0", emoji: "⚡" },
  { value: 4, label: "Good",      color: "#a8ff78", emoji: "💪" },
  { value: 3, label: "Moderate",  color: "#e8ff3c", emoji: "🙂" },
  { value: 2, label: "Low",       color: "#ff9055", emoji: "😐" },
  { value: 1, label: "Exhausted", color: "#ff4c2b", emoji: "😴" },
];

const SORE_AREAS = [
  "Neck / Traps",
  "Shoulders",
  "Upper Back / Lats",
  "Lower Back",
  "Hips / Glutes",
  "Quads",
  "Hamstrings",
  "Calves",
  "Wrists",
  "Knees",
  "Ankles",
];

const SLEEP_QUALITY_LABELS = ["", "Poor", "Fair", "Okay", "Good", "Great"];

export default function RecoverySheet({
  open, onClose, onSave, onDelete, initial,
}: RecoverySheetProps) {
  const [energy,       setEnergy]       = useState<number>(initial?.energy       ?? 3);
  const [sore,         setSore]         = useState<string[]>(initial?.sore       ?? []);
  const [soreOther,    setSoreOther]    = useState(initial?.soreOther            ?? "");
  const [sleepHours,   setSleepHours]   = useState(initial?.sleepHours?.toString() ?? "");
  const [sleepQuality, setSleepQuality] = useState<number>(initial?.sleepQuality ?? 0);
  const [notes,        setNotes]        = useState(initial?.notes                ?? "");

  const toggleSore = (area: string) => {
    setSore(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleSave = () => {
    onSave({
      energy,
      sore,
      soreOther,
      sleepHours:   sleepHours ? parseFloat(sleepHours) : null,
      sleepQuality: sleepQuality || null,
      notes,
    });
  };

  const selectedEnergy = ENERGY_LEVELS.find(e => e.value === energy);

  return (
    <Sheet open={open} onClose={onClose} title="Recovery Check">

      {/* ── 1. Overall Energy ── */}
      <div className="mb-5">
        <div className="text-[10px] tracking-[2px] uppercase mb-3"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Overall Energy
        </div>
        <div className="space-y-[6px]">
          {ENERGY_LEVELS.map(e => (
            <button
              key={e.value}
              onClick={() => setEnergy(e.value)}
              className="w-full flex items-center gap-3 px-4 py-[11px] rounded-[10px] cursor-pointer transition-all text-left"
              style={{
                background: energy === e.value ? e.color + "18" : "var(--s2)",
                border:     `1px solid ${energy === e.value ? e.color : "var(--br)"}`,
              }}
            >
              <span className="text-[18px] flex-shrink-0">{e.emoji}</span>
              <div className="flex items-center gap-2 flex-1">
                <span
                  className="text-[15px] tracking-[1px]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: energy === e.value ? e.color : "var(--tx)" }}
                >
                  {e.value}
                </span>
                <span
                  className="text-[13px]"
                  style={{ color: energy === e.value ? e.color : "var(--mu2)" }}
                >
                  {e.label}
                </span>
              </div>
              {energy === e.value && (
                <span className="text-[11px] flex-shrink-0"
                  style={{ color: e.color, fontFamily: "'DM Mono', monospace" }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Sore & Tight Areas ── */}
      <div className="mb-5">
        <div className="text-[10px] tracking-[2px] uppercase mb-3"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Sore &amp; Tight Areas
        </div>
        <div className="flex flex-wrap gap-[7px] mb-3">
          {SORE_AREAS.map(area => {
            const selected = sore.includes(area);
            return (
              <button
                key={area}
                onClick={() => toggleSore(area)}
                className="px-3 py-[7px] rounded-full text-[11px] cursor-pointer transition-all"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  background: selected ? "var(--red)" : "var(--s2)",
                  border:     `1px solid ${selected ? "var(--red)" : "var(--br)"}`,
                  color:      selected ? "#fff" : "var(--mu2)",
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
        <textarea
          placeholder="Other (describe any other areas)..."
          value={soreOther}
          onChange={e => setSoreOther(e.target.value)}
          rows={2}
          className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none resize-none"
          style={{
            background: "var(--s2)",
            border:     "1px solid var(--br)",
            color:      "var(--tx)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>

      {/* ── 3. Sleep ── */}
      <div className="mb-5">
        <div className="text-[10px] tracking-[2px] uppercase mb-3"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Sleep Last Night
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] tracking-[1px] uppercase mb-1"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Hours Slept
            </div>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 7.5"
              value={sleepHours}
              onChange={e => setSleepHours(e.target.value)}
              className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
              style={{
                background: "var(--s2)",
                border:     "1px solid var(--br)",
                color:      "var(--tx)",
                fontFamily: "'DM Mono', monospace",
              }}
            />
          </div>
          <div>
            <div className="text-[10px] tracking-[1px] uppercase mb-1"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Sleep Quality
            </div>
            <select
              value={sleepQuality}
              onChange={e => setSleepQuality(parseInt(e.target.value))}
              className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
              style={{
                background: "var(--s2)",
                border:     "1px solid var(--br)",
                color:      sleepQuality ? "var(--tx)" : "var(--mu)",
                fontFamily: "'DM Sans', sans-serif",
                cursor:     "pointer",
              }}
            >
              <option value={0}>— Rate —</option>
              {[5,4,3,2,1].map(q => (
                <option key={q} value={q}>
                  {q} — {SLEEP_QUALITY_LABELS[q]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Anything else ── */}
      <div className="mb-5">
        <div className="text-[10px] tracking-[2px] uppercase mb-2"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
          Anything Else
        </div>
        <textarea
          placeholder="How are you feeling overall? Any illness, stress, nutrition notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none resize-none"
          style={{
            background: "var(--s2)",
            border:     "1px solid var(--br)",
            color:      "var(--tx)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>

      <Button onClick={handleSave}>Save Recovery</Button>
      <div className="h-2" />
      <Button variant="outline" onClick={onClose}>Cancel</Button>

      {onDelete && (
        <>
          <div className="h-[1px] my-5" style={{ background: "var(--br)" }} />
          <Button variant="danger" onClick={onDelete}>Remove Recovery</Button>
        </>
      )}
    </Sheet>
  );
}