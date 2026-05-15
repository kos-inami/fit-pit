import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType } from "@/types";

interface SessionSummary {
  name:   string;
  type:   SessionType;
  result: string;
}

interface RecentDayCardProps {
  dateLabel: string;
  sessions:  SessionSummary[];
  energy:    number;
}

const FEEL_COLOR  = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];
const FEEL_LABEL  = ["Spent","Okay","Good","Pumped","Beast"];

export default function RecentDayCard({ dateLabel, sessions, energy }: RecentDayCardProps) {
  return (
    <div
      className="rounded-[12px] mb-3 overflow-hidden"
      style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
    >
      {/* date row */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--br)" }}
      >
        <span
          className="text-[10px] tracking-[1.5px] uppercase"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
        >
          {dateLabel}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: FEEL_COLOR[energy] }}
          />
          <span
            className="text-[10px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            {FEEL_LABEL[energy]}
          </span>
        </div>
      </div>

      {/* sessions */}
      {sessions.map((s, i) => {
        const meta = SESSION_TYPE_META[s.type];
        return (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-[10px]"
            style={{ borderBottom: i < sessions.length - 1 ? "1px solid var(--br)" : "none" }}
          >
            <div className="flex items-center gap-2">
              <TypeChip type={s.type} />
              <span
                className="text-[14px] tracking-[0.5px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {s.name}
              </span>
            </div>
            <span
              className="text-[12px]"
              style={{ fontFamily: "'DM Mono', monospace", color: meta.color }}
            >
              {s.result}
            </span>
          </div>
        );
      })}
    </div>
  );
}