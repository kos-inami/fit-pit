import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType, SetLog, RoundEntry } from "@/types";

interface SessionDetailProps {
  name:    string;
  type:    SessionType;
  desc?:   string;
  sets?:   SetLog[];
  rounds?: RoundEntry[];
  result?: string | null;
  notes?:  string | null;
  aiNote?: string | null;
}

export default function SessionDetail({
  name, type, desc, sets = [], rounds = [], result, notes, aiNote,
}: SessionDetailProps) {
  const meta = SESSION_TYPE_META[type];

  return (
    <div
      className="rounded-[10px] mb-[8px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${meta.color}0a 0%, var(--s2) 60%)`,
        border:     `1px solid ${meta.color}28`,
      }}
    >
      {/* head */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[18px] tracking-[1px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {name}
            </span>
            <TypeChip type={type} />
          </div>
          {desc && (
            <div
              className="text-[11px] leading-relaxed mt-[3px] whitespace-pre-line"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
            >
              {desc}
            </div>
          )}
        </div>
      </div>

      {/* AI note */}
      {aiNote && (
        <div
          className="mx-4 mb-3 rounded-[7px] px-3 py-2"
          style={{ background: "#001a0d", border: "1px solid #003322" }}
        >
          <div
            className="text-[9px] tracking-[2px] uppercase mb-1"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
          >
            Coach Note
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "#b8d4c8" }}>
            {aiNote}
          </p>
        </div>
      )}

      {/* sets — Strength / WL / Accessory */}
      {sets.length > 0 && (
        <div className="mx-4 mb-3">
          <div className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-[5px] px-1">
            {["#","KG","REPS","NOTE"].map(h => (
              <span
                key={h}
                className="text-[9px] tracking-[1px] uppercase text-center"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
              >
                {h}
              </span>
            ))}
          </div>
          {sets.map((s) => (
            <div key={s.setNumber} className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 mb-[4px]">
              <span
                className="text-[12px] text-center"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
              >
                {s.setNumber}
              </span>
              <span
                className="text-[12px] text-center"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--tx)" }}
              >
                {s.weight ?? "—"}
              </span>
              <span
                className="text-[12px] text-center"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--tx)" }}
              >
                {s.reps ?? "—"}
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--mu2)" }}
              >
                {s.notes || "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* rounds — WOD / Zone */}
      {rounds.length > 0 && (
        <div className="mx-4 mb-3 space-y-[6px]">
          {rounds.map((r) => (
            <div
              key={r.roundNumber}
              className="rounded-[7px] px-3 py-2"
              style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
            >
              <div
                className="text-[11px] tracking-[1px] mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
              >
                Round {r.roundNumber}
              </div>
              {r.details && (
                <div
                  className="text-[11px] whitespace-pre-line mb-1"
                  style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}
                >
                  {r.details}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {r.weight !== null && (
                  <span className="text-[11px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--tx)" }}>
                    {r.weight}kg
                  </span>
                )}
                {r.reps !== null && (
                  <span className="text-[11px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--tx)" }}>
                    {r.reps} reps
                  </span>
                )}
                {r.other && (
                  <span className="text-[11px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                    {r.other}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* text result — Run */}
      {result && (
        <div
          className="mx-4 mb-3 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: meta.color, fontFamily: "'DM Sans', sans-serif" }}
          >
            {result}
          </p>
        </div>
      )}

      {/* notes */}
      {notes && (
        <div className="mx-4 mb-3">
          <p
            className="text-[12px] italic leading-relaxed"
            style={{ color: "var(--mu2)" }}
          >
            &ldquo;{notes}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}