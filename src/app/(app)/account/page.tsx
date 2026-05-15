"use client";

import { useState } from "react";
import TopNav from "@/components/ui/TopNav";
import { useProgram } from "@/contexts/ProgramContext";
import { SESSION_TYPE_META, SessionType } from "@/types";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

// ─── helpers ─────────────────────────────────────────────────
const TODAY_STR  = new Date().toISOString().split("T")[0];
const FEEL_COLOR = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];

function getThisWeekDates(): string[] {
    const now  = new Date();
    const day  = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(now);
    mon.setDate(now.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return d.toISOString().split("T")[0];
    });
}

function isComplete(s: {
    sets:         unknown[];
    planSets:     unknown[];
    rounds:       unknown[];
    resultRounds: unknown[];
    result:       string | null;
    type:         string;
    }) {
    const meta = SESSION_TYPE_META[s.type as SessionType];
    if (meta.useSets) return s.sets.length > 0;  // result sets only
    if (s.type === "wod" || s.type === "zone") return s.resultRounds.length > 0;  // result rounds only
    return s.result !== null;
}

// ─── sub-components ───────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
        className="text-[10px] tracking-[2px] uppercase mb-3"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
        >
        {children}
        </div>
    );
}

function StatCard({ value, label, color = "var(--acc)" }: {
    value: string | number; label: string; color?: string;
    }) {
    return (
        <div
        className="rounded-[10px] py-4 text-center"
        style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
        >
        <div
            className="text-[28px] leading-none mb-[4px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color }}
        >
            {value}
        </div>
        <div
            className="text-[9px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
        >
            {label}
        </div>
        </div>
    );
}

function PrefRow({ label, value, onTap }: {
    label: string; value: string; onTap?: () => void;
    }) {
    return (
        <div
        className="flex items-center justify-between py-[14px]"
        style={{ borderBottom: "1px solid var(--br)" }}
        >
        <span className="text-[14px]">{label}</span>
        <div className="flex items-center gap-2">
            <span
            className="text-[12px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
            >
            {value}
            </span>
            {onTap && (
            <span style={{ color: "var(--mu)", fontSize: 12 }}>›</span>
            )}
        </div>
        </div>
    );
}

// ─── edit preference sheet ────────────────────────────────────
function EditSheet({
    open, label, value, options, onSave, onClose,
    }: {
    open: boolean;
    label: string;
    value: string;
    options: string[];
    onSave: (v: string) => void;
    onClose: () => void;
    }) {
    const [selected, setSelected] = useState(value);

    if (!open) return null;

    return (
        <div
        className="fixed inset-0 z-[80] flex items-end"
        style={{ background: "rgba(0,0,0,0.8)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        >
        <div
            className="w-full max-w-[430px] mx-auto rounded-t-[20px] pb-10"
            style={{
            background:  "var(--s1)",
            borderTop:   "1px solid var(--br)",
            padding:     "22px 18px 40px",
            animation:   "slideUp .25s cubic-bezier(.16,1,.3,1)",
            }}
        >
            <div
            className="w-9 h-[3px] rounded-full mx-auto mb-5"
            style={{ background: "var(--br2)" }}
            />
            <div
            className="text-[20px] tracking-[2px] mb-5"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
            {label}
            </div>
            <div className="space-y-[6px] mb-6">
            {options.map(opt => (
                <button
                key={opt}
                onClick={() => setSelected(opt)}
                className="w-full rounded-[9px] px-4 py-[12px] text-left text-[14px] cursor-pointer transition-colors"
                style={{
                    background:  selected === opt ? "var(--acc)" : "var(--s2)",
                    border:      `1px solid ${selected === opt ? "var(--acc)" : "var(--br)"}`,
                    color:       selected === opt ? "#000" : "var(--tx)",
                    fontFamily:  "'DM Sans', sans-serif",
                }}
                >
                {opt}
                </button>
            ))}
            </div>
            <button
            onClick={() => { onSave(selected); onClose(); }}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
            style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: "var(--acc)",
                border:     "none",
                color:      "#000",
            }}
            >
            Save
            </button>
        </div>
        <style>{`
            @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
            }
        `}</style>
        </div>
    );
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function AccountPage() {

    const { data: authSession } = useSession();
    const userName  = authSession?.user?.name  ?? "User";
    const userEmail = authSession?.user?.email ?? "";
    const initials  = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const { days } = useProgram();

    // ── prefs state ───────────────────────────────────────────
    const [prefs, setPrefs] = useState({
        goal:    "Strength & Performance",
        level:   "Intermediate (2–3 yrs)",
        box:     "CrossFit Neutral Bay",
        units:   "Metric (kg)",
        aiCoach: "Enabled",
    });

    const [editPref, setEditPref] = useState<null | {
        key:     keyof typeof prefs;
        label:   string;
        options: readonly string[];
        }>(null);

    const setPref = (key: keyof typeof prefs, value: string) =>
        setPrefs(prev => ({ ...prev, [key]: value }));

    // ── stats ─────────────────────────────────────────────────
    const allDays     = Object.values(days);
    const allSessions = allDays.flatMap(d => d.sessions);

    const totalSessions  = allSessions.length;
    const completedCount = allSessions.filter(isComplete).length;
    const daysLogged     = allDays.filter(d => d.recovery !== null).length;

    const byType = (type: SessionType) =>
        allSessions.filter(s => s.type === type).length;

    const weekDates   = getThisWeekDates();
    const weekSessions = weekDates.flatMap(d => days[d]?.sessions ?? []);
    const weekCompleted = weekSessions.filter(isComplete).length;

    // avg energy from completed days
    const recoveredDays   = allDays.filter(d => d.recovery !== null);
    const avgEnergy       = recoveredDays.length > 0
        ? Math.round(recoveredDays.reduce((a, d) => a + (d.recovery?.energy ?? 0), 0) / recoveredDays.length)
        : 2;

    // ── type breakdown bar ────────────────────────────────────
    const typeBreakdown = (Object.keys(SESSION_TYPE_META) as SessionType[])
        .map(type => ({
        type,
        count: byType(type),
        meta:  SESSION_TYPE_META[type],
        }))
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count);

    return (
        <>
        <TopNav title="ACCOUNT" />

        <main className="px-[18px] pt-5 pb-28">

            {/* ── profile ── */}
            <div className="flex items-center gap-4 mb-6 py-[1rem]">
                <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center flex-shrink-0 mr-[0.5rem]"
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

            {/* ── this week ── */}
            <SectionLabel>This Week</SectionLabel>
            <div className="grid grid-cols-2 gap-[8px] mb-[1rem]">
                <StatCard value={weekSessions.length} label="Planned"   />
                <StatCard value={weekCompleted}        label="Completed" color="var(--grn)" />
            </div>

            {/* ── overall stats ── */}
            <SectionLabel>Overall</SectionLabel>
            <div className="grid grid-cols-3 gap-[8px] mb-[1rem]">
                <StatCard value={totalSessions}  label="Sessions"  />
                <StatCard value={completedCount} label="Completed" color="var(--grn)" />
                <StatCard value={daysLogged}     label="Days Done"  color="var(--blu)" />
            </div>

            {/* ── session type breakdown ── */}
            {typeBreakdown.length > 0 && (
            <>
                <SectionLabel>Breakdown</SectionLabel>
                <div
                className="rounded-[12px] overflow-hidden mb-[1rem] "
                style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
                >
                {typeBreakdown.map((t, i) => {
                    const pct = Math.round((t.count / totalSessions) * 100);
                    return (
                    <div
                        key={t.type}
                        className="px-[1rem] py-[0.5rem]"
                        style={{ borderBottom: i < typeBreakdown.length - 1 ? "1px solid var(--br)" : "none" }}
                    >
                        <div className="flex items-center justify-between mb-[6px]">
                        <span
                            className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: t.meta.color }}
                        >
                            {t.meta.label}
                        </span>
                        <span
                            className="text-[12px]"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                        >
                            {t.count} · {pct}%
                        </span>
                        </div>
                        {/* progress bar */}
                        <div
                        className="w-full rounded-full overflow-hidden"
                        style={{ height: 4, background: "var(--s2)" }}
                        >
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                            width:      `${pct}%`,
                            background: t.meta.color,
                            opacity:    0.8,
                            }}
                        />
                        </div>
                    </div>
                    );
                })}
                </div>
            </>
            )}

            {/* ── avg recovery ── */}
            {recoveredDays.length > 0 && (
            <>
                <SectionLabel>Avg Recovery</SectionLabel>
                <div
                className="rounded-[12px] px-4 py-4 flex items-center gap-4 mb-[1rem] p-[1rem]"
                style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
                >
                    <div
                        className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 mr-[1rem]"
                        style={{ background: FEEL_COLOR[avgEnergy] + "22", border: `1px solid ${FEEL_COLOR[avgEnergy]}` }}
                    >
                        <span style={{ fontSize: 20 }}>
                        {["😴","🙂","💪","🔥","⚡"][avgEnergy]}
                        </span>
                    </div>
                    <div>
                        <div
                        className="text-[15px] font-medium"
                        style={{ color: FEEL_COLOR[avgEnergy] }}
                        >
                        {["Spent","Okay","Good","Pumped","Beast"][avgEnergy]}
                        </div>
                        <div
                        className="text-[11px] mt-[2px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
                        >
                        Based on {recoveredDays.length} logged days
                        </div>
                    </div>
                </div>
            </>
            )}

            {/* ── preferences ── */}
            <SectionLabel>Preferences</SectionLabel>
            <div
            className="rounded-[12px] px-4 mb-[1rem] px-[1rem]"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
            >
            {([
                {
                key:     "goal" as const,
                label:   "Primary Goal",
                options: ["Strength & Performance","Fat Loss","Endurance","General Fitness","Competition Prep"],
                },
                {
                key:     "level" as const,
                label:   "Experience Level",
                options: ["Beginner (<1 yr)","Intermediate (2–3 yrs)","Advanced (4+ yrs)","Elite / Competitor"],
                },
                {
                key:     "units" as const,
                label:   "Weight Units",
                options: ["Metric (kg)","Imperial (lbs)"],
                },
                {
                key:     "aiCoach" as const,
                label:   "AI Coaching",
                options: ["Enabled","Disabled"],
                },
            ] as const).map(pref => (
                <PrefRow
                key={pref.key}
                label={pref.label}
                value={prefs[pref.key]}
                onTap={() => setEditPref(pref)}
                />
            ))}
            <PrefRow label="Box / Gym" value={prefs.box} />
            </div>

            {/* ── connected ── */}
            <SectionLabel>Connected</SectionLabel>
            <div
            className="rounded-[12px] px-4 mb-[1rem] px-[1rem]"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
            >
            {[
                { name: "Apple Health", status: "Considering" },
                // { name: "Strava",       status: "Considering" },
                // { name: "Garmin",       status: "Considering" },
            ].map((c, i, arr) => (
                <div
                key={c.name}
                className="flex items-center justify-between py-[14px]"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--br)" : "none" }}
                >
                <span className="text-[14px]">{c.name}</span>
                <span
                    className="text-[11px]"
                    style={{
                    fontFamily: "'DM Mono', monospace",
                    color:      c.status === "Synced" ? "var(--grn)" : "var(--mu)",
                    }}
                >
                    {c.status}
                </span>
                </div>
            ))}
            </div>

            {/* ── sign out placeholder ── */}
            <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
                style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    background: "transparent",
                    border:     "1px solid var(--br2)",
                    color:      "var(--mu)",
                }}
                >
                Sign Out
            </button>

        </main>

        {/* edit pref sheet */}
        {editPref && (
            <EditSheet
            open
            label={editPref.label}
            value={prefs[editPref.key]}
            options={editPref.options as unknown as string[]}
            onSave={(v) => setPref(editPref.key, v)}
            onClose={() => setEditPref(null)}
            />
        )}
        </>
    );
}