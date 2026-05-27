"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TopNav from "@/components/ui/TopNav";
import TypeChip from "@/components/session/TypeChip";
import { SESSION_TYPE_META, SessionType } from "@/types";

interface SearchResult {
    id:     string;
    name:   string;
    type:   string;
    desc:   string | null;
    result: string | null;
    notes:  string | null;
    sets:   { setNumber: number; weight: number | null; reps: number | null }[];
    day:    { date: string };
}

function resultSummary(s: SearchResult): string {
    if (s.result) return s.result;
    if (s.sets.length > 0) {
        const best = Math.max(...s.sets.map(set => set.weight ?? 0));
        return best > 0
        ? `Best: ${best}kg · ${s.sets.length} sets`
        : `${s.sets.length} sets`;
    }
    return "";
    }

    function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
    }

    function SearchResults() {
    const { data: authSession } = useSession();
    const userId                = authSession?.user?.id;
    const searchParams          = useSearchParams();
    const router                = useRouter();

    const q    = searchParams.get("q")    ?? "";
    const type = searchParams.get("type") ?? "";

    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const id = setTimeout(async () => {
            setLoading(true);

            const params = new URLSearchParams();
            params.set("userId", userId);
            if (q)    params.set("q",    q);
            if (type) params.set("type", type);

            try {
            const res  = await fetch(`/api/sessions/search?${params.toString()}`);
            const json = await res.json();
            setResults(json.sessions ?? []);
            } catch { /* ignore */ }

            setLoading(false);
        }, 0);

        return () => clearTimeout(id);
    }, [userId, q, type]);

    const handleSelect = (date: string) => {
        router.push(`/program?date=${date}`);
    };

    // build label for search summary
    const searchLabel = [
        q    ? `"${q}"` : "",
        type ? SESSION_TYPE_META[type as SessionType]?.label ?? type : "",
    ].filter(Boolean).join(" · ");

    return (
        <>
        <TopNav
            title="SEARCH"
            left={
            <button
                onClick={() => router.back()}
                className="rounded-[8px] px-3 py-[6px] text-[11px] cursor-pointer"
                style={{
                fontFamily: "'DM Mono', monospace",
                background: "none",
                border:     "none",
                color:      "var(--mu2)",
                }}
            >
                ← Back
            </button>
            }
        />

        <main className="px-[18px] pt-5 pb-28">

            {/* search summary */}
            <div className="flex items-center justify-between mb-4">
            <div className="text-[11px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                {loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""} for ${searchLabel}`}
            </div>
            </div>

            {/* loading */}
            {loading && (
            <div className="text-center py-12">
                <div className="text-[24px] mb-2">🔍</div>
                <div className="text-[12px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Searching...
                </div>
            </div>
            )}

            {/* empty */}
            {!loading && results.length === 0 && (
            <div className="rounded-[12px] py-10 text-center"
                style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                <div className="text-[24px] mb-2">🔍</div>
                <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
                No sessions found
                </div>
                <div className="text-[11px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Try a different search term or filter
                </div>
            </div>
            )}

            {/* results */}
            {results.map(s => {
                const meta    = SESSION_TYPE_META[s.type as SessionType];
                const summary = resultSummary(s);

                return (
                    <div
                    key={s.id}
                    onClick={() => handleSelect(s.day.date)}
                    className="rounded-[12px] mb-[8px] overflow-hidden cursor-pointer p-[0.5rem]"
                    style={{
                        background: `linear-gradient(135deg, ${meta.color}0f 0%, var(--s1) 60%)`,
                        border:     `1px solid ${meta.color}33`,
                    }}
                    >
                    <div className="p-[0.5rem]">

                        {/* top row */}
                        <div className="flex items-start justify-between gap-[6px]">
                        <div className="flex items-center gap-[6px] min-w-0 flex-1 flex-wrap">
                            <span className="text-[18px] tracking-[0.5px]"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                            {s.name}
                            </span>
                            <TypeChip type={s.type as SessionType} />
                        </div>
                        <span className="text-[10px] flex-shrink-0"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            {formatDate(s.day.date)}
                        </span>
                        </div>

                        {/* desc */}
                        {s.desc && (
                        <div className="text-[14px] mt-[0.5rem] whitespace-pre-line"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                            {s.desc}
                        </div>
                        )}

                        {/* sets */}
                        {s.sets.length > 0 && (
                        <div className="mt-[0.5rem]">
                            <div className="grid grid-cols-[24px_1fr_1fr] gap-2 mb-1 px-1">
                            {["#","KG","REPS"].map(h => (
                                <span key={h} className="text-[9px] tracking-[1px] text-center uppercase"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                {h}
                                </span>
                            ))}
                            </div>
                            {s.sets.map(set => (
                            <div key={set.setNumber} className="grid grid-cols-[24px_1fr_1fr] gap-2 mb-[3px]">
                                <span className="text-[12px] text-center"
                                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>
                                {set.setNumber}
                                </span>
                                <span className="text-[12px] text-center"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                                {set.weight ?? "—"}
                                </span>
                                <span className="text-[12px] text-center"
                                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                                {set.reps ?? "—"}
                                </span>
                            </div>
                            ))}
                        </div>
                        )}

                        {/* result */}
                        {summary && (
                        <div className="text-[14px] mt-[0.5rem] whitespace-pre-line"
                            style={{ fontFamily: "'DM Mono', monospace", color: meta.color }}>
                            {summary}
                        </div>
                        )}

                        {/* notes */}
                        {s.notes && (
                        <div className="text-[11px] italic mt-[0.5rem] whitespace-pre-line"
                            style={{ color: "var(--mu)" }}>
                            &ldquo;{s.notes}&rdquo;
                        </div>
                        )}

                        {/* go to date */}
                        <div className="text-[10px] tracking-[1px] mt-[0.5rem] pt-[0.5rem]"
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            color:      "var(--acc)",
                            borderTop:  `1px solid ${meta.color}22`,
                        }}>
                        View in Program →
                        </div>

                    </div>
                    </div>
                );
            })}

        </main>
        </>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={null}>
        <SearchResults />
        </Suspense>
    );
}