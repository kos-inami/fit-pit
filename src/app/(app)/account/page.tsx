"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import TopNav from "@/components/ui/TopNav";
import { useProgram } from "@/contexts/ProgramContext";
import { SESSION_TYPE_META, SessionType } from "@/types";

function isComplete(s: {
    sets: unknown[]; planSets: unknown[];
    rounds: unknown[]; resultRounds: unknown[];
    result: string | null; type: string;
    }) {
    const meta = SESSION_TYPE_META[s.type as SessionType];
    if (meta.useSets) return s.sets.length > 0;
    if (s.type === "wod" || s.type === "zone") return s.resultRounds.length > 0;
    return s.result !== null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] tracking-[2px] uppercase mb-3"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
        {children}
        </div>
    );
}

function StatCard({ value, label, color = "var(--acc)" }: {
    value: string | number; label: string; color?: string;
    }) {
    return (
        <div className="rounded-[10px] py-4 text-center"
        style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
        <div className="text-[28px] leading-none mb-[4px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color }}>
            {value}
        </div>
        <div className="text-[9px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            {label}
        </div>
        </div>
    );
}

// ─── option lists ─────────────────────────────────────────────
const GOAL_OPTIONS = [
    "Strength & Performance", "Competition Prep",
    "Fat Loss", "General Fitness", "Endurance",
    ];
    const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Elite"];

    const LEVEL_FIELDS = [
    { key: "levelCrossFit",      label: "CrossFit"       },
    { key: "levelWorkout",       label: "Workout"        },
    { key: "levelWeightLifting", label: "Weight Lifting" },
    { key: "levelCardio",        label: "Cardio"         },
    { key: "levelRunning",       label: "Running"        },
] as const;

// ────────────────────────────────────────────────────────────
export default function AccountPage() {
    const { data: authSession } = useSession();
    const userId   = authSession?.user?.id;
    const userName = authSession?.user?.name  ?? "User";
    const userEmail = authSession?.user?.email ?? "";
    const initials  = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const { days } = useProgram();

    // ── profile state ─────────────────────────────────────────
    type ProfileKey =
        | "primaryGoal" | "levelCrossFit" | "levelWorkout"
        | "levelWeightLifting" | "levelCardio" | "levelRunning"
        | "weight" | "height" | "age";

    const [profile, setProfile] = useState<Record<ProfileKey, string>>({
        primaryGoal:        "",
        levelCrossFit:      "",
        levelWorkout:       "",
        levelWeightLifting: "",
        levelCardio:        "",
        levelRunning:       "",
        weight:             "",
        height:             "",
        age:                "",
    });
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    useEffect(() => {
        if (!userId) return;
        fetch(`/api/profile?userId=${userId}`)
        .then(r => r.json())
        .then(json => {
            if (json.user) {
            setProfile({
                primaryGoal:        json.user.primaryGoal        ?? "",
                levelCrossFit:      json.user.levelCrossFit      ?? "",
                levelWorkout:       json.user.levelWorkout       ?? "",
                levelWeightLifting: json.user.levelWeightLifting ?? "",
                levelCardio:        json.user.levelCardio        ?? "",
                levelRunning:       json.user.levelRunning       ?? "",
                weight:             json.user.weight?.toString() ?? "",
                height:             json.user.height?.toString() ?? "",
                age:                json.user.age?.toString()    ?? "",
            });
            }
        })
        .catch(() => {});
    }, [userId]);

    const setField = (key: ProfileKey, value: string) =>
        setProfile(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        await fetch("/api/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, ...profile }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // ── stats ─────────────────────────────────────────────────
    const allDays     = Object.values(days);
    const allSessions = allDays.flatMap(d => d.sessions);
    const totalSessions  = allSessions.length;
    const completedCount = allSessions.filter(
        s => isComplete(s as Parameters<typeof isComplete>[0])
    ).length;

    const byType = (type: SessionType) =>
        allSessions.filter(s => s.type === type).length;

    const typeBreakdown = (Object.keys(SESSION_TYPE_META) as SessionType[])
        .map(type => ({ type, count: byType(type), meta: SESSION_TYPE_META[type] }))
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count);

    const inputStyle = {
        background: "var(--s2)",
        border:     "1px solid var(--br)",
        color:      "var(--tx)",
        fontFamily: "'DM Sans', sans-serif",
    };

    const selectStyle = { ...inputStyle, cursor: "pointer" };

    const daysLogged     = allDays.filter(d => d.recovery !== null).length;
    const recoveredDays  = allDays.filter(d => d.recovery !== null);
    const avgEnergy      = recoveredDays.length > 0
    ? Math.round(recoveredDays.reduce((a, d) => a + (d.recovery?.energy ?? 0), 0) / recoveredDays.length)
    : 2;

    const FEEL_COLOR = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];
    // const FEEL_LABEL = ["Spent","Okay","Good","Pumped","Beast"];
    // const FEEL_EMOJI = ["😴","🙂","💪","🔥","⚡"];
    const ENERGY_META = [
        { value: 1, label: "Exhausted", color: "#ff4c2b", emoji: "😴" },
        { value: 2, label: "Low",       color: "#ff9055", emoji: "😐" },
        { value: 3, label: "Moderate",  color: "#e8ff3c", emoji: "🙂" },
        { value: 4, label: "Good",      color: "#a8ff78", emoji: "💪" },
        { value: 5, label: "Excellent", color: "#3cffa0", emoji: "⚡" },
    ];

    const avgEnergyMeta = ENERGY_META[Math.min(Math.max(Math.round(avgEnergy) - 1, 0), 4)];

    return (
        <>
        <TopNav title="ACCOUNT" />

        <main className="px-[18px] pt-5 pb-28">

            {/* ── profile header ── */}
            <div className="flex items-center gap-4 mb-6">
            <div
                className="w-[60px] h-[60px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                background: "linear-gradient(135deg, #1a1a00, #333300)",
                border:     "2px solid var(--acc)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize:   22,
                color:      "var(--acc)",
                }}
            >
                {initials}
            </div>
            <div>
                <div className="text-[22px] tracking-[1px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {userName}
                </div>
                <div className="text-[11px] mt-[2px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                {userEmail}
                </div>
            </div>
            </div>

            {/* ── stats ── */}
            <SectionLabel>Overall</SectionLabel>
            <div className="grid grid-cols-3 gap-[8px] mb-5">
                <StatCard value={totalSessions}  label="Sessions"  />
                <StatCard value={completedCount} label="Completed" color="var(--grn)" />
                <StatCard value={daysLogged}     label="Days Done"  color="var(--blu)" />
            </div>

            {/* ── avg recovery ── */}
            <SectionLabel>Avg Recovery</SectionLabel>
            {recoveredDays.length > 0 ? (
                <div
                    className="rounded-[12px] px-4 py-4 flex items-center gap-4 mb-5"
                    style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
                >
                    <div
                    className="w-[48px] h-[48px] rounded-full flex items-center justify-center flex-shrink-0 text-[22px]"
                    style={{
                        background: avgEnergyMeta.color + "22",
                        border:     `1px solid ${avgEnergyMeta.color}`,
                    }}
                    >
                    {avgEnergyMeta.emoji}
                    </div>
                    <div>
                    <div className="text-[16px] font-medium" style={{ color: avgEnergyMeta.color }}>
                        {avgEnergyMeta.label}
                    </div>
                    <div className="text-[11px] mt-[2px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Based on {recoveredDays.length} logged days
                    </div>
                    </div>
                </div>
            ) : (
                <div
                    className="rounded-[12px] px-4 py-5 mb-5 text-center"
                    style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}
                >
                    <div className="text-[20px] mb-2">😴</div>
                    <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
                    No recovery logged yet
                    </div>
                    <div className="text-[11px]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Log recovery after your sessions to track readiness
                    </div>
                </div>
            )}

            {/* ── type breakdown ── */}
            {typeBreakdown.length > 0 && (
            <>
                <SectionLabel>Breakdown</SectionLabel>
                <div className="rounded-[12px] overflow-hidden mb-5"
                style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                {typeBreakdown.map((t, i) => {
                    const pct = Math.round((t.count / totalSessions) * 100);
                    return (
                    <div key={t.type} className="px-4 py-3"
                        style={{ borderBottom: i < typeBreakdown.length - 1 ? "1px solid var(--br)" : "none" }}>
                        <div className="flex items-center justify-between mb-[6px]">
                        <span className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: t.meta.color }}>
                            {t.meta.label}
                        </span>
                        <span className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu2)" }}>
                            {t.count} · {pct}%
                        </span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden"
                        style={{ height: 4, background: "var(--s2)" }}>
                        <div className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: t.meta.color, opacity: 0.8 }} />
                        </div>
                    </div>
                    );
                })}
                </div>
            </>
            )}

            {/* ── primary goal ── */}
            <SectionLabel>Primary Goal</SectionLabel>
            <div className="rounded-[12px] px-4 mb-5"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            <div className="py-[14px]">
                <select
                value={profile.primaryGoal}
                onChange={e => setField("primaryGoal", e.target.value)}
                className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
                style={selectStyle}
                >
                <option value="">— Select goal —</option>
                {GOAL_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                ))}
                </select>
            </div>
            </div>

            {/* ── experience levels ── */}
            <SectionLabel>Experience Levels</SectionLabel>
            <div className="rounded-[12px] px-4 mb-5"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            {LEVEL_FIELDS.map((f, i) => (
                <div key={f.key} className="py-[14px]"
                style={{ borderBottom: i < LEVEL_FIELDS.length - 1 ? "1px solid var(--br)" : "none" }}>
                <label className="block text-[10px] tracking-[1.5px] uppercase mb-2"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    {f.label}
                </label>
                <select
                    value={profile[f.key]}
                    onChange={e => setField(f.key, e.target.value)}
                    className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
                    style={selectStyle}
                >
                    <option value="">— Select level —</option>
                    {LEVEL_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                    ))}
                </select>
                </div>
            ))}
            </div>

            {/* ── body stats ── */}
            <SectionLabel>Body Stats</SectionLabel>
            <div className="rounded-[12px] px-4 mb-5"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            {([
                { key: "weight" as ProfileKey, label: "Weight (kg)", placeholder: "e.g. 75"  },
                { key: "height" as ProfileKey, label: "Height (cm)", placeholder: "e.g. 175" },
                { key: "age"    as ProfileKey, label: "Age",         placeholder: "e.g. 28"  },
            ]).map((f, i, arr) => (
                <div key={f.key} className="py-[14px]"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--br)" : "none" }}>
                <label className="block text-[10px] tracking-[1.5px] uppercase mb-2"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    {f.label}
                </label>
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder={f.placeholder}
                    value={profile[f.key]}
                    onChange={e => setField(f.key, e.target.value)}
                    className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
                    style={inputStyle}
                />
                </div>
            ))}
            </div>

            {/* ── save button ── */}
            <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer mb-3"
            style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: saved ? "var(--grn)" : saving ? "var(--s3)" : "var(--acc)",
                border:     "none",
                color:      saved ? "#000" : saving ? "var(--mu)" : "#000",
            }}
            >
            {saved ? "✓ Saved" : saving ? "Saving..." : "Save Profile"}
            </button>

            {/* ── sign out ── */}
            <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
            style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: "transparent",
                border:     "1px solid var(--br2)",
                color:      "var(--mu2)",
            }}
            >
            Sign Out
            </button>

        </main>
        </>
    );
}