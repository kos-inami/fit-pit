"use client";

interface ConfirmDialogProps {
    open:     boolean;
    message:  string;
    onConfirm: () => void;
    onCancel:  () => void;
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div
        className="fixed inset-0 z-[90] flex items-center justify-center px-6"
        style={{ 
            background: "rgba(0,0,0,0.3)",
            width: "100%",
            height: "100vh",
            top: "0",
            left: "0",
            backdropFilter: "blur(2px)",
        }}
        onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            <div
                className="w-full max-w-[320px] p-6"
            >
                <p
                className="text-[14px] leading-relaxed mb-6 text-center color-white"
                style={{ padding: "1.25rem 0" }}
                >
                    {message}
                </p>
                <div className="flex"
                style={{ gap: "12px" }}
                >
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-[8px] py-[11px] text-[13px] tracking-[1px] cursor-pointer transition-colors"
                        style={{
                        fontFamily:  "'DM Mono', monospace",
                        background:  "transparent",
                        border:      "1px solid var(--br2)",
                        color:       "var(--tx)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded-[8px] py-[11px] text-[13px] tracking-[1px] cursor-pointer transition-colors"
                        style={{
                        fontFamily:  "'DM Mono', monospace",
                        background:  "transparent",
                        border:      "1px solid var(--red)",
                        color:       "var(--red)",
                        }}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}