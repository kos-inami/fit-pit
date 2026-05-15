"use client";

interface WeekDay {
  date:         string;
  dayLetter:    string;
  dayNum:       number;
  isToday:      boolean;
  isPast:       boolean;
  sessionCount: number;
}

interface WeekSelectorProps {
  days:        WeekDay[];
  selected:    string;
  onSelect:    (date: string) => void;
  onPrevWeek:  () => void;
  onNextWeek:  () => void;
  canGoNext:   boolean;
}

export default function WeekSelector({
  days, selected, onSelect, onPrevWeek, onNextWeek, canGoNext,
}: WeekSelectorProps) {
  return (
    <div className="mb-5">
      {/* week nav arrows */}
      <div className="flex items-center justify-between my-[0.5rem]">
        <button
          onClick={onPrevWeek}
          className="rounded-[6px] px-3 py-1 text-[14px] cursor-pointer transition-colors"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: "var(--s2)",
            border:     "1px solid var(--br)",
            color:      "var(--mu2)",
          }}
        >
          ← Prev
        </button>
        <span
          className="text-[14px] tracking-[2px] uppercase"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}
        >
          {weekRangeLabel(days)}
        </span>
        <button
          onClick={onNextWeek}
          disabled={!canGoNext}
          className="rounded-[6px] px-3 py-1 text-[14px] cursor-pointer transition-colors"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: "var(--s2)",
            border:     "1px solid var(--br)",
            color:      canGoNext ? "var(--mu2)" : "var(--br2)",
            opacity:    canGoNext ? 1 : 0.4,
          }}
        >
          Next →
        </button>
      </div>

      {/* day pills */}
      <div className="flex my-[0.5rem]">
        {days.map((d) => {
          const isSelected = d.date === selected;
          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              className="flex-1 rounded-[10px] py-[10px] flex flex-col items-center gap-[4px] cursor-pointer transition-all"
              style={{
                background: isSelected
                  ? "var(--acc)"
                  : d.isToday
                  ? "var(--s2)"
                  : "var(--s2)",
                border: isSelected
                  ? "1px solid var(--acc)"
                  : d.isToday
                  ? "1px solid var(--acc)"
                  : "1px solid var(--br)",
              }}
            >
              {/* day letter */}
              <span
                className="text-[9px] tracking-[1px] uppercase"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: isSelected ? "#000" : d.isToday ? "var(--acc)" : "var(--mu)",
                }}
              >
                {d.dayLetter}
              </span>

              {/* date number */}
              <span
                className="text-[15px] leading-none"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  color: isSelected ? "#000" : d.isToday ? "var(--acc)" : "var(--tx)",
                }}
              >
                {d.dayNum}
              </span>

              {/* session dot */}
              <div
                className="w-[5px] h-[5px] rounded-full"
                style={{
                  background: d.sessionCount > 0
                    ? isSelected ? "#000" : "var(--grn)"
                    : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function weekRangeLabel(days: WeekDay[]): string {
  if (days.length === 0) return "";
  const first = new Date(days[0].date);
  const last  = new Date(days[6].date);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (first.getMonth() === last.getMonth()) {
    return `${months[first.getMonth()]} ${first.getDate()}–${last.getDate()}`;
  }
  return `${months[first.getMonth()]} ${first.getDate()} – ${months[last.getMonth()]} ${last.getDate()}`;
}