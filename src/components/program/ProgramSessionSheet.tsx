"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { SESSION_TYPE_META, SessionType, TemplateSetLog, RoundEntry } from "@/types";
import PlanSetEditor from "@/components/program/PlanSetEditor";
import RoundLogger from "@/components/log/RoundLogger";

export interface ProgramSessionData {
    type:              SessionType;
    name:              string;
    desc:              string;
    planSets:          TemplateSetLog[];
    rounds:            RoundEntry[];
    referenceMovement: string;
}

interface ProgramSessionSheetProps {
    open:         boolean;
    onClose:      () => void;
    onAdd:        (data: ProgramSessionData) => void;
    editSession?: (ProgramSessionData & { id: string }) | null;
    onEdit?:      (id: string, data: ProgramSessionData) => void;
    onDelete?:    () => void;
}

export default function ProgramSessionSheet({
    open, onClose, onAdd, editSession, onEdit, onDelete,
}: ProgramSessionSheetProps) {
    const isEdit = !!editSession;

    const [type,              setType]              = useState<SessionType>(editSession?.type ?? "wod");
    const [name,              setName]              = useState(editSession?.name ?? "");
    const [desc,              setDesc]              = useState(editSession?.desc ?? "");
    const [planSets,          setPlanSets]          = useState<TemplateSetLog[]>(editSession?.planSets ?? []);
    const [rounds,            setRounds]            = useState<RoundEntry[]>(editSession?.rounds ?? []);
    const [referenceMovement, setReferenceMovement] = useState(editSession?.referenceMovement ?? "");

    const meta    = SESSION_TYPE_META[type];
    const useSets = meta.useSets;

    const reset = () => {
        setType("wod"); setName(""); setDesc("");
        setPlanSets([]); setRounds([]); setReferenceMovement("");
    };

    const handleSubmit = () => {
        if (!name.trim()) return;
        const data: ProgramSessionData = {
            type, name: name.toUpperCase().trim(), desc: desc.trim(),
            planSets, rounds, referenceMovement: referenceMovement.trim(),
        };
        if (isEdit && onEdit && editSession) onEdit(editSession.id, data);
        else onAdd(data);
        reset();
        onClose();
    };

    const handleClose = () => { reset(); onClose(); };

    return (
        <Sheet open={open} onClose={handleClose} title={isEdit ? "Edit Session" : "Add Session"}>

            {/* type picker */}
            <div className="mb-[14px]">
                <Label>Session Type</Label>
                <div className="grid grid-cols-3 gap-[7px] mt-[7px]">
                    {(Object.entries(SESSION_TYPE_META) as [SessionType, typeof meta][]).map(([id, m]) => (
                        <button
                            key={id}
                            onClick={() => { setType(id); setPlanSets([]); setRounds([]); setReferenceMovement(""); }}
                            className="rounded-[9px] py-[11px] px-2 text-center transition-all cursor-pointer"
                            style={{
                                background: type === id ? m.color + "14" : "var(--s2)",
                                border:     `1px solid ${type === id ? m.color + "66" : "var(--br)"}`,
                            }}
                        >
                            <div className="text-[11px]"
                                style={{ fontFamily: "'DM Mono', monospace", color: type === id ? m.color : "var(--mu2)" }}>
                                {m.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <Input
                label="Name"
                placeholder="e.g. FRAN, Back Squat, 5K Run"
                value={name}
                onChange={e => setName(e.target.value)}
            />

            <Textarea
                label="Description / Workout Details"
                placeholder={useSets ? "e.g. 5x5 Back Squat" : "e.g. 21-15-9 Thrusters / Pull-ups"}
                value={desc}
                rows={5}
                onChange={e => setDesc(e.target.value)}
            />

            {useSets && (
                <div className="mb-[14px]">
                    <Input
                        label="Reference Movement (optional)"
                        placeholder="e.g. Back Squat — matches a trainee's max record by name"
                        value={referenceMovement}
                        onChange={e => setReferenceMovement(e.target.value)}
                    />
                    <Label>Planned Sets</Label>
                    <PlanSetEditor sets={planSets} onChange={setPlanSets} />
                </div>
            )}

            {(type === "wod" || type === "zone") && (
                <div className="mb-[14px]">
                    <Label>Workout Rounds</Label>
                    <RoundLogger rounds={rounds} onChange={setRounds} />
                </div>
            )}

            <Button onClick={handleSubmit} disabled={!name.trim()}>
                {isEdit ? "Save Changes" : "Add Session"}
            </Button>
            <div className="h-2" />
            <Button variant="outline" onClick={handleClose}>Cancel</Button>

            {isEdit && onDelete && (
                <>
                    <div className="h-[1px] my-5" style={{ background: "var(--br)" }} />
                    <Button variant="danger" onClick={onDelete}>Remove Session</Button>
                </>
            )}
        </Sheet>
    );
}
