import { SESSION_TYPE_META, SessionType } from "@/types";

const TYPE_EMOJI: Record<SessionType, string> = {
    wod:        "WOD",
    strength:   "STR",
    weightlift: "WL",
    zone:       "ZONE",
    run:        "RUN",
    accessory:  "ACC",
};

export default function TypeChip({ type }: { type: SessionType }) {
    const meta = SESSION_TYPE_META[type];
    return (
        <span
        className="inline-flex items-center text-xs px-[9px] py-[3px] rounded-full font-medium whitespace-nowrap"
        style={{
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            color:      meta.color,
            background: hexWithOpacity(meta.color, 0.08),
            border:     `1px solid ${hexWithOpacity(meta.color, 0.3)}`,
        }}
        >
        {/* {TYPE_EMOJI[type]}  */}
        {meta.label}
        </span>
    );
}

function hexWithOpacity(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
}