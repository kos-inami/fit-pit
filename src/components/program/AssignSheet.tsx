"use client";

import { useState, useEffect } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getTodayString } from "@/lib/utils";

interface ActiveClient {
    id: string;
    trainee: { id: string; name: string };
}

interface AssignSheetProps {
    open:          boolean;
    onClose:       () => void;
    maxProgramWeek: number;
    onAssign: (data: { traineeId: string; startDate: string; startWeek: number; endWeek: number | null }) => Promise<void>;
}

const WARN_WEEKS = 12;

export default function AssignSheet({ open, onClose, maxProgramWeek, onAssign }: AssignSheetProps) {
    const [clients,   setClients]   = useState<ActiveClient[]>([]);
    const [traineeId, setTraineeId] = useState("");
    const [startDate, setStartDate] = useState(getTodayString());
    const [startWeek, setStartWeek] = useState("1");
    const [endWeek,   setEndWeek]   = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        fetch("/api/trainer/clients")
            .then(r => r.json())
            .then(json => setClients((json.clients ?? []).filter((c: { status: string }) => c.status === "active")))
            .catch(() => {});
    }, [open]);

    const reset = () => {
        setTraineeId(""); setStartDate(getTodayString());
        setStartWeek("1"); setEndWeek(""); setError(""); setConfirmOpen(false);
    };
    const handleClose = () => { reset(); onClose(); };

    const weekCount = () => {
        const sw = parseInt(startWeek) || 1;
        const ew = endWeek ? parseInt(endWeek) : maxProgramWeek;
        return Math.max(0, ew - sw + 1);
    };

    const doAssign = async () => {
        setSubmitting(true);
        setError("");
        try {
            await onAssign({
                traineeId,
                startDate,
                startWeek: parseInt(startWeek) || 1,
                endWeek: endWeek ? parseInt(endWeek) : null,
            });
            reset();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to assign");
        }
        setSubmitting(false);
    };

    const handleSubmit = () => {
        if (!traineeId || !startDate) return;
        if (weekCount() > WARN_WEEKS) {
            setConfirmOpen(true);
            return;
        }
        doAssign();
    };

    return (
        <>
            <Sheet open={open} onClose={handleClose} title="Assign Program">
                <Select label="Client" value={traineeId} onChange={e => setTraineeId(e.target.value)}>
                    <option value="">— Select client —</option>
                    {clients.map(c => (
                        <option key={c.trainee.id} value={c.trainee.id}>{c.trainee.name}</option>
                    ))}
                </Select>
                {clients.length === 0 && (
                    <div className="text-[11px] mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        No active clients yet
                    </div>
                )}

                <Input
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3 mb-[14px]">
                    <div>
                        <Label>Start Week</Label>
                        <input
                            type="number" min={1} value={startWeek}
                            onChange={e => setStartWeek(e.target.value)}
                            className="w-full rounded-[8px] px-3 py-[11px] text-[14px] outline-none"
                            style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Mono', monospace" }}
                        />
                    </div>
                    <div>
                        <Label>End Week (optional)</Label>
                        <input
                            type="number" min={1} placeholder="Open-ended"
                            value={endWeek}
                            onChange={e => setEndWeek(e.target.value)}
                            className="w-full rounded-[8px] px-3 py-[11px] text-[14px] outline-none"
                            style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Mono', monospace" }}
                        />
                    </div>
                </div>

                <div className="text-[11px] mb-3" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Generates {weekCount()} week{weekCount() !== 1 ? "s" : ""} of sessions.
                    {!endWeek && " Open-ended — future appended weeks generate automatically."}
                </div>

                {error && (
                    <div className="text-[11px] mb-3" style={{ color: "var(--red)" }}>{error}</div>
                )}

                <Button onClick={handleSubmit} disabled={submitting || !traineeId || !startDate}>
                    {submitting ? "Assigning..." : "Assign"}
                </Button>
                <div className="h-2" />
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </Sheet>

            <ConfirmDialog
                open={confirmOpen}
                message={`This will generate ${weekCount()} weeks of sessions at once. Continue?`}
                onConfirm={() => { setConfirmOpen(false); doAssign(); }}
                onCancel={() => setConfirmOpen(false)}
            />
        </>
    );
}
