"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getTodayString } from "@/lib/utils";

const STATIC_TABS = [
  {
    href:      "/home",
    label:     "Home",
    programTab: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href:       "/program",
    label:      "Program",
    programTab: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href:       "/records",
    label:      "Performance",
    programTab: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href:       "/account",
    label:      "Account",
    programTab: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        bottom:     "0",
        background: "var(--s1)",
        borderTop:  "1px solid var(--br)",
        padding:    ".5rem 0",
      }}
    >
      <div className="flex">
        {STATIC_TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);

          if (tab.programTab) {
            return (
              <button
                key={tab.href}
                onClick={() => router.push(`/program?date=${getTodayString()}`)}
                className="flex-1 flex flex-col items-center py-[0.5rem] pb-[1rem] text-[10px] font-medium tracking-[0.8px] uppercase transition-colors no-tap-highlight cursor-pointer"
                style={{
                  color:          active ? "var(--acc)" : "var(--mu)",
                  fontFamily:     "'DM Sans', sans-serif",
                  textDecoration: "none",
                  gap:            "0.25rem",
                  background:     "none",
                  border:         "none",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center py-[0.5rem] pb-[1rem] text-[10px] font-medium tracking-[0.8px] uppercase transition-colors no-tap-highlight"
              style={{
                color:          active ? "var(--acc)" : "var(--mu)",
                fontFamily:     "'DM Sans', sans-serif",
                textDecoration: "none",
                gap:            "0.25rem",
              }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}