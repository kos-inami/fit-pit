"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { SESSION_TYPE_META, SessionType, SetLog, RoundEntry } from "@/types";
import SetLogger from "@/components/log/SetLogger";
import RoundLogger from "@/components/log/RoundLogger";
import ScreenshotScanner from "@/components/log/ScreenshotScanner";

interface AddSessionSheetProps {
  open:         boolean;
  onClose:      () => void;
  onAdd:        (session: {
    type:     SessionType;
    name:     string;
    desc:     string;
    planSets: SetLog[];
    rounds:   RoundEntry[];
  }) => void;
  editSession?: {
    id:       string;
    type:     SessionType;
    name:     string;
    desc:     string;
    planSets: SetLog[];
    rounds:   RoundEntry[];
  } | null;
  onEdit?:   (id: string, data: {
    type:     SessionType;
    name:     string;
    desc:     string;
    planSets: SetLog[];
    rounds:   RoundEntry[];
  }) => void;
  onDelete?: () => void;
}

export default function AddSessionSheet({
  open, onClose, onAdd, editSession, onEdit, onDelete,
}: AddSessionSheetProps) {
  const { data: authSession } = useSession();
  const userId                = authSession?.user?.id;
  const isEdit                = !!editSession;

  const [type,             setType]             = useState<SessionType>(editSession?.type     ?? "wod");
  const [name,             setName]             = useState(editSession?.name     ?? "");
  const [desc,             setDesc]             = useState(editSession?.desc     ?? "");
  const [planSets,         setPlanSets]         = useState<SetLog[]>(editSession?.planSets    ?? []);
  const [rounds,           setRounds]           = useState<RoundEntry[]>(editSession?.rounds  ?? []);
  const [allRecords,       setAllRecords]       = useState<{ movement: string; weight: number }[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<string>("");
  const [maxWeight,        setMaxWeight]        = useState<number | null>(null);
  const [showScanner,      setShowScanner]      = useState(false);

  const meta    = SESSION_TYPE_META[type];
  const useSets = meta.useSets;

  // ── load all records with weights when sheet opens ────────
  useEffect(() => {
    if (!userId || !open) return;
    let cancelled = false;

    fetch(`/api/records?userId=${userId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const records: { movement: string; weight?: number | null }[] = json.records ?? [];
        const map: Record<string, number> = {};
        records.forEach(r => {
          if (r.weight && r.weight > 0) {
            if (!map[r.movement] || r.weight > map[r.movement]) {
              map[r.movement] = r.weight;
            }
          }
        });
        setAllRecords(
          Object.entries(map).map(([movement, weight]) => ({ movement, weight }))
        );
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [userId, open]);

  // ── update maxWeight when selection changes ───────────────
  useEffect(() => {
    const found = allRecords.find(r => r.movement === selectedMovement);
    const id    = setTimeout(() => setMaxWeight(found?.weight ?? null), 0);
    return () => clearTimeout(id);
  }, [selectedMovement, allRecords]);

  const reset = () => {
    setType("wod");
    setName("");
    setDesc("");
    setPlanSets([]);
    setRounds([]);
    setSelectedMovement("");
    setMaxWeight(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data = {
      type,
      name:     name.toUpperCase().trim(),
      desc:     desc.trim(),
      planSets,
      rounds,
    };
    if (isEdit && onEdit && editSession) {
      onEdit(editSession.id, data);
    } else {
      onAdd(data);
    }
    reset();
    onClose();
  };

  const handleFill = (data: { name: string; desc: string; type: SessionType }) => {
    if (!isEdit) setType(data.type);
    setName(data.name);
    setDesc(data.desc);
    setShowScanner(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // when maxWeight changes, recalculate % for all sets that have weight
  useEffect(() => {
    if (!maxWeight) return;
    const id = setTimeout(() => {
      setPlanSets(prev => prev.map(set => ({
        ...set,
        maxWeight:  maxWeight,
        percentage: set.weight !== null
          ? Math.round((set.weight / maxWeight) * 100)
          : set.percentage,
      })));
    }, 0);
    return () => clearTimeout(id);
  }, [maxWeight]);

  return (
    <Sheet open={open} onClose={handleClose} title={isEdit ? "Edit Session" : "Add Session"}>


      {/* screenshot scanner button — add mode only */}
      {!isEdit && (
        <button
          onClick={() => setShowScanner(s => !s)}
          className="w-full rounded-[8px] py-[9px] text-[11px] tracking-[1px] mb-[0.5rem] cursor-pointer"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: showScanner ? "var(--s3)" : "transparent",
            border:     "1px solid var(--br2)",
            color:      "var(--mu2)",
          }}
        >
          {showScanner ? "✕ Close Scanner" : "📸 Use Screenshot"}
        </button>
      )}

      {/* type picker */}
      <div className="mb-[14px]">
        <Label>Session Type</Label>
        {isEdit && (
          <p className="text-[11px] mb-2"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Type cannot be changed after creation
          </p>
        )}
        <div className="grid grid-cols-3 gap-[7px] mt-[7px]">
          {(Object.entries(SESSION_TYPE_META) as [SessionType, typeof meta][]).map(([id, m]) => (
            <button
              key={id}
              onClick={() => {
                if (!isEdit) {
                  setType(id);
                  setPlanSets([]);
                  setRounds([]);
                  setSelectedMovement("");
                  setMaxWeight(null);
                }
              }}
              className="rounded-[9px] py-[11px] px-2 text-center transition-all"
              style={{
                background: type === id ? m.color + "14" : "var(--s2)",
                border:     `1px solid ${type === id ? m.color + "66" : "var(--br)"}`,
                cursor:     isEdit ? "default" : "pointer",
                opacity:    isEdit && type !== id ? 0.3 : 1,
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

      {showScanner && (
        <div className="mb-4 rounded-[10px] p-4"
          style={{ background: "var(--s2)", border: "1px solid var(--br)" }}>
          <ScreenshotScanner
            onFill={handleFill}
            onClose={() => setShowScanner(false)}
          />
        </div>
      )}

      {/* name */}
      <Input
        label="Name"
        placeholder="e.g. FRAN, Back Squat, 5K Run"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* description */}
      <Textarea
        label="Description / Workout Details"
        placeholder={useSets ? "e.g. 5×5 Back Squat @ 85%" : "e.g. 21-15-9 Thrusters / Pull-ups"}
        value={desc}
        rows={6}
        onChange={e => setDesc(e.target.value)}
      />

      {/* plan sets — Strength / WL / Accessory */}
      {useSets && (
        <div className="mb-[14px]">
          <Label>Planned Sets</Label>

          {/* max record selector */}
          <div className="mb-3">
            <div
              className="text-[9px] tracking-[1.5px] uppercase mb-[7px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
            >
              Reference Max Record
            </div>
            <select
              value={selectedMovement}
              onChange={e => setSelectedMovement(e.target.value)}
              className="w-full rounded-[8px] px-[13px] py-[10px] text-[13px] outline-none"
              style={{
                background: "var(--s2)",
                border:     "1px solid var(--br)",
                color:      selectedMovement ? "var(--tx)" : "var(--mu2)",
                fontFamily: "'DM Sans', sans-serif",
                cursor:     "pointer",
              }}
            >
              <option value="">— Select max record —</option>
              {allRecords.map(r => (
                <option key={r.movement} value={r.movement}>
                  {r.movement} — {r.weight}kg
                </option>
              ))}
            </select>
            {maxWeight && (
              <div
                className="mt-1 text-[11px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}
              >
                Max: {maxWeight}kg — % inputs will auto-calculate weight
              </div>
            )}
            {allRecords.length === 0 && (
              <div
                className="mt-1 text-[11px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
              >
                No max records yet — add them in Records tab
              </div>
            )}
          </div>

          <SetLogger
            sets={planSets}
            onChange={setPlanSets}
            maxWeight={maxWeight}
          />
        </div>
      )}

      {/* planning rounds — WOD / Zone */}
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