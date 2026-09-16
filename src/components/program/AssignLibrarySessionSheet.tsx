"use client";

import { useState, useEffect } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { getTodayString } from "@/lib/utils";
import LibrarySessionPicker, { LibraryRow } from "@/components/program/LibrarySessionPicker";

interface ActiveClient {
    id: string;
    trainee: { id: string; name: string };
}

interface AssignLibrarySessionSheetProps {
    open:              boolean;
    onClose:           () => void;
    librarySessionId?: string; // locked — skip the library picker (library page entry point)
    librarySessionName?: string;
    traineeId?:        string; // locked — skip the client picker (client detail page entry point)
    onAssigned:        () => void;
}

export default function AssignLibrarySessionSheet({
    open, onClose, librarySessionId, librarySessionName, traineeId, onAssigned,
}: AssignLibrarySessionSheetProps) {
    const [clients,        setClients]        = useState<ActiveClient[]>([]);
    const [selectedTrainee, setSelectedTrainee] = useState(traineeId ?? "");
    const [selectedLibrary, setSelectedLibrary] = useState<LibraryRow | null>(null);
    const [date,           setDate]           = useState(getTodayString());
    const [submitting,     setSubmitting]     = useState(false);
    const [error,          setError]          = useState("");

    useEffect(() => {
        if (!open || traineeId) return;
        fetch("/api/trainer/clients")
            .then(r => r.json())
            .then(json => setClients((json.clients ?? []).filter((c: { status: string }) => c.status === "active")))
            .catch(() => {});
    }, [open, traineeId]);

    const reset = () => {
        setSelectedTrainee(traineeId ?? "");
        setSelectedLibrary(null);
        setDate(getTodayString());
        setError("");
    };
    const handleClose = () => { reset(); onClose(); };

    const effectiveLibraryId = librarySessionId ?? selectedLibrary?.id;

    const handleSubmit = async () => {
        if (!selectedTrainee || !effectiveLibraryId || !date) return;
        setSubmitting(true);
        setError("");
        try {
            const res  = await fetch(`/api/library/${effectiveLibraryId}/assign`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ traineeId: selectedTrainee, date }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to assign");
            reset();
            onClose();
            onAssigned();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to assign");
        }
        setSubmitting(false);
    };

    return (
        <Sheet open={open} onClose={handleClose} title="Assign from Library">
            {!traineeId && (
                <Select label="Client" value={selectedTrainee} onChange={e => setSelectedTrainee(e.target.value)}>
                    <option value="">— Select client —</option>
                    {clients.map(c => (
                        <option key={c.trainee.id} value={c.trainee.id}>{c.trainee.name}</option>
                    ))}
                </Select>
            )}

            {!librarySessionId && (
                <div className="mb-[14px]">
                    {selectedLibrary ? (
                        <div className="rounded-[8px] px-3 py-[10px] flex items-center justify-between"
                            style={{ background: "var(--s2)", border: "1px solid var(--acc)" }}>
                            <span className="text-[13px]">{selectedLibrary.name}</span>
                            <button onClick={() => setSelectedLibrary(null)}
                                className="text-[11px] cursor-pointer"
                                style={{ background: "none", border: "none", color: "var(--mu)", fontFamily: "'DM Mono', monospace" }}>
                                Change
                            </button>
                        </div>
                    ) : (
                        <LibrarySessionPicker onSelect={setSelectedLibrary} />
                    )}
                </div>
            )}

            {librarySessionId && librarySessionName && (
                <div className="text-[12px] mb-3" style={{ color: "var(--mu2)" }}>
                    Assigning <span style={{ color: "var(--acc)" }}>{librarySessionName}</span>
                </div>
            )}

            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />

            {error && (
                <div className="text-[11px] mb-3" style={{ color: "var(--red)" }}>{error}</div>
            )}

            <Button onClick={handleSubmit} disabled={submitting || !selectedTrainee || !effectiveLibraryId || !date}>
                {submitting ? "Assigning..." : "Assign"}
            </Button>
            <div className="h-2" />
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
        </Sheet>
    );
}
