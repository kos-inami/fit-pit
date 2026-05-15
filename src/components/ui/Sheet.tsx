"use client";

import { useEffect } from "react";

interface SheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    }

export default function Sheet({ open, onClose, title, children }: SheetProps) {
    // prevent body scroll when open
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return (
        <div
        className="fixed inset-[0] flex items-end "
        style={{ background: "rgba(0,0,0,0.8)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        >
        <div
            className="w-full max-w-[460px] mx-auto rounded-t-[20px] overflow-y-auto"
            style={{
            background: "var(--s1)",
            borderTop: "1px solid var(--br)",
            maxHeight: "80vh",
            padding: "22px 18px 100px",
            animation: "slideUp .25s cubic-bezier(.16,1,.3,1)",
            }}
        >
            {/* handle */}
            <div className="w-9 h-[3px] rounded-full mx-auto mb-5"
            style={{ background: "var(--br2)" }} />

            {title && (
            <h2 className="mb-4 text-[24px] tracking-[2px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {title}
            </h2>
            )}

            {children}
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