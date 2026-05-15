export type WeekDayState = "done" | "today" | "upcoming" | "empty" | "incomplete";

export interface WeekDayData {
    label: string;
    state: WeekDayState;
    date:  string;
}

export default function WeekStrip({ days }: { days: WeekDayData[] }) {

    const style = (state: WeekDayState) => {
        switch (state) {
        case "done":
            return {
            background: "var(--acc)",
            border:     "1px solid var(--acc)",
            color:      "#000",
            };
        case "today":
            return {
            background: "var(--red)",
            border:     "1px solid var(--red)",
            color:      "#fff",
            };
        case "upcoming":
            return {
            background: "transparent",
            border:     "1px solid var(--acc)",
            color:      "var(--acc)",
            };
        case "incomplete":
            return {
            background: "#1a0500",
            border:     "1px solid var(--br2)",
            color:      "var(--mu)",
            };
        case "empty":
        default:
            return {
            background: "var(--s2)",
            border:     "1px solid var(--br2)",
            color:      "var(--mu)",
            };
        }
    };

    const dot = (state: WeekDayState) => {
        switch (state) {
        case "done":       return "rgba(0,0,0,0.4)";
        case "today":      return "rgba(255,255,255,0.5)";
        case "upcoming":   return "var(--acc)";
        case "incomplete": return "var(--red)";
        default:           return "transparent";
        }
    };

    return (
        <div className="flex gap-[5px] mb-5">
        {days.map((d, i) => {
            const s = style(d.state);
            return (
            <div
                key={i}
                className="flex-1 aspect-square rounded-[8px] flex flex-col items-center justify-center gap-[3px]"
                style={{
                fontFamily:    "'DM Mono', monospace",
                fontSize:      "10px",
                textTransform: "uppercase",
                fontWeight:    d.state === "done" ? 600 : 400,
                ...s,
                }}
            >
                {d.label}
                {d.state !== "empty" && (
                <div style={{
                    width:        4,
                    height:       4,
                    borderRadius: "50%",
                    background:   dot(d.state),
                }} />
                )}
            </div>
            );
        })}
        </div>
    );
}