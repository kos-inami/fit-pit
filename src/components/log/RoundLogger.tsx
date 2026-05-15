"use client";

import { RoundEntry } from "@/types";

interface RoundLoggerProps {
    rounds:   RoundEntry[];
    onChange: (rounds: RoundEntry[]) => void;
}

export default function RoundLogger({ rounds, onChange }: RoundLoggerProps) {

    const addRound = () => {
        onChange([...rounds, {
        roundNumber: rounds.length + 1,
        details:     "",
        weight:      null,
        reps:        null,
        other:       "",
        }]);
    };

    const removeRound = (index: number) => {
        onChange(
        rounds
            .filter((_, i) => i !== index)
            .map((r, i) => ({ ...r, roundNumber: i + 1 }))
        );
    };

    const update = (index: number, field: keyof RoundEntry, value: string) => {
        onChange(rounds.map((r, i) => {
        if (i !== index) return r;
        switch (field) {
            case "weight": return { ...r, weight: value === "" ? null : parseFloat(value) };
            case "reps":   return { ...r, reps:   value === "" ? null : parseInt(value) };
            default:       return { ...r, [field]: value };
        }
        }));
    };

    const inputBase = {
        background: "var(--s2)",
        border:     "1px solid var(--br)",
        color:      "var(--tx)",
        fontFamily: "'DM Sans', sans-serif",
    };

    return (
        <div>
        {rounds.map((round, i) => (
            <div
            key={i}
            className="rounded-[10px] mb-3 p-3"
            style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
            >
            {/* round header */}
            <div className="flex items-center justify-between mb-3">
                <span
                className="text-[16px] tracking-[1px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                >
                Round {round.roundNumber}
                </span>
                <button
                onClick={() => removeRound(i)}
                className="text-[14px] px-2 py-[2px] rounded-[5px] cursor-pointer transition-colors"
                style={{
                    fontFamily: "'DM Mono', monospace",
                    background: "transparent",
                    border:     "1px solid var(--br2)",
                    color:      "var(--red)",
                }}
                >
                Remove
                </button>
            </div>

            {/* workout details */}
            <div className="mb-2">
                <label className="block text-[9px] tracking-[1.5px] uppercase mb-[5px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Workout Details
                </label>
                <textarea
                rows={2}
                placeholder="e.g. 5 Pull-ups / 10 Push-ups / 15 Air Squats"
                value={round.details}
                onChange={(e) => update(i, "details", e.target.value)}
                className="w-full rounded-[7px] px-3 py-[9px] text-[13px] outline-none resize-none leading-relaxed"
                style={inputBase}
                />
            </div>

            {/* weight + reps + time row */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                <label className="block text-[9px] tracking-[1px] uppercase mb-[5px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Weight (kg)
                </label>
                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="—"
                    value={round.weight ?? ""}
                    onChange={(e) => update(i, "weight", e.target.value)}
                    className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                    style={inputBase}
                />
                </div>
                <div>
                <label className="block text-[9px] tracking-[1px] uppercase mb-[5px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Reps
                </label>
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    value={round.reps ?? ""}
                    onChange={(e) => update(i, "reps", e.target.value)}
                    className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                    style={inputBase}
                />
                </div>
                <div>
                <label className="block text-[9px] tracking-[1px] uppercase mb-[5px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Time / Other
                </label>
                <input
                    type="text"
                    placeholder="4:32"
                    value={round.other}
                    onChange={(e) => update(i, "other", e.target.value)}
                    className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                    style={inputBase}
                />
                </div>
            </div>
            </div>
        ))}

        {/* add round */}
        <button
            onClick={addRound}
            className="w-full rounded-[8px] py-[10px] text-[12px] tracking-[1px] transition-colors cursor-pointer"
            style={{
            fontFamily: "'DM Mono', monospace",
            background: "transparent",
            border:     "1px dashed var(--br2)",
            color:      "var(--mu2)",
            }}
        >
            + Add Round
        </button>
        </div>
    );
}