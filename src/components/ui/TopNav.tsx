export default function TopNav({
  title,
  right,
  left,
}: {
  title?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-[18px] py-[13px] mb-[1rem]"
      style={{
        background: "rgba(8,8,8,0.93)",
        borderBottom: "1px solid var(--br)",
        backdropFilter: "blur(14px)",
      }}
    >
      {left && <div>{left}</div>}
      <span
        className="font-display text-[20px] tracking-[4px]"
        style={{ color: "var(--acc)", fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {title ?? "FIT PIT"}
      </span>
      {right && <div>{right}</div>}
    </header>
  );
}