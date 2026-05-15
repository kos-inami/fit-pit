interface AINoteCardProps {
  summary:  string;
  chips:    string[];
  fromDate: string;
}

export default function AINoteCard({ summary, chips, fromDate }: AINoteCardProps) {
  return (
    <div
      className="rounded-[12px] p-4 mb-5"
      style={{ background: "#001a0d", border: "1px solid #003322" }}
    >
      {/* header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
          style={{ background: "var(--grn)", animation: "pulse 2s infinite" }}
        />
        <span
          className="text-[9px] tracking-[2px] uppercase"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}
        >
          AI Coach
        </span>
        <span
          className="ml-auto text-[9px]"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
        >
          {fromDate}
        </span>
      </div>

      {/* summary */}
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#b8d4c8" }}>
        {summary}
      </p>

      {/* chips */}
      <div className="flex flex-wrap gap-[5px]">
        {chips.map((c) => (
          <span
            key={c}
            className="text-[10px] px-2 py-[3px] rounded-full"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: "#002216",
              border:     "1px solid #003322",
              color:      "var(--grn)",
            }}
          >
            {c}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
      `}</style>
    </div>
  );
}