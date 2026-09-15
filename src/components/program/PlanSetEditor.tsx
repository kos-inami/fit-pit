"use client";

import { TemplateSetLog } from "@/types";

interface PlanSetEditorProps {
    sets:     TemplateSetLog[];
    onChange: (sets: TemplateSetLog[]) => void;
}

export default function PlanSetEditor({ sets, onChange }: PlanSetEditorProps) {

    const addSet = () => {
        const prev = sets.length > 0 ? sets[sets.length - 1] : null;
        onChange([...sets, {
            setNumber:  sets.length + 1,
            percentage: prev?.percentage ?? null,
            reps:       prev?.reps ?? null,
            notes:      "",
        }]);
    };

    const removeSet = (index: number) => {
        onChange(
            sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 }))
        );
    };

    const moveSet = (index: number, direction: "up" | "down") => {
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= sets.length) return;
        const next = [...sets];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next.map((s, i) => ({ ...s, setNumber: i + 1 })));
    };

    const update = (index: number, field: "percentage" | "reps" | "notes", value: string) => {
        onChange(sets.map((s, i) => {
            if (i !== index) return s;
            if (field === "percentage") return { ...s, percentage: value === "" ? null : parseFloat(value) };
            if (field === "reps")       return { ...s, reps:       value === "" ? null : parseInt(value)   };
            return { ...s, notes: value };
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
            {sets.length > 0 && (
                <div className="grid grid-cols-[24px_1fr_1fr_1fr_44px] gap-2 mb-2 px-1">
                    {["#","%","REPS","NOTES",""].map(h => (
                        <span key={h} className="text-[9px] tracking-[1.2px] uppercase"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            {h}
                        </span>
                    ))}
                </div>
            )}

            {sets.map((set, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_1fr_1fr_44px] gap-2 items-center mb-2">
                    <span className="text-[13px] text-center"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>
                        {set.setNumber}
                    </span>
                    <input
                        type="number" inputMode="decimal" placeholder="—"
                        value={set.percentage ?? ""}
                        onChange={e => update(i, "percentage", e.target.value)}
                        className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                        style={inputBase}
                    />
                    <input
                        type="number" inputMode="numeric" placeholder="—"
                        value={set.reps ?? ""}
                        onChange={e => update(i, "reps", e.target.value)}
                        className="w-full rounded-[7px] px-2 py-[9px] text-[13px] text-center outline-none"
                        style={inputBase}
                    />
                    <input
                        type="text" placeholder="notes"
                        value={set.notes}
                        onChange={e => update(i, "notes", e.target.value)}
                        className="w-full rounded-[7px] px-2 py-[9px] text-[12px] outline-none"
                        style={inputBase}
                    />
                    <div className="flex gap-[2px]">
                        <button onClick={() => moveSet(i, "up")} disabled={i === 0}
                            className="w-[16px] h-[16px] flex items-center justify-center text-[10px] cursor-pointer"
                            style={{ background: "none", border: "none", color: "var(--acc)", opacity: i === 0 ? 0.3 : 1 }}>
                            ↑
                        </button>
                        <button onClick={() => moveSet(i, "down")} disabled={i === sets.length - 1}
                            className="w-[16px] h-[16px] flex items-center justify-center text-[10px] cursor-pointer"
                            style={{ background: "none", border: "none", color: "var(--acc)", opacity: i === sets.length - 1 ? 0.3 : 1 }}>
                            ↓
                        </button>
                        <button onClick={() => removeSet(i)}
                            className="w-[16px] h-[16px] flex items-center justify-center text-[14px] leading-none cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                            style={{ background: "none", border: "none", color: "var(--red)" }}>
                            ×
                        </button>
                    </div>
                </div>
            ))}

            <button
                onClick={addSet}
                className="w-full rounded-[8px] py-[10px] text-[12px] tracking-[1px] cursor-pointer transition-colors"
                style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px dashed var(--br2)", color: "var(--mu2)" }}
            >
                + Add Set
            </button>
        </div>
    );
}
