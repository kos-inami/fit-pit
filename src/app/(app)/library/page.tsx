"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/ui/TopNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProgramSessionSheet, { ProgramSessionData } from "@/components/program/ProgramSessionSheet";
import AssignLibrarySessionSheet from "@/components/program/AssignLibrarySessionSheet";
import { SESSION_TYPE_META, SessionType, TemplateSetLog, RoundEntry } from "@/types";

interface LSession {
    id: string; type: string; name: string; desc: string | null;
    planSets: string | null; rounds: string | null; referenceMovement: string | null; order: number;
}
interface SessionTypeRow { key: string; label: string; color: string; behavior: string; order: number }

function parse(s: LSession): ProgramSessionData & { id: string } {
    return {
        id: s.id,
        type: s.type as SessionType,
        name: s.name,
        desc: s.desc ?? "",
        planSets: s.planSets ? JSON.parse(s.planSets) as TemplateSetLog[] : [],
        rounds: s.rounds ? JSON.parse(s.rounds) as RoundEntry[] : [],
        referenceMovement: s.referenceMovement ?? "",
    };
}

export default function LibraryPage() {
    const [types,    setTypes]    = useState<SessionTypeRow[]>([]);
    const [sessions, setSessions] = useState<LSession[]>([]);
    const [activeType, setActiveType] = useState("");
    const [loading,  setLoading]  = useState(true);
    const [busy,     setBusy]     = useState(false);
    const [flash,    setFlash]    = useState("");

    const [sessionSheet, setSessionSheet] = useState<{ edit: (ProgramSessionData & { id: string }) | null } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [assignTarget, setAssignTarget] = useState<LSession | null>(null);

    const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 1800); };

    const load = useCallback(async () => {
        const [typesJson, sessionsJson] = await Promise.all([
            fetch("/api/session-types").then(r => r.json()),
            fetch("/api/library").then(r => r.json()),
        ]);
        const ts: SessionTypeRow[] = typesJson.types ?? [];
        setTypes(ts);
        setSessions(sessionsJson.sessions ?? []);
        setActiveType(prev => prev || ts[0]?.key || "");
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (data: ProgramSessionData) => {
        await fetch("/api/library", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, planSets: JSON.stringify(data.planSets), rounds: JSON.stringify(data.rounds) }),
        });
        await load();
        showFlash("Session added");
    };

    const handleEdit = async (id: string, data: ProgramSessionData) => {
        await fetch(`/api/library/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, planSets: JSON.stringify(data.planSets), rounds: JSON.stringify(data.rounds) }),
        });
        await load();
        showFlash("Session updated");
    };

    const handleDuplicate = async (id: string) => {
        setBusy(true);
        await fetch(`/api/library/${id}/duplicate`, { method: "POST" });
        await load();
        setBusy(false);
        showFlash("Duplicated");
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        await fetch(`/api/library/${confirmDeleteId}`, { method: "DELETE" });
        setConfirmDeleteId(null);
        await load();
        showFlash("Deleted");
    };

    if (loading) {
        return (<><TopNav title="LIBRARY" /><main className="px-[18px] pt-5 text-center text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Loading...</main></>);
    }

    const filtered = sessions.filter(s => s.type === activeType);

    return (
        <>
            <TopNav title="LIBRARY" />
            <main className="px-[18px] pt-5 pb-28">

                <button
                    onClick={() => setSessionSheet({ edit: null })}
                    className="w-full rounded-[9px] py-[11px] mb-5 text-[14px] tracking-[1.5px] cursor-pointer"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", background: "var(--acc)", border: "none", color: "#000" }}
                >
                    + New Session
                </button>

                <div className="flex gap-[6px] mb-4 overflow-x-auto pb-1">
                    {types.map(t => {
                        const active = activeType === t.key;
                        return (
                            <button key={t.key} onClick={() => setActiveType(t.key)}
                                className="rounded-full px-3 py-[7px] text-[11px] cursor-pointer flex-shrink-0"
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    background: active ? `${t.color}22` : "var(--s1)",
                                    border:     `1px solid ${active ? t.color : "var(--br)"}`,
                                    color:      active ? t.color : "var(--mu2)",
                                }}>
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-[12px] p-[1.5rem] text-center" style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                        <div className="text-[13px]" style={{ color: "var(--mu2)" }}>No sessions in this category yet</div>
                    </div>
                ) : (
                    <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                        {filtered.map((s, i) => {
                            const meta = SESSION_TYPE_META[s.type as SessionType];
                            return (
                                <div key={s.id} className="px-4 py-3"
                                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--br)" : "none" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="min-w-0">
                                            <div className="text-[14px]" style={{ color: meta?.color ?? "var(--tx)" }}>{s.name}</div>
                                            {s.desc && (
                                                <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                                    {s.desc}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => setSessionSheet({ edit: parse(s) })} disabled={busy}
                                            className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleDuplicate(s.id)} disabled={busy}
                                            className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
                                            Duplicate
                                        </button>
                                        <button onClick={() => setAssignTarget(s)} disabled={busy}
                                            className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--acc)", color: "var(--acc)" }}>
                                            Assign →
                                        </button>
                                        <button onClick={() => setConfirmDeleteId(s.id)} disabled={busy}
                                            className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--red)", color: "var(--red)" }}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </main>

            <ProgramSessionSheet
                open={sessionSheet !== null}
                onClose={() => setSessionSheet(null)}
                onAdd={handleAdd}
                editSession={sessionSheet?.edit ?? null}
                onEdit={handleEdit}
                onDelete={sessionSheet?.edit ? () => { setConfirmDeleteId(sessionSheet.edit!.id); setSessionSheet(null); } : undefined}
            />

            <ConfirmDialog
                open={confirmDeleteId !== null}
                message="Delete this library session? Copies already made from it are unaffected."
                onConfirm={handleDelete}
                onCancel={() => setConfirmDeleteId(null)}
            />

            <AssignLibrarySessionSheet
                open={assignTarget !== null}
                onClose={() => setAssignTarget(null)}
                librarySessionId={assignTarget?.id}
                librarySessionName={assignTarget?.name}
                onAssigned={() => showFlash("Assigned")}
            />

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
