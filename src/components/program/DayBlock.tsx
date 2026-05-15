import SessionDetail from "@/components/program/SessionDetail";
import { SessionType, SetLog, RoundEntry } from "@/types";

const FEEL_COLOR = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];
const FEEL_LABEL = ["Spent","Okay","Good","Pumped","Beast"];

export interface DaySession {
  id:      string;
  type:    SessionType;
  name:    string;
  desc?:   string;
  sets?:   SetLog[];
  rounds?: RoundEntry[];
  result?: string | null;
  notes?:  string | null;
  aiNote?: string | null;
}

export interface DayData {
  date:     string;
  label:    string;
  isToday?: boolean;
  sessions: DaySession[];
  aiSummary?: string | null;
  aiChips?:   string[];
  recovery?: {
    energy: number;
    sore:   string[];
    sleep:  string;
    notes?: string;
  } | null;
}

export default function DayBlock({ day }: { day: DayData }) {
  return (
    <div className="mb-6">
      {/* day label */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="text-[10px] tracking-[2px] uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: day.isToday ? "var(--acc)" : "var(--mu)",
          }}
        >
          {day.label}
          {day.isToday && (
            <span
              className="ml-2 px-2 py-[2px] rounded-full text-[9px]"
              style={{ background: "var(--acc)", color: "#000", fontWeight: 600 }}
            >
              TODAY
            </span>
          )}
        </div>
        <div
          className="flex-1 h-[1px]"
          style={{ background: "var(--br)" }}
        />
        <div
          className="text-[10px]"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
        >
          {day.sessions.length} session{day.sessions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* sessions */}
      {day.sessions.map((s) => (
        <SessionDetail
          key={s.id}
          name={s.name}
          type={s.type}
          desc={s.desc}
          sets={s.sets}
          rounds={s.rounds}
          result={s.result}
          notes={s.notes}
          aiNote={s.aiNote}
        />
      ))}

      {/* AI summary for the day */}
      {day.aiSummary && (
        <div
          className="rounded-[10px] px-4 py-3 mb-2"
          style={{ background: "#001a0d", border: "1px solid #003322" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ background: "var(--grn)" }}
            />
            <span
              className="text-[9px] tracking-[2px] uppercase"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
            >
              AI Pre-Session Note
            </span>
          </div>
          <p className="text-[12px] leading-relaxed mb-2" style={{ color: "#b8d4c8" }}>
            {day.aiSummary}
          </p>
          {day.aiChips && day.aiChips.length > 0 && (
            <div className="flex flex-wrap gap-[5px]">
              {day.aiChips.map((c) => (
                <span
                  key={c}
                  className="text-[10px] px-2 py-[2px] rounded-full"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: "#002216",
                    border:     "1px solid #003322",
                    color:      "var(--grn)",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* recovery */}
      {day.recovery && (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-[8px]"
          style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
        >
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ background: FEEL_COLOR[day.recovery.energy] }}
          />
          <span
            className="text-[11px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
          >
            {FEEL_LABEL[day.recovery.energy]}
          </span>
          <span style={{ color: "var(--br2)" }}>·</span>
          <span
            className="text-[11px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            {day.recovery.sleep}
          </span>
          {day.recovery.sore.length > 0 && (
            <>
              <span style={{ color: "var(--br2)" }}>·</span>
              <span
                className="text-[11px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
              >
                Sore: {day.recovery.sore.join(", ")}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}