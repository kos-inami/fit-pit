// ─── SESSION TYPES ───────────────────────────────────────────
export type SessionType =
    | "wod"
    | "strength"
    | "weightlift"
    | "zone"
    | "run"
    | "accessory";

export type SessionTypeMeta = {
    label: string;
    emoji: string;
    color: string;
    useSets: boolean;
};

export const SESSION_TYPE_META: Record<SessionType, SessionTypeMeta> = {
    wod:        { label: "WOD",         emoji: "WOD",  color: "#3cffa0", useSets: false },
    strength:   { label: "Strength",    emoji: "STR",  color: "#c084fc", useSets: true  },
    weightlift: { label: "Weight Lift", emoji: "WL",   color: "#5cb8ff", useSets: true  },
    zone:       { label: "Zone",        emoji: "ZONE", color: "#ff9055", useSets: false },
    run:        { label: "Run",         emoji: "RUN",  color: "#e8ff3c", useSets: false },
    accessory:  { label: "Accessories", emoji: "ACC",  color: "#f87171", useSets: true  },
};

// ─── SET ─────────────────────────────────────────────────────
export type SetLog = {
    id?:         string;
    setNumber:   number;
    weight:      number | null;
    percentage:  number | null;
    reps:        number | null;
    notes:       string;
};

// ─── SESSION ─────────────────────────────────────────────────
export type SessionWithSets = {
    id:      string;
    type:    SessionType;
    name:    string;
    desc:    string;
    result:  string | null;
    scale:   string | null;
    notes:   string | null;
    sets:    SetLog[];
    order:   number;
    aiNote:  string | null;
};

// ─── DAY ─────────────────────────────────────────────────────
export type DayWithSessions = {
    id:           string;
    date:         string;
    sessions:     SessionWithSets[];
    recovery:     RecoveryLog | null;
    aiSuggestion: AISuggestionData | null;
};

// ─── RECOVERY ────────────────────────────────────────────────
export type RecoveryLog = {
    energy: number;
    sore:   string[];
    sleep:  string;
    notes:  string;
};

// ─── AI ──────────────────────────────────────────────────────
export type AISuggestionData = {
    summary:      string;
    perSession:   Record<string, string>;
    chips:        string[];
    recoveryNote: string;
};

// ─── MAX RECORD ──────────────────────────────────────────────
export type RecordType = "weight" | "time" | "reps" | "distance";

export type MaxRecordEntry = {
    id:       string;
    movement: string;
    type:     RecordType;
    value:    number;
    notes:    string;
    date:     string;
};

// ─── HELPERS ─────────────────────────────────────────────────
export const formatRecordValue = (value: number, type: RecordType): string => {
    switch (type) {
        case "weight":   return `${value}kg`;
        case "time":     return formatTime(value);
        case "reps":     return `${value} reps`;
        case "distance": return `${value}km`;
    }
};

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
};

// ─── ROUND (WOD / Zone) ──────────────────────────────────────
export type RoundEntry = {
    roundNumber: number;
    details:     string;
    weight:      number | null;
    reps:        number | null;
    other:       string;
};

export type ResultRounds = {
    rounds: RoundEntry[];
};