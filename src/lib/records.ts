// ─── shared max-record types & presentation helpers ───────────
// Used by both the records page (full CRUD) and the read-only
// trainer client view (display only).

export type RecordCategory = "wl" | "workout" | "run";

export interface RecordEntry {
    id:           string;
    movement:     string;
    category:     RecordCategory;
    details?:     string | null;
    weight?:      number | null;
    reps?:        number | null;
    distance?:    number | null;
    timeSeconds?: number | null;
    notes?:       string | null;
    isExpected:   boolean;
    date:         string;
}

export const CATEGORY_META: Record<RecordCategory, { label: string; color: string }> = {
    wl:      { label: "Weight Lifting", color: "#5cb8ff" },
    workout: { label: "Workout",        color: "#3cffa0" },
    run:     { label: "Run",            color: "#e8ff3c" },
};

export function formatTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${m}:${String(s).padStart(2,"0")}`;
}

export function getBestLabel(records: RecordEntry[], category: RecordCategory): string {
    const actual = records.filter(r => !r.isExpected);
    if (actual.length === 0) return "";
    if (category === "wl") {
        const best = Math.max(...records.map(r => r.weight ?? 0));
        return `${best}kg`;
    }
    if (category === "workout") {
        const r = records[0];
        const parts: string[] = [];
        if (r.weight) parts.push(`${r.weight}kg`);
        if (r.reps)   parts.push(`${r.reps} reps`);
        return parts.join(" · ") || "Logged";
    }
    if (category === "run") {
        const best = records.reduce((a, b) =>
            (a.timeSeconds ?? Infinity) < (b.timeSeconds ?? Infinity) ? a : b
        );
        const parts: string[] = [];
        if (best.distance)    parts.push(`${best.distance}km`);
        if (best.timeSeconds) parts.push(formatTime(best.timeSeconds));
        return parts.join(" · ") || "Logged";
    }
    return "Logged";
}

export function getLastDate(records: RecordEntry[]): string {
    if (records.length === 0) return "";
    return new Date(records[0].date + "T00:00:00").toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
    });
}
