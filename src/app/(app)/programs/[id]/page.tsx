"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import TopNav from "@/components/ui/TopNav";
import { Input, Textarea } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProgramSessionSheet, { ProgramSessionData } from "@/components/program/ProgramSessionSheet";
import AssignSheet from "@/components/program/AssignSheet";
import { SESSION_TYPE_META, SessionType, TemplateSetLog, RoundEntry } from "@/types";

const DAY_LETTERS = ["M","T","W","T","F","S","S"];

interface PSession {
    id: string; type: string; name: string; desc: string | null;
    planSets: string | null; rounds: string | null; referenceMovement: string | null; order: number;
}
interface PDay { id: string; dayIndex: number; isRestDay: boolean; sessions: PSession[] }
interface PWeek { id: string; weekNumber: number; days: PDay[] }
interface ProgramDetail {
    id: string; name: string; description: string | null;
    status: "draft" | "published" | "archived"; accessMode: string;
    weeks: PWeek[];
}
interface AssignmentRow {
    id: string; status: string; startDate: string; startWeek: number; endWeek: number | null;
    previousAssignmentId: string | null;
    trainee: { id: string; name: string };
}

function parseSession(s: PSession): ProgramSessionData & { id: string } {
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

export default function ProgramBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: programId } = use(params);

    const [program,     setProgram]     = useState<ProgramDetail | null>(null);
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [editingHeader, setEditingHeader] = useState(false);
    const [nameField, setNameField] = useState("");
    const [descField, setDescField] = useState("");

    const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
    const [sessionSheet, setSessionSheet] = useState<{ dayId: string; edit: (ProgramSessionData & { id: string }) | null } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState("");

    const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 1800); };

    const load = useCallback(async () => {
        const [progRes, assignRes] = await Promise.all([
            fetch(`/api/programs/${programId}`).then(r => r.json()),
            fetch(`/api/programs/${programId}/assignments`).then(r => r.json()),
        ]);
        if (progRes.program) {
            setProgram(progRes.program);
            setNameField(progRes.program.name);
            setDescField(progRes.program.description ?? "");
        }
        setAssignments(assignRes.assignments ?? []);
        setLoading(false);
    }, [programId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (<><TopNav title="PROGRAM" /><main className="px-[18px] pt-5 text-center text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Loading...</main></>);
    }
    if (!program) {
        return (<><TopNav title="PROGRAM" /><main className="px-[18px] pt-5 text-center text-[13px]" style={{ color: "var(--mu2)" }}>Not found</main></>);
    }

    const maxProgramWeek = program.weeks.reduce((m, w) => Math.max(m, w.weekNumber), 0);

    const patchProgram = async (data: object) => {
        setBusy(true);
        await fetch(`/api/programs/${programId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        await load();
        setBusy(false);
    };

    const handleSaveHeader = async () => {
        await patchProgram({ name: nameField.trim(), description: descField.trim() || null });
        setEditingHeader(false);
        showFlash("Saved");
    };

    const handlePublish = () => patchProgram({ status: "published" }).then(() => showFlash("Published"));
    const handleArchive = () => patchProgram({ status: "archived" }).then(() => showFlash("Archived"));

    const handleClone = async () => {
        setBusy(true);
        const res  = await fetch(`/api/programs/${programId}/clone`, { method: "POST" });
        const json = await res.json();
        setBusy(false);
        if (res.ok) window.location.href = `/programs/${json.program.id}`;
    };

    const handleAppendWeek = async () => {
        setBusy(true);
        await fetch(`/api/programs/${programId}/weeks`, { method: "POST" });
        await load();
        setBusy(false);
        showFlash("Week added");
    };

    const handleToggleRestDay = async (weekId: string, dayId: string, value: boolean) => {
        setBusy(true);
        await fetch(`/api/programs/${programId}/weeks/${weekId}/days/${dayId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isRestDay: value }),
        });
        await load();
        setBusy(false);
    };

    const handleAddSession = async (weekId: string, dayId: string, data: ProgramSessionData) => {
        await fetch(`/api/programs/${programId}/weeks/${weekId}/days/${dayId}/sessions`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, planSets: JSON.stringify(data.planSets), rounds: JSON.stringify(data.rounds) }),
        });
        await load();
        showFlash("Session added");
    };

    const handleSessionSheetAdd = (data: ProgramSessionData) => {
        if (!sessionSheet || !program) return;
        const week = program.weeks.find(w => w.days.some(d => d.id === sessionSheet.dayId));
        if (week) handleAddSession(week.id, sessionSheet.dayId, data);
    };

    const handleEditSession = async (sessionId: string, data: ProgramSessionData) => {
        await fetch(`/api/programs/${programId}/sessions/${sessionId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, planSets: JSON.stringify(data.planSets), rounds: JSON.stringify(data.rounds) }),
        });
        await load();
        showFlash("Session updated");
    };

    const handleDeleteSession = async () => {
        if (!confirmDeleteId) return;
        await fetch(`/api/programs/${programId}/sessions/${confirmDeleteId}`, { method: "DELETE" });
        setConfirmDeleteId(null);
        await load();
        showFlash("Session removed");
    };

    const handleMoveSession = async (weekId: string, day: PDay, sessionId: string, direction: "up" | "down") => {
        const ids = day.sessions.map(s => s.id);
        const idx = ids.indexOf(sessionId);
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= ids.length) return;
        [ids[idx], ids[target]] = [ids[target], ids[idx]];
        setBusy(true);
        await fetch(`/api/programs/${programId}/weeks/${weekId}/days/${day.id}/sessions/reorder`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionIds: ids }),
        });
        await load();
        setBusy(false);
    };

    const handleAssign = async (data: { traineeId: string; startDate: string; startWeek: number; endWeek: number | null }) => {
        const res  = await fetch(`/api/programs/${programId}/assign`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to assign");
        await load();
        showFlash(`Assigned — ${json.generatedCount} sessions generated`);
    };

    const handleAssignmentAction = async (assignmentId: string, action: "complete" | "cancel") => {
        setBusy(true);
        await fetch(`/api/programs/${programId}/assignments/${assignmentId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
        });
        await load();
        setBusy(false);
    };

    return (
        <>
            <TopNav title="PROGRAM BUILDER" />
            <main className="px-[18px] pt-5 pb-28">

                {/* header */}
                <div className="rounded-[12px] p-4 mb-5" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                    {editingHeader ? (
                        <>
                            <Input label="Name" value={nameField} onChange={e => setNameField(e.target.value)} />
                            <Textarea label="Description" value={descField} rows={3} onChange={e => setDescField(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={handleSaveHeader} className="flex-1 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
                                    style={{ fontFamily: "'DM Mono', monospace", background: "var(--acc)", border: "none", color: "#000" }}>Save</button>
                                <button onClick={() => setEditingHeader(false)} className="flex-1 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
                                    style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>Cancel</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="text-[20px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{program.name}</div>
                                    {program.description && <div className="text-[12px]" style={{ color: "var(--mu2)" }}>{program.description}</div>}
                                </div>
                                <span className="text-[10px] tracking-[1px] uppercase px-2 py-[3px] rounded-full flex-shrink-0"
                                    style={{ fontFamily: "'DM Mono', monospace", background: "var(--s2)", color: program.status === "published" ? "var(--grn)" : "var(--mu2)" }}>
                                    {program.status}
                                </span>
                            </div>
                            <button onClick={() => setEditingHeader(true)} className="text-[11px] cursor-pointer mb-3"
                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "none", color: "var(--acc)" }}>
                                Edit details
                            </button>
                            <div className="flex gap-2 flex-wrap">
                                {program.status === "draft" && (
                                    <button onClick={handlePublish} disabled={busy} className="rounded-[8px] px-3 py-[8px] text-[11px] cursor-pointer"
                                        style={{ fontFamily: "'DM Mono', monospace", background: "var(--acc)", border: "none", color: "#000" }}>Publish</button>
                                )}
                                {program.status !== "archived" && (
                                    <button onClick={handleArchive} disabled={busy} className="rounded-[8px] px-3 py-[8px] text-[11px] cursor-pointer"
                                        style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>Archive</button>
                                )}
                                <button onClick={handleClone} disabled={busy} className="rounded-[8px] px-3 py-[8px] text-[11px] cursor-pointer"
                                    style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>Clone</button>
                                {program.status === "published" && (
                                    <button onClick={() => setAssignOpen(true)} disabled={busy} className="rounded-[8px] px-3 py-[8px] text-[11px] cursor-pointer"
                                        style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--acc)", color: "var(--acc)" }}>Assign →</button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* weeks */}
                <div className="text-[10px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Weeks
                </div>
                {program.weeks.map(week => (
                    <div key={week.id} className="rounded-[12px] mb-3 overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                        <div className="px-4 pt-3 pb-2 text-[13px] tracking-[1px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>
                            Week {week.weekNumber}
                        </div>
                        <div className="flex px-3 pb-3 gap-[4px]">
                            {week.days.map((day, i) => {
                                const active = expandedDayId === day.id;
                                return (
                                    <button key={day.id}
                                        onClick={() => setExpandedDayId(active ? null : day.id)}
                                        className="flex-1 rounded-[8px] py-[8px] flex flex-col items-center gap-[3px] cursor-pointer"
                                        style={{
                                            background: active ? "var(--acc)" : day.isRestDay ? "#ffffff0a" : "var(--s2)",
                                            border: `1px solid ${active ? "var(--acc)" : "var(--br)"}`,
                                        }}
                                    >
                                        <span className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: active ? "#000" : "var(--mu)" }}>
                                            {DAY_LETTERS[i]}
                                        </span>
                                        <span className="text-[10px]" style={{ color: active ? "#000" : "var(--mu2)" }}>
                                            {day.isRestDay ? "🛌" : day.sessions.length || "—"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {week.days.filter(d => d.id === expandedDayId).map(day => (
                            <div key={day.id} className="px-4 pb-4" style={{ borderTop: "1px solid var(--br)" }}>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-[12px]" style={{ color: "var(--mu2)" }}>Rest Day</span>
                                    <button
                                        onClick={() => handleToggleRestDay(week.id, day.id, !day.isRestDay)}
                                        className="rounded-full px-3 py-[4px] text-[11px] cursor-pointer"
                                        style={{
                                            fontFamily: "'DM Mono', monospace",
                                            background: day.isRestDay ? "var(--acc)" : "var(--s2)",
                                            border: "1px solid var(--br)",
                                            color: day.isRestDay ? "#000" : "var(--mu2)",
                                        }}
                                    >
                                        {day.isRestDay ? "On" : "Off"}
                                    </button>
                                </div>

                                {!day.isRestDay && (
                                    <>
                                        {day.sessions.map((s, i) => {
                                            const meta = SESSION_TYPE_META[s.type as SessionType];
                                            return (
                                                <div key={s.id} className="rounded-[8px] p-3 mb-2 flex items-center justify-between"
                                                    style={{ background: "var(--s2)", border: "1px solid var(--br)" }}>
                                                    <div className="min-w-0">
                                                        <div className="text-[13px]" style={{ color: meta?.color ?? "var(--tx)" }}>{s.name}</div>
                                                        <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                                            {meta?.label}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => handleMoveSession(week.id, day, s.id, "up")} disabled={i === 0}
                                                            className="w-[20px] h-[20px] text-[10px] cursor-pointer" style={{ background: "none", border: "none", color: "var(--acc)", opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                                                        <button onClick={() => handleMoveSession(week.id, day, s.id, "down")} disabled={i === day.sessions.length - 1}
                                                            className="w-[20px] h-[20px] text-[10px] cursor-pointer" style={{ background: "none", border: "none", color: "var(--acc)", opacity: i === day.sessions.length - 1 ? 0.3 : 1 }}>↓</button>
                                                        <button onClick={() => setSessionSheet({ dayId: day.id, edit: parseSession(s) })}
                                                            className="text-[11px] px-2 cursor-pointer" style={{ background: "none", border: "none", color: "var(--mu2)", fontFamily: "'DM Mono', monospace" }}>Edit</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <button
                                            onClick={() => setSessionSheet({ dayId: day.id, edit: null })}
                                            className="w-full rounded-[8px] py-[9px] text-[11px] tracking-[1px] cursor-pointer"
                                            style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px dashed var(--br2)", color: "var(--mu2)" }}
                                        >
                                            + Add Session
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                <button
                    onClick={handleAppendWeek}
                    disabled={busy}
                    className="w-full rounded-[9px] py-[11px] mb-6 text-[13px] tracking-[1.5px] cursor-pointer"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", background: "transparent", border: "1px solid var(--acc)", color: "var(--acc)" }}
                >
                    + Append Week
                </button>

                {/* assignments */}
                <div className="text-[10px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Assignments
                </div>
                {assignments.length === 0 ? (
                    <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>None yet</div>
                ) : (
                    <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                        {assignments.map((a, i) => (
                            <div key={a.id} className="px-4 py-3 flex items-center justify-between"
                                style={{ borderBottom: i < assignments.length - 1 ? "1px solid var(--br)" : "none" }}>
                                <div>
                                    <div className="text-[13px]">{a.trainee.name}</div>
                                    <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                        {a.status} · from {a.startDate}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {a.previousAssignmentId && (
                                        <Link href={`/programs/${programId}/compare/${a.id}`} style={{ textDecoration: "none" }}>
                                            <span className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--acc)", color: "var(--acc)" }}>
                                                Compare →
                                            </span>
                                        </Link>
                                    )}
                                    {a.status === "active" && (
                                        <>
                                            <button onClick={() => handleAssignmentAction(a.id, "complete")}
                                                className="text-[10px] px-2 py-[4px] rounded-full cursor-pointer"
                                                style={{ fontFamily: "'DM Mono', monospace", background: "none", border: "1px solid var(--grn)", color: "var(--grn)" }}>
                                                Complete
                                            </button>
                                            <button onClick={() => handleAssignmentAction(a.id, "cancel")}
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

            <ProgramSessionSheet
                open={sessionSheet !== null}
                onClose={() => setSessionSheet(null)}
                onAdd={handleSessionSheetAdd}
                editSession={sessionSheet?.edit ?? null}
                onEdit={handleEditSession}
                onDelete={sessionSheet?.edit ? () => { setConfirmDeleteId(sessionSheet.edit!.id); setSessionSheet(null); } : undefined}
            />

            <ConfirmDialog
                open={confirmDeleteId !== null}
                message="Remove this session from the program?"
                onConfirm={handleDeleteSession}
                onCancel={() => setConfirmDeleteId(null)}
            />

            <AssignSheet
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                maxProgramWeek={maxProgramWeek}
                onAssign={handleAssign}
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
