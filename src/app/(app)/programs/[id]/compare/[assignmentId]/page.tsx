"use client";

import { useState, useEffect, use } from "react";
import TopNav from "@/components/ui/TopNav";
import { SESSION_TYPE_META, SessionType } from "@/types";

interface CompSession {
    id: string; name: string; type: string;
    result: string | null; resultRounds: string | null;
    sets: { id: string; setNumber: number; weight: number | null; reps: number | null }[];
    date: string;
}
interface ComparisonData {
    pairs: { name: string; current: CompSession; previous: CompSession }[];
    unmatchedCurrent: CompSession[];
    unmatchedPrevious: CompSession[];
}

function SessionResult({ s }: { s: CompSession }) {
    const meta = SESSION_TYPE_META[s.type as SessionType];
    if (meta?.useSets) {
        if (s.sets.length === 0) return <div className="text-[11px]" style={{ color: "var(--mu)" }}>No result logged</div>;
        return (
            <div>
                {s.sets.map(set => (
                    <div key={set.id} className="text-[12px]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {set.setNumber}. {set.weight ?? "—"}kg × {set.reps ?? "—"}
                    </div>
                ))}
            </div>
        );
    }
    if (s.type === "wod" || s.type === "zone") {
        const rounds = s.resultRounds ? JSON.parse(s.resultRounds) as { roundNumber: number; details: string }[] : [];
        if (rounds.length === 0) return <div className="text-[11px]" style={{ color: "var(--mu)" }}>No result logged</div>;
        return (
            <div>
                {rounds.map(r => (
                    <div key={r.roundNumber} className="text-[12px]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        Round {r.roundNumber}: {r.details}
                    </div>
                ))}
            </div>
        );
    }
    if (!s.result) return <div className="text-[11px]" style={{ color: "var(--mu)" }}>No result logged</div>;
    return <div className="text-[13px] whitespace-pre-line">{s.result}</div>;
}

export default function ComparisonPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
    const { id: programId, assignmentId } = use(params);
    const [data,    setData]    = useState<ComparisonData | null>(null);
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/programs/${programId}/assignments/${assignmentId}/comparison`)
            .then(async r => {
                const json = await r.json();
                if (!r.ok) throw new Error(json.error ?? "Failed to load comparison");
                setData(json);
            })
            .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
            .finally(() => setLoading(false));
    }, [programId, assignmentId]);

    if (loading) {
        return (<><TopNav title="COMPARISON" /><main className="px-[18px] pt-5 text-center text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Loading...</main></>);
    }
    if (error || !data) {
        return (<><TopNav title="COMPARISON" /><main className="px-[18px] pt-5 text-center text-[13px]" style={{ color: "var(--mu2)" }}>{error || "Not found"}</main></>);
    }

    return (
        <>
            <TopNav title="RUN COMPARISON" />
            <main className="px-[18px] pt-5 pb-28">

                {data.pairs.length === 0 && data.unmatchedCurrent.length === 0 && data.unmatchedPrevious.length === 0 && (
                    <div className="rounded-[12px] p-[1.5rem] text-center" style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                        <div className="text-[13px]" style={{ color: "var(--mu2)" }}>No sessions to compare yet</div>
                    </div>
                )}

                {data.pairs.length > 0 && (
                    <>
                        <div className="text-[10px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            Matched Sessions
                        </div>
                        {data.pairs.map(({ name, current, previous }) => (
                            <div key={current.id} className="rounded-[12px] mb-3 overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                                <div className="px-4 pt-3 pb-2 text-[15px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{name}</div>
                                <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                                    <div>
                                        <div className="text-[9px] tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                            Previous · {previous.date}
                                        </div>
                                        <SessionResult s={previous} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                                            Current · {current.date}
                                        </div>
                                        <SessionResult s={current} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {data.unmatchedCurrent.length > 0 && (
                    <>
                        <div className="text-[10px] tracking-[2px] uppercase mb-3 mt-2" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            New This Run
                        </div>
                        <div className="rounded-[12px] overflow-hidden mb-5" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                            {data.unmatchedCurrent.map((s, i) => (
                                <div key={s.id} className="px-4 py-3" style={{ borderBottom: i < data.unmatchedCurrent.length - 1 ? "1px solid var(--br)" : "none" }}>
                                    <div className="text-[13px]">{s.name}</div>
                                    <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>{s.date} — no prior comparison</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {data.unmatchedPrevious.length > 0 && (
                    <>
                        <div className="text-[10px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            Only In Previous Run
                        </div>
                        <div className="rounded-[12px] overflow-hidden mb-5" style={{ background: "var(--s1)", border: "1px solid var(--br)", opacity: 0.6 }}>
                            {data.unmatchedPrevious.map((s, i) => (
                                <div key={s.id} className="px-4 py-3" style={{ borderBottom: i < data.unmatchedPrevious.length - 1 ? "1px solid var(--br)" : "none" }}>
                                    <div className="text-[13px]">{s.name}</div>
                                    <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>{s.date}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </main>
        </>
    );
}
