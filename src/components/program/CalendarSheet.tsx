"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";

interface CalendarSheetProps {
  open:              boolean;
  onClose:           () => void;
  datesWithSessions: string[];
  onSelectDate:      (date: string) => void;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LETTERS = ["M","T","W","T","F","S","S"];

export default function CalendarSheet({
  open, onClose, datesWithSessions, onSelectDate,
}: CalendarSheetProps) {
  const today = new Date();

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear,  setViewYear]  = useState(today.getFullYear());

  const firstDay    = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toDateStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  const todayStr =
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next > today) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= today;

  return (
    <Sheet open={open} onClose={onClose} title="Training History">

      {/* month nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="rounded-[6px] px-3 py-2 text-[11px] cursor-pointer"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: "var(--s2)", border: "1px solid var(--br)", color: "var(--mu2)",
          }}
        >
          ← Prev
        </button>
        <span
          className="text-[16px] tracking-[2px]"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="rounded-[6px] px-3 py-2 text-[11px] cursor-pointer"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: "var(--s2)", border: "1px solid var(--br)",
            color:   canGoNext ? "var(--mu2)" : "var(--br)",
            opacity: canGoNext ? 1 : 0.3,
          }}
        >
          Next →
        </button>
      </div>

      {/* day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LETTERS.map((d, i) => (
          <div key={i} className="text-center text-[10px] py-1"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-[4px]">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;

          const dateStr    = toDateStr(day);
          const isToday    = dateStr === todayStr;
          const hasSession = datesWithSessions.includes(dateStr);

          return (
            <button
              key={i}
              onClick={() => { if (hasSession) { onSelectDate(dateStr); onClose(); } }}
              className="aspect-square rounded-[8px] flex flex-col items-center justify-center gap-[2px] transition-all"
              style={{
                background: isToday ? "var(--acc)" : hasSession ? "var(--s2)" : "transparent",
                border:     isToday ? "1px solid var(--acc)" : hasSession ? "1px solid var(--br)" : "1px solid transparent",
                cursor:     hasSession ? "pointer" : "default",
              }}
            >
              <span
                className="text-[13px] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: isToday ? "#000" : "var(--tx)" }}
              >
                {day}
              </span>
              {hasSession && (
                <div className="w-[4px] h-[4px] rounded-full"
                  style={{ background: isToday ? "#000" : "var(--grn)" }} />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[10px]"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
        Tap a highlighted day to view sessions
      </p>
    </Sheet>
  );
}