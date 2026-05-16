"use client";

import { useState } from "react";
import { RoundEntry } from "@/types";

interface RoundLoggerProps {
    rounds:   RoundEntry[];
    onChange: (rounds: RoundEntry[]) => void;
}

export default function RoundLogger({ rounds, onChange }: RoundLoggerProps) {

    const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

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
        setConfirmIndex(index);
    };

    const confirmRemove = () => {
        if (confirmIndex === null) return;
        onChange(
        rounds
            .filter((_, i) => i !== confirmIndex)
            .map((r, i) => ({ ...r, roundNumber: i + 1 }))
        );
        setConfirmIndex(null);
    };

    const moveRound = (index: number, direction: "up" | "down") => {
        const newRounds  = [...rounds];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newRounds.length) return;
        [newRounds[index], newRounds[targetIndex]] = [newRounds[targetIndex], newRounds[index]];
        onChange(newRounds.map((r, i) => ({ ...r, roundNumber: i + 1 })));
    };

    const update = (index: number, field: keyof RoundEntry, value: string) => {
        onChange(rounds.map((r, i) => {
        if (i !== index) return r;
        switch (field) {
            case "weight": return { ...r, weight: value === "" ? null : parseFloat(value) };
            case "reps":   return { ...r, reps:   value === "" ? null : parseInt(value)   };
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
        <div className="mb-[1rem]">
            {rounds.map((round, i) => (
                <div
                key={i}
                className="rounded-[10px] mb-[0.5rem]"
                style={{ background: "var(--s2)", border: "1px solid var(--br)" }}
                >
                {/* round header */}
                <div className="flex items-center justify-between">
                    <div
                    className="text-[13px] tracking-[1px] p-[0.5rem]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                    >
                    Round {round.roundNumber}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* remove / confirm */}
                        {confirmIndex === i ? (
                            <>
                                <button
                                    onClick={() => setConfirmIndex(null)}
                                    className="px-[1.25rem] h-[24px] rounded-[5px] text-[10px] cursor-pointer"
                                    style={{
                                    fontFamily: "'DM Mono', monospace",
                                    background: "var(--s2)",
                                    border:     "1px solid var(--br)",
                                    color:      "var(--mu2)",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemove}
                                    className="px-[1.25rem] h-[24px] rounded-[5px] text-[10px] cursor-pointer"
                                    style={{
                                    fontFamily: "'DM Mono', monospace",
                                    background: "var(--red)",
                                    border:     "none",
                                    color:      "#fff",
                                    }}
                                >
                                    Remove
                                </button>
                            </>
                        ) : (
                            <button
                            onClick={() => removeRound(i)}
                            className="w-[24px] h-[24px] flex items-center justify-center cursor-pointer"
                            style={{
                                background: "transparent",
                                border:     "none",
                                color:      "var(--red)",
                                fontSize:   14,
                            }}
                            >
                            ×
                            </button>
                        )}
                        </div>
                    </div>

                    {/* workout details */}
                    <div className="mb-[0.5rem]">
                        <label
                        className="block text-[9px] tracking-[1.5px] uppercase mb-[5px] px-[0.5rem]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                        >
                        Workout Details
                        </label>
                        <textarea
                            rows={6}
                            placeholder="e.g. 5 Pull-ups / 10 Push-ups / 15 Air Squats"
                            value={round.details}
                            onChange={e => update(i, "details", e.target.value)}
                            className="w-full rounded-[7px] px-3 py-[9px] text-[13px] outline-none resize-none leading-relaxed px-[0.5rem]"
                            style={inputBase}
                        />
                    </div>

                    {/* weight + reps + other */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label
                                className="block text-[9px] tracking-[1px] uppercase mb-[5px] px-[0.5rem]"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                            >
                                Weight (kg)
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                placeholder="—"
                                value={round.weight ?? ""}
                                onChange={e => update(i, "weight", e.target.value)}
                                className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                                style={inputBase}
                            />
                        </div>
                        <div>
                            <label
                                className="block text-[9px] tracking-[1px] uppercase mb-[5px] px-[0.5rem]"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                            >
                                Reps
                            </label>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="—"
                                value={round.reps ?? ""}
                                onChange={e => update(i, "reps", e.target.value)}
                                className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                                style={inputBase}
                            />
                        </div>
                        <div>
                            <label
                                className="block text-[9px] tracking-[1px] uppercase mb-[5px] px-[0.5rem]"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                            >
                                Time / Other
                            </label>
                            <input
                                type="text"
                                placeholder="4:32"
                                value={round.other}
                                onChange={e => update(i, "other", e.target.value)}
                                className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                                style={inputBase}
                            />
                        </div>
                    </div>
                    <div className="flex w-full">
                        {/* move up */}
                        <button
                            onClick={() => moveRound(i, "up")}
                            disabled={i === 0}
                            className="flex items-center justify-center rounded-[5px] cursor-pointer transition-opacity w-[50%] py-[0.5rem]"
                            style={{
                            background: "var(--s2)",
                            border:     "1px solid var(--br)",
                            color:      "var(--acc)",
                            opacity:    i === 0 ? 0.3 : 1,
                            fontSize:   11,
                            fontWeight: "bold",
                            }}
                        >
                            ↑
                        </button>

                        {/* move down */}
                        <button
                            onClick={() => moveRound(i, "down")}
                            disabled={i === rounds.length - 1}
                            className="flex items-center justify-center rounded-[5px] cursor-pointer transition-opacity w-[50%] py-[0.5rem]"
                            style={{
                            background: "var(--s2)",
                            border:     "1px solid var(--br)",
                            color:      "var(--acc)",
                            opacity:    i === rounds.length - 1 ? 0.3 : 1,
                            fontSize:   11,
                            fontWeight: "bold",
                            }}
                        >
                            ↓
                        </button>
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