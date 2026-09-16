"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopNav from "@/components/ui/TopNav";
import EnrollSheet from "@/components/program/EnrollSheet";

interface BrowseProgram {
    id: string; name: string; description: string | null;
}
interface Connection {
    status: "pending" | "active" | "ended";
    trainer: { id: string; name: string };
}
interface EnrollmentRow {
    id: string; status: string; startDate: string;
    previousAssignmentId: string | null;
    program: { id: string; name: string; trainerId: string };
}

const STATUS_COLOR: Record<string, string> = {
    active:    "var(--grn)",
    completed: "var(--mu2)",
    cancelled: "var(--mu)",
};

export default function BrowseProgramsPage() {
    const [connection,   setConnection]   = useState<Connection | null>(null);
    const [programs,     setPrograms]     = useState<BrowseProgram[]>([]);
    const [enrollments,  setEnrollments]  = useState<EnrollmentRow[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [enrollTarget, setEnrollTarget] = useState<BrowseProgram | null>(null);
    const [busy,         setBusy]         = useState(false);
    const [flash,        setFlash]        = useState("");

    const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 1800); };

    const load = useCallback(async () => {
        const [connRes, progRes, enrollRes] = await Promise.all([
            fetch("/api/trainer/connection").then(r => r.json()),
            fetch("/api/programs/browse").then(r => r.json()),
            fetch("/api/programs/my-enrollments").then(r => r.json()),
        ]);
        setConnection(connRes.relation ?? null);
        setPrograms(progRes.programs ?? []);
        setEnrollments(enrollRes.assignments ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleEnroll = async (data: { startDate: string; startWeek: number; endWeek: number | null }) => {
        if (!enrollTarget) return;
        const res  = await fetch(`/api/programs/${enrollTarget.id}/enroll`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to enrol");
        await load();
        showFlash(`Enrolled — ${json.generatedCount} sessions generated`);
    };

    const handleAction = async (row: EnrollmentRow, action: "complete" | "cancel") => {
        setBusy(true);
        await fetch(`/api/programs/${row.program.id}/assignments/${row.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
        });
        await load();
        setBusy(false);
    };

    if (loading) {
        return (<><TopNav title="PROGRAMS" /><main className="px-[18px] pt-5 text-center text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Loading...</main></>);
    }

    const isActive = connection?.status === "active";

    return (
        <>
            <TopNav title="PROGRAMS" />
            <main className="px-[18px] pt-5 pb-28">

                {!isActive && (
                    <div className="rounded-[12px] p-[1.5rem] text-center mb-5" style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                        <div className="text-[13px]" style={{ color: "var(--mu2)" }}>
                            Connect to a trainer to browse their programs
                        </div>
                    </div>
                )}

                {isActive && (
                    <>
                        <div className="text-[10px] tracking-[2px] uppercase mb-3"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            Available from {connection!.trainer.name}
                        </div>
                        {programs.length === 0 ? (
                            <div className="rounded-[12px] p-[1.5rem] text-center mb-5" style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                                <div className="text-[13px]" style={{ color: "var(--mu2)" }}>No open programs right now</div>
                            </div>
                        ) : (
                            <div className="rounded-[12px] overflow-hidden mb-5" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                                {programs.map((p, i) => (
                                    <div key={p.id} className="px-4 py-3 flex items-center justify-between"
                                        style={{ borderBottom: i < programs.length - 1 ? "1px solid var(--br)" : "none" }}>
                                        <div className="min-w-0 pr-2">
                                            <div className="text-[14px]" style={{ color: "var(--tx)" }}>{p.name}</div>
                                            {p.description && (
                                                <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                                    {p.description}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setEnrollTarget(p)}
                                            className="rounded-[8px] px-3 py-[8px] text-[11px] cursor-pointer flex-shrink-0"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--acc)", color: "var(--acc)" }}
                                        >
                                            Enrol →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                <div className="text-[10px] tracking-[2px] uppercase mb-3"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    My Enrollments
                </div>
                {enrollments.length === 0 ? (
                    <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>None yet</div>
                ) : (
                    <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                        {enrollments.map((e, i) => (
                            <div key={e.id} className="px-4 py-3 flex items-center justify-between"
                                style={{ borderBottom: i < enrollments.length - 1 ? "1px solid var(--br)" : "none" }}>
                                <div>
                                    <div className="text-[13px]">{e.program.name}</div>
                                    <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: STATUS_COLOR[e.status] ?? "var(--mu)" }}>
                                        {e.status} · from {e.startDate}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {e.previousAssignmentId && (
                                        <Link href={`/programs/${e.program.id}/compare/${e.id}`} style={{ textDecoration: "none" }}>
                                            <span className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--acc)", color: "var(--acc)" }}>
                                                Compare →
                                            </span>
                                        </Link>
                                    )}
                                    {e.status === "active" && (
                                        <>
                                            <button onClick={() => handleAction(e, "complete")} disabled={busy}
                                                className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--grn)", color: "var(--grn)" }}>
                                                Complete
                                            </button>
                                            <button onClick={() => handleAction(e, "cancel")} disabled={busy}
                                                className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--red)", color: "var(--red)" }}>
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </main>

            {enrollTarget && (
                <EnrollSheet
                    open={enrollTarget !== null}
                    onClose={() => setEnrollTarget(null)}
                    programName={enrollTarget.name}
                    onEnroll={handleEnroll}
                />
            )}

            {flash && (
                <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex justify-center pt-5 px-4 pointer-events-none"
                    style={{ top: "0", width: "100%", padding: "2.5rem 0", background: "rgba(8,8,8,0.5)", backdropFilter: "blur(6px)" }}>
                    <div className="px-6 py-3 rounded-[12px]" style={{ background: "rgba(8,8,8,0.95)" }}>
                        <div className="text-[18px] tracking-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>{flash}</div>
                    </div>
                </div>
            )}
        </>
    );
}
