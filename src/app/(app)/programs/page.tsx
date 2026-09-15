"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/ui/TopNav";
import { Input } from "@/components/ui/Input";

interface ProgramRow {
    id: string; name: string; description: string | null;
    status: "draft" | "published" | "archived";
    accessMode: string; createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
    draft:     { label: "Draft",     color: "var(--mu2)" },
    published: { label: "Published", color: "var(--grn)" },
    archived:  { label: "Archived",  color: "var(--mu)"  },
};

export default function ProgramsPage() {
    const router = useRouter();
    const [programs, setPrograms] = useState<ProgramRow[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName,  setNewName]  = useState("");
    const [showNew,  setShowNew]  = useState(false);

    useEffect(() => {
        fetch("/api/programs")
            .then(r => r.json())
            .then(json => setPrograms(json.programs ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res  = await fetch("/api/programs", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ name: newName.trim() }),
            });
            const json = await res.json();
            if (res.ok) router.push(`/programs/${json.program.id}`);
        } catch { /* ignore */ }
        setCreating(false);
    };

    const groups: { status: ProgramRow["status"]; rows: ProgramRow[] }[] = [
        { status: "draft",     rows: programs.filter(p => p.status === "draft") },
        { status: "published", rows: programs.filter(p => p.status === "published") },
        { status: "archived",  rows: programs.filter(p => p.status === "archived") },
    ];

    return (
        <>
            <TopNav title="PROGRAMS" />
            <main className="px-[18px] pt-5 pb-28">

                {!showNew ? (
                    <button
                        onClick={() => setShowNew(true)}
                        className="w-full rounded-[9px] py-[11px] mb-5 text-[14px] tracking-[1.5px] cursor-pointer"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", background: "var(--acc)", border: "none", color: "#000" }}
                    >
                        + New Program
                    </button>
                ) : (
                    <div className="rounded-[12px] p-4 mb-5" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                        <Input
                            label="Program Name"
                            placeholder="e.g. 12-Week Strength Block"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newName.trim()}
                                className="flex-1 rounded-[8px] py-[10px] text-[12px] cursor-pointer"
                                style={{ fontFamily: "'DM Mono', monospace", background: "var(--acc)", border: "none", color: "#000" }}
                            >
                                {creating ? "Creating..." : "Create"}
                            </button>
                            <button
                                onClick={() => { setShowNew(false); setNewName(""); }}
                                className="flex-1 rounded-[8px] py-[10px] text-[12px] cursor-pointer"
                                style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-10 text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        Loading...
                    </div>
                )}

                {!loading && programs.length === 0 && (
                    <div className="rounded-[12px] p-[1.5rem] text-center" style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
                        <div className="text-[13px]" style={{ color: "var(--mu2)" }}>No programs yet</div>
                    </div>
                )}

                {groups.map(g => g.rows.length > 0 && (
                    <div key={g.status} className="mb-5">
                        <div className="text-[10px] tracking-[2px] uppercase mb-3"
                            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                            {STATUS_META[g.status].label}
                        </div>
                        <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                            {g.rows.map((p, i) => (
                                <Link key={p.id} href={`/programs/${p.id}`} style={{ textDecoration: "none" }}>
                                    <div className="px-4 py-3 flex items-center justify-between"
                                        style={{ borderBottom: i < g.rows.length - 1 ? "1px solid var(--br)" : "none" }}>
                                        <div>
                                            <div className="text-[14px]" style={{ color: "var(--tx)" }}>{p.name}</div>
                                            {p.description && (
                                                <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                                    {p.description}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ color: STATUS_META[p.status].color }}>→</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

            </main>
        </>
    );
}
