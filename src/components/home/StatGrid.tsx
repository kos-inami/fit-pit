interface Stat {
  value: string | number;
  label: string;
}

export default function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="grid mb-5 rounded-[12px] overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        background: "var(--s1)",
        border:     "1px solid var(--br)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="py-4 text-center"
          style={{
            borderRight: i < stats.length - 1 ? "1px solid var(--br)" : "none",
          }}
        >
          <div
            className="text-[26px] leading-none mb-[4px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
          >
            {s.value}
          </div>
          <div
            className="text-[9px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}