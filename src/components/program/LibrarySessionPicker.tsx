"use client";

import { useState, useEffect } from "react";

export interface LibraryRow {
    id: string; type: string; name: string; desc: string | null;
    planSets: string | null; rounds: string | null; referenceMovement: string | null; order: number;
}
interface SessionTypeRow { key: string; label: string; color: string; behavior: string; order: number }

interface LibrarySessionPickerProps {
    onSelect: (session: LibraryRow) => void;
}

export default function LibrarySessionPicker({ onSelect }: LibrarySessionPickerProps) {
    const [types,      setTypes]      = useState<SessionTypeRow[]>([]);
    const [sessions,   setSessions]   = useState<LibraryRow[]>([]);
    const [activeType, setActiveType] = useState("");
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/session-types").then(r => r.json()),
            fetch("/api/library").then(r => r.json()),
        ]).then(([typesJson, sessionsJson]) => {
            const ts: SessionTypeRow[] = typesJson.types ?? [];
            setTypes(ts);
            setSessions(sessionsJson.sessions ?? []);
            if (ts.length > 0) setActiveType(ts[0].key);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="text-center py-6 text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Loading...
            </div>
        );
    }

    const filtered = sessions.filter(s => s.type === activeType);

    return (
        <div>
            <div className="flex gap-[6px] mb-3 overflow-x-auto pb-1">
                {types.map(t => {
                    const active = activeType === t.key;
                    return (
                        <button key={t.key} onClick={() => setActiveType(t.key)}
                            className="rounded-full px-3 py-[6px] text-[11px] cursor-pointer flex-shrink-0"
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                background: active ? `${t.color}22` : "var(--s2)",
                                border:     `1px solid ${active ? t.color : "var(--br)"}`,
                                color:      active ? t.color : "var(--mu2)",
                            }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="text-[11px] py-4 text-center" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    No sessions in this category yet
                </div>
            ) : (
                <div className="rounded-[10px] overflow-hidden mb-2" style={{ background: "var(--s2)", border: "1px solid var(--br)" }}>
                    {filtered.map((s, i) => (
                        <div key={s.id} onClick={() => onSelect(s)}
                            className="px-3 py-[10px] cursor-pointer"
                            style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--br)" : "none" }}>
                            <div className="text-[13px]">{s.name}</div>
                            {s.desc && (
                                <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                    {s.desc}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
