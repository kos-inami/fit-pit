interface ToggleProps {
    checked:  boolean;
    onChange: (checked: boolean) => void;
    label:    string;
    sublabel?: string;
}

export default function Toggle({ checked, onChange, label, sublabel }: ToggleProps) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between py-[14px] cursor-pointer"
        >
            <div>
                <div className="text-[13px]" style={{ color: "var(--tx)" }}>{label}</div>
                {sublabel && (
                    <div className="text-[11px] mt-[2px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {sublabel}
                    </div>
                )}
            </div>
            <div
                className="rounded-full flex-shrink-0 transition-colors"
                style={{
                    width: 40, height: 24, padding: 2,
                    background: checked ? "var(--acc)" : "var(--s3)",
                    border: `1px solid ${checked ? "var(--acc)" : "var(--br2)"}`,
                }}
            >
                <div
                    className="rounded-full transition-transform"
                    style={{
                        width: 18, height: 18,
                        background: checked ? "#000" : "var(--mu2)",
                        transform: checked ? "translateX(16px)" : "translateX(0)",
                    }}
                />
            </div>
        </div>
    );
}
