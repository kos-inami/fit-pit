"use client";

import Link from "next/link";
import TopNav from "@/components/ui/TopNav";

const CARDS = [
    {
        href:  "/clients",
        title: "Clients",
        desc:  "Approve requests, view client calendars, records and progress",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="22" height="22">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
        ),
    },
    {
        href:  "/programs",
        title: "Programs",
        desc:  "Build, publish, assign and manage training programs",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="22" height="22">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8"  y1="2" x2="8"  y2="6" />
                <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
        ),
    },
    {
        href:  "/library",
        title: "Library",
        desc:  "Reusable session templates, grouped by type",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="22" height="22">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
        ),
    },
];

export default function TrainerHubPage() {
    return (
        <>
            <TopNav title="TRAINER" />
            <main className="px-[18px] pt-5 pb-28">
                {CARDS.map(card => (
                    <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
                        <div className="rounded-[12px] p-4 mb-4 flex items-center gap-4"
                            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: "var(--s2)", color: "var(--acc)" }}>
                                {card.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[16px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{card.title}</div>
                                <div className="text-[11px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                                    {card.desc}
                                </div>
                            </div>
                            <span style={{ color: "var(--mu)" }}>→</span>
                        </div>
                    </Link>
                ))}
            </main>
        </>
    );
}
