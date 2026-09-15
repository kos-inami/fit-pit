"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getTodayString } from "@/lib/utils";

interface EnrollSheetProps {
    open:           boolean;
    onClose:        () => void;
    programName:    string;
    onEnroll: (data: { startDate: string; startWeek: number; endWeek: number | null }) => Promise<void>;
}

const WARN_WEEKS = 12;
// no total week count is known client-side for an open program (no preview per the spec),
// so the >12-week confirm only fires once an explicit endWeek makes the count knowable.

export default function EnrollSheet({ open, onClose, programName, onEnroll }: EnrollSheetProps) {
    const [startDate, setStartDate] = useState(getTodayString());
    const [startWeek, setStartWeek] = useState("1");
    const [endWeek,   setEndWeek]   = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    const reset = () => {
        setStartDate(getTodayString());
        setStartWeek("1"); setEndWeek(""); setError(""); setConfirmOpen(false);
    };
    const handleClose = () => { reset(); onClose(); };

    const explicitWeekCount = () => {
        if (!endWeek) return null;
        const sw = parseInt(startWeek) || 1;
        const ew = parseInt(endWeek);
        return Math.max(0, ew - sw + 1);
    };

    const doEnroll = async () => {
        setSubmitting(true);
        setError("");
        try {
            await onEnroll({
                startDate,
                startWeek: parseInt(startWeek) || 1,
                endWeek: endWeek ? parseInt(endWeek) : null,
            });
            reset();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to enrol");
        }
        setSubmitting(false);
    };

    const handleSubmit = () => {
        if (!startDate) return;
        const count = explicitWeekCount();
        if (count !== null && count > WARN_WEEKS) {
            setConfirmOpen(true);
            return;
        }
        doEnroll();
    };

    return (
        <>
            <Sheet open={open} onClose={handleClose} title={`Enrol — ${programName}`}>
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
                    {!endWeek
                        ? "Open-ended — future appended weeks generate automatically."
                        : `Generates ${explicitWeekCount()} week${explicitWeekCount() !== 1 ? "s" : ""} of sessions.`}
                </div>

                {error && (
                    <div className="text-[11px] mb-3" style={{ color: "var(--red)" }}>{error}</div>
                )}

                <Button onClick={handleSubmit} disabled={submitting || !startDate}>
                    {submitting ? "Enrolling..." : "Enrol"}
                </Button>
                <div className="h-2" />
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </Sheet>

            <ConfirmDialog
                open={confirmOpen}
                message={`This will generate ${explicitWeekCount()} weeks of sessions at once. Continue?`}
                onConfirm={() => { setConfirmOpen(false); doEnroll(); }}
                onCancel={() => setConfirmOpen(false)}
            />
        </>
    );
}
