"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_TYPE_META, SessionType } from "@/types";

interface SearchSheetProps {
    open:    boolean;
    onClose: () => void;
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "",            label: "All"       },
    { value: "wod",         label: "WOD"       },
    { value: "strength",    label: "Strength"  },
    { value: "weightlift",  label: "WL"        },
    { value: "zone",        label: "Zone"      },
    { value: "run",         label: "Run"       },
    { value: "accessory",   label: "Accessory" },
];

export default function SearchSheet({ open, onClose }: SearchSheetProps) {
    const router = useRouter();
    const [query,       setQuery]       = useState("");
    const [selectedType, setSelectedType] = useState("");

    const handleSubmit = () => {
        if (!query.trim() && !selectedType) return;
        const params = new URLSearchParams();
        if (query.trim())  params.set("q",    query.trim());
        if (selectedType)  params.set("type", selectedType);
        router.push(`/program/search?${params.toString()}`);
        onClose();
        setQuery("");
        setSelectedType("");
    };

    const handleClose = () => {
        onClose();
        setQuery("");
        setSelectedType("");
    };

    if (!open) return null;

    return (
        <div
        className="fixed w-full inset-0 z-[80] flex items-end justify-center"
        style={{ 
            background: "rgba(0,0,0,0.6)",
            bottom: "0",
            left: "0",
        }}
        onClick={handleClose}
        >
        <div
            className="w-full max-w-[430px] rounded-t-[20px] p-[0.5rem]"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
            onClick={e => e.stopPropagation()}
        >
            {/* header */}
            <div className="flex items-center justify-between mb-[0.5rem]">
                <div className="text-[20px] tracking-[1px]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    Search Sessions
                </div>
                <button
                    onClick={handleClose}
                    style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", fontSize: 20 }}
                >
                    ×
                </button>
            </div>

            {/* text input */}
            <div className="mb-[0.5rem]">
                <div className="text-[10px] tracking-[1.5px] uppercase mb-[0.5rem]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Session Name
                </div>
                <input
                    autoFocus
                    type="text"
                    placeholder="e.g. FRAN, Back Squat, 5K..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="w-full rounded-[8px] ptest-[11px] text-[14px] outline-none"
                    style={{
                    background: "var(--s2)",
                    border:     "1px solid var(--br)",
                    color:      "var(--tx)",
                    fontFamily: "'DM Sans', sans-serif",
                    }}
                />
            </div>

            {/* type filter */}
            <div className="mb-[0.5rem]">
                <div className="text-[10px] tracking-[1.5px] uppercase mb-[0.5rem]"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    Session Type
                </div>
            <div className="flex justify-between gap-[6px]">
                {TYPE_OPTIONS.map(opt => {
                const meta    = opt.value ? SESSION_TYPE_META[opt.value as SessionType] : null;
                const active  = selectedType === opt.value;
                return (
                    <button
                    key={opt.value}
                    onClick={() => setSelectedType(opt.value)}
                    className="rounded-full w-full py-[6px] text-[11px] cursor-pointer transition-all"
                    style={{
                        fontFamily: "'DM Mono', monospace",
                        background: active
                        ? (meta?.color ?? "var(--acc)")
                        : "var(--s2)",
                        border: `1px solid ${active
                        ? (meta?.color ?? "var(--acc)")
                        : "var(--br)"}`,
                        color: active ? "#000" : "var(--mu2)",
                        fontWeight: active ? 600 : 400,
                    }}
                    >
                    {opt.label}
                    </button>
                );
                })}
            </div>
            </div>

            {/* submit */}
            <button
            onClick={handleSubmit}
            disabled={!query.trim() && !selectedType}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer mb-3"
            style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: (!query.trim() && !selectedType) ? "var(--s3)" : "var(--acc)",
                border:     "none",
                color:      (!query.trim() && !selectedType) ? "var(--mu)" : "#000",
            }}
            >
            Search
            </button>
            <button
            onClick={handleClose}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
            style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: "transparent",
                border:     "1px solid var(--br2)",
                color:      "var(--mu2)",
            }}
            >
            Cancel
            </button>
        </div>
        </div>
    );
}