"use client";

import { useState } from "react";
import { SetLog } from "@/types";

interface SetLoggerProps {
    sets:            SetLog[];
    onChange:        (sets: SetLog[]) => void;
    maxWeight?:      number | null;
    defaultPercent?: boolean; // true = % default, false = kg default
}

function calcFromPercent(pct: number, max: number): number {
  return Math.round((max * pct / 100) / 2.5) * 2.5;
}

export default function SetLogger({
    sets, onChange, maxWeight, defaultPercent = false,
    }: SetLoggerProps) {

    const [pctMode, setPctMode] = useState<Record<number, boolean>>({});

    const isPercent = (i: number) =>
        pctMode[i] !== undefined ? pctMode[i] : defaultPercent;

    const addSet = () => {
        const newIndex = sets.length;
        const prev     = sets.length > 0 ? sets[sets.length - 1] : null;
        const prevMode = prev ? isPercent(sets.length - 1) : defaultPercent;
        setPctMode(p => ({ ...p, [newIndex]: prevMode }));

        const refMax      = maxWeight ?? prev?.maxWeight ?? null;
        const prevPct     = prev?.percentage ?? null;
        const prevWeight  = prev?.weight     ?? null;

        const calculatedWeight =
            prevMode && prevPct !== null && refMax
            ? calcFromPercent(prevPct, refMax)
            : !prevMode ? prevWeight : null;

        const calculatedPct =
            !prevMode && calculatedWeight !== null && refMax
            ? Math.round((calculatedWeight / refMax) * 100)
            : prevMode ? prevPct : null;

        onChange([...sets, {
            setNumber:  sets.length + 1,
            weight:     calculatedWeight,
            percentage: calculatedPct,
            maxWeight:  refMax,
            reps:       prev?.reps ?? null,
            notes:      "",
        }]);
    };

    const removeSet = (index: number) => {
        onChange(
        sets
            .filter((_, i) => i !== index)
            .map((s, i) => ({ ...s, setNumber: i + 1 }))
        );
        setPctMode(prev => {
        const reindexed: Record<number, boolean> = {};
        Object.entries(prev).forEach(([k, v]) => {
            const n = parseInt(k);
            if (n < index)  reindexed[n]     = v;
            if (n > index)  reindexed[n - 1] = v;
        });
        return reindexed;
        });
    };

    const updateKg = (index: number, value: string) => {
        const w   = value === "" ? null : parseFloat(value);
        const pct = w !== null && maxWeight
            ? Math.round((w / maxWeight) * 100)
            : null;
        onChange(sets.map((s, i) =>
            i !== index ? s : {
            ...s,
            weight:     w,
            percentage: pct,
            maxWeight:  maxWeight ?? s.maxWeight ?? null,
            }
        ));
    };

    const updatePercent = (index: number, value: string) => {
        const pct        = value === "" ? null : parseFloat(value);
        const calculated = pct !== null && maxWeight
            ? calcFromPercent(pct, maxWeight)
            : null;
        onChange(sets.map((s, i) =>
            i !== index ? s : {
            ...s,
            percentage: pct,
            weight:     calculated,
            maxWeight:  maxWeight ?? null,
            }
        ));
    };

    const updateField = (index: number, field: "reps" | "notes", value: string) => {
        onChange(sets.map((s, i) => {
        if (i !== index) return s;
        if (field === "reps")  return { ...s, reps:  value === "" ? null : parseInt(value) };
        if (field === "notes") return { ...s, notes: value };
        return s;
        }));
    };

    const toggleMode = (index: number) => {
        const next   = !isPercent(index);
        const refMax = sets[index]?.maxWeight ?? maxWeight;
        setPctMode(p => ({ ...p, [index]: next }));

        onChange(sets.map((s, i) => {
            if (i !== index) return s;
            if (next && s.weight !== null && refMax) {
            return { ...s, percentage: Math.round((s.weight / refMax) * 100), maxWeight: refMax };
            }
            if (!next && s.percentage !== null && refMax) {
            return { ...s, weight: calcFromPercent(s.percentage, refMax), maxWeight: refMax };
            }
            return { ...s, weight: null, percentage: null };
        }));
    };

    const inputBase: React.CSSProperties = {
        background: "var(--s2)",
        border:     "1px solid var(--br)",
        color:      "var(--tx)",
        fontFamily: "'DM Mono', monospace",
    };

    return (
        <div>
        {/* max weight reference */}
        {maxWeight && (
            <div
            className="flex items-center gap-2 mb-[0.5rem] p-[0.5rem] rounded-[8px]"
            style={{ background: "var(--s2)" }}
            >
            <span
                className="text-[9px] tracking-[1.5px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
            >
                Max
            </span>
            <span
                className="text-[15px] tracking-[1px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
            >
                {maxWeight}kg
            </span>
            </div>
        )}

        {/* column headers */}
        {sets.length > 0 && (
            <div className="grid grid-cols-[24px_88px_1fr_1fr_20px] gap-2 mb-2 px-1">
            {["#","KG / %","REPS","NOTES",""].map(h => (
                <span
                key={h}
                className="text-[9px] tracking-[1.2px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                >
                {h}
                </span>
            ))}
            </div>
        )}

        {/* set rows */}
        {sets.map((set, i) => {
            const pct        = isPercent(i);
            const calculated =
            pct && set.percentage !== null && maxWeight
                ? calcFromPercent(set.percentage, maxWeight)
                : null;

            return (
            <div key={i} className="mb-3">
                <div className="grid grid-cols-[24px_88px_1fr_1fr_20px] gap-2 items-start">

                {/* set number */}
                <span
                    className="text-[13px] text-center mt-[10px]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
                >
                    {set.setNumber}
                </span>

                {/* weight / % column */}
                <div>
                    <div
                    className="flex rounded-[7px] overflow-hidden"
                    style={{ border: "1px solid var(--br)" }}
                    >
                    {/* mode toggle */}
                    <button
                        onClick={() => toggleMode(i)}
                        className="px-[7px] py-[9px] text-[9px] cursor-pointer transition-colors flex-shrink-0"
                        style={{
                        fontFamily:  "'DM Mono', monospace",
                        background:  pct ? "var(--acc)" : "var(--s3)",
                        border:      "none",
                        borderRight: "1px solid var(--br)",
                        color:       pct ? "#000" : "var(--mu)",
                        fontWeight:  pct ? 600 : 400,
                        }}
                    >
                        {pct ? "%" : "KG"}
                    </button>

                    {/* value input */}
                    <input
                        type="number"
                        inputMode="decimal"
                        placeholder="—"
                        value={pct ? (set.percentage ?? "") : (set.weight ?? "")}
                        onChange={e =>
                        pct
                            ? updatePercent(i, e.target.value)
                            : updateKg(i, e.target.value)
                        }
                        className="w-full px-2 py-[9px] text-[13px] text-center outline-none"
                        style={{
                        background: "var(--s2)",
                        border:     "none",
                        color:      "var(--tx)",
                        fontFamily: "'DM Mono', monospace",
                        }}
                    />
                    </div>

                    {/* calculated weight */}
                    {pct && set.percentage !== null && (
                    <div
                        className="text-center text-[10px] mt-[3px]"
                        style={{
                        fontFamily: "'DM Mono', monospace",
                        color:      calculated !== null ? "var(--acc)" : "var(--mu)",
                        }}
                    >
                        {calculated !== null ? `≈ ${calculated}kg` : "No max set"}
                    </div>
                    )}
                </div>

                {/* reps */}
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    value={set.reps ?? ""}
                    onChange={e => updateField(i, "reps", e.target.value)}
                    className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                    style={inputBase}
                />

                {/* notes */}
                <input
                    type="text"
                    placeholder="notes"
                    value={set.notes}
                    onChange={e => updateField(i, "notes", e.target.value)}
                    className="w-full rounded-[7px] px-2 py-[9px] text-[12px] outline-none"
                    style={inputBase}
                />

                {/* remove */}
                <button
                    onClick={() => removeSet(i)}
                    className="text-[16px] leading-none cursor-pointer mt-[10px] opacity-40 hover:opacity-100 transition-opacity"
                    style={{ background: "none", border: "none", color: "var(--red)" }}
                >
                    ×
                </button>
                </div>
            </div>
            );
        })}

        {/* add set */}
        <button
            onClick={addSet}
            className="w-full rounded-[8px] py-[10px] text-[12px] tracking-[1px] cursor-pointer transition-colors"
            style={{
            fontFamily: "'DM Mono', monospace",
            background: "transparent",
            border:     "1px dashed var(--br2)",
            color:      "var(--mu2)",
            }}
        >
            + Add Set
        </button>
        </div>
    );
}