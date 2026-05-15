"use client";

import Link from "next/link";
import TopNav from "@/components/ui/TopNav";
import WeekStrip, { WeekDayData, WeekDayState } from "@/components/home/WeekStrip";
import TypeChip from "@/components/session/TypeChip";
import { useProgram } from "@/contexts/ProgramContext";
import { SESSION_TYPE_META } from "@/types";

const TODAY_STR   = new Date().toISOString().split("T")[0];
const DAY_LETTERS = ["M","T","W","T","F","S","S"];
const FEEL_COLOR  = ["#5cb8ff","#e8ff3c","#3cffa0","#ff9055","#ff4c2b"];
const FEEL_LABEL  = ["Spent","Okay","Good","Pumped","Beast"];

function getThisWeekDates(): string[] {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function isSessionComplete(s: { sets: unknown[]; rounds: unknown[]; resultRounds: unknown[]; result: string | null; type: string }) {
  const meta = SESSION_TYPE_META[s.type as keyof typeof SESSION_TYPE_META];
  if (meta.useSets) return s.sets.length > 0;
  if (s.type === "wod" || s.type === "zone") return (s.resultRounds as unknown[]).length > 0;
  return s.result !== null;
}

export default function HomePage() {
  const { getDay, days } = useProgram();

  const weekDates  = getThisWeekDates();
  const todayDay   = getDay(TODAY_STR);
  const sessions   = todayDay.sessions;
  const lastAI     = todayDay.aiSuggestion;
  const dayComplete = todayDay.recovery !== null;

  const weekDayData: WeekDayData[] = weekDates.map((date, i) => {
    const d          = getDay(date);
    const isToday    = date === TODAY_STR;
    const isPast     = date < TODAY_STR;
    const isFuture   = date > TODAY_STR;
    const hasSessions = d.sessions.length > 0;
    const allDone    = hasSessions && d.sessions.every(
      s => isSessionComplete(s as Parameters<typeof isSessionComplete>[0])
    );
    const anyDone    = hasSessions && d.sessions.some(
      s => isSessionComplete(s as Parameters<typeof isSessionComplete>[0])
    );

    let state: WeekDayState = "empty";

    if (isToday) {
      state = "today";
    } else if (isPast && hasSessions && allDone) {
      state = "done";
    } else if (isPast && hasSessions && !allDone) {
      state = "incomplete";
    } else if (isFuture && hasSessions) {
      state = "upcoming";
    }

    return { label: DAY_LETTERS[i], state, date };
  });

  const allDays       = Object.values(days);
  const totalSessions = allDays.reduce((a, d) => a + d.sessions.length, 0);
  const completed     = allDays.reduce((a, d) => a + d.sessions.filter(s => isSessionComplete(s as Parameters<typeof isSessionComplete>[0])).length, 0);

  const recentDays = Object.values(days)
    .filter(d => d.date < TODAY_STR && d.sessions.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  const todayLabel = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "short",
  });

  return (
    <>
      <TopNav
        title="FIT PIT"
        // right={
        //   <span className="text-[10px] px-[9px] py-[3px] rounded-full"
        //     style={{ fontFamily: "'DM Mono', monospace", background: "var(--red)", color: "#fff" }}>
        //     🔥 6 DAY STREAK
        //   </span>
        // }
      />

      <main className="px-[18px] pt-5 pb-28">

        <WeekStrip days={weekDayData} />

        {/* stats
        <div className="grid grid-cols-2 gap-[8px] mb-5">
          {[[totalSessions,"Sessions"],[completed,"Completed"]].map(([v,l]) => (
            <div key={String(l)} className="rounded-[10px] py-4 text-center"
              style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
              <div className="text-[28px] leading-none mb-[4px]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}>{v}</div>
              <div className="text-[9px] tracking-[1.5px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>{l}</div>
            </div>
          ))}
        </div> */}

        {/* today */}
        <div className="flex items-center justify-center"
          style={{
            padding: "1rem 0",
          }}
        >
          <div className="text-sm tracking-[2px] uppercase"
            style={{ 
              fontFamily: "'DM Mono', monospace",
              color: "white",
            }}>
            Today · {todayLabel}
          </div>
        </div>

        {sessions.length === 0 ? (
          <Link href="/program" 
          style={{
            textDecoration: "none",
          }}>
            <div className="rounded-[12px] p-[1rem] mb-[1rem] text-center cursor-pointer"
              style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
              <div className="text-[14px] mb-1 p-[0.5rem]" style={{ color: "var(--mu)" }}>
                Nothing planned yet
              </div>
              <div className="text-[14px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                Tap to plan today&apos;s workout →
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[12px] mb-5 overflow-hidden"
            style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
            {sessions.map((s, i) => {
              const meta = SESSION_TYPE_META[s.type];
              const done = isSessionComplete(s as Parameters<typeof isSessionComplete>[0]);
              return (
                <div key={s.id}
                  className="flex items-center justify-between px-4 py-[12px]"
                  style={{
                    padding: ".5rem",
                    borderBottom: i < sessions.length - 1 ? "1px solid var(--br)" : "none",
                    background:   `linear-gradient(90deg, ${meta.color}08 0%, transparent 100%)`,
                  }}>
                  <div className="py-[0.5rem] min-w-0">
                    <TypeChip type={s.type} />
                    <div className="text-[18px] tracking-[0.5px] truncate px-[0.5rem] mt-[1rem]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      {s.name}
                    </div>
                  </div>
                  {done ? (
                    <span className="text-[12px] flex-shrink-0 ml-2"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                      ✓ Done
                    </span>
                  ) : (
                    <span className="text-[12px] px-2 py-[3px] rounded-full flex-shrink-0 ml-2"
                      style={{ fontFamily: "'DM Mono', monospace", background: "#1a0800", color: "#ff9055", border: "1px solid #331500" }}>
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
            <Link href="/program" style={{
              textDecoration: "none",
              fontWeight: "bold",
            }}>
              <div className="p-[1.25rem] text-center text-[14px] tracking-[1px] cursor-pointer"
                style={{ 
                  fontFamily: "'DM Mono', monospace", 
                  color: "var(--tx)", 
                  borderTop: "1px solid var(--br)", 
                  background: "var(--org)",
                  }}>
                {dayComplete ? "View in Program →" : "Log Results in Program →"}
              </div>
            </Link>
          </div>
        )}

        {/* last AI note */}
        {lastAI && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[2px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                AI Coach Note
              </div>
            </div>
            <div className="rounded-[12px] p-4 mb-5"
              style={{ background: "#001a0d", border: "1px solid #003322" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{ background: "var(--grn)", animation: "pulse 2s infinite" }} />
                <span className="text-[9px] tracking-[2px] uppercase"
                  style={{ fontFamily: "'DM Mono', monospace", color: "var(--grn)" }}>
                  AI Coach · Today
                </span>
              </div>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#b8d4c8" }}>
                {lastAI.summary}
              </p>
              <div className="flex flex-wrap gap-[5px]">
                {lastAI.chips.map(c => (
                  <span key={c} className="text-[10px] px-2 py-[3px] rounded-full"
                    style={{ fontFamily: "'DM Mono', monospace", background: "#002216", border: "1px solid #003322", color: "var(--grn)" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* recent days
        {recentDays.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[2px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                Recent
              </div>
              <Link href="/program"
                className="text-[10px] tracking-[1px] uppercase"
                style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                See All →
              </Link>
            </div>
            {recentDays.map(d => (
              <div key={d.date} className="rounded-[12px] mb-3 overflow-hidden"
                style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
                <div className="flex items-center justify-between px-4 py-2"
                  style={{ borderBottom: "1px solid var(--br)" }}>
                  <span className="text-[10px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                    {new Date(d.date + "T00:00:00").toLocaleDateString("en-AU", {
                      weekday: "short", day: "numeric", month: "short",
                    })}
                  </span>
                  {d.recovery && (
                    <div className="flex items-center gap-2">
                      <span className="w-[6px] h-[6px] rounded-full"
                        style={{ background: FEEL_COLOR[d.recovery.energy] }} />
                      <span className="text-[10px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {FEEL_LABEL[d.recovery.energy]}
                      </span>
                    </div>
                  )}
                </div>
                {d.sessions.map((s, i) => {
                  const meta = SESSION_TYPE_META[s.type];
                  return (
                    <div key={s.id}
                      className="flex items-center justify-between px-4 py-[10px]"
                      style={{ borderBottom: i < d.sessions.length - 1 ? "1px solid var(--br)" : "none" }}>
                      <div className="flex items-center gap-2">
                        <TypeChip type={s.type} />
                        <span className="text-[14px] tracking-[0.5px]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                          {s.name}
                        </span>
                      </div>
                      <span className="text-[12px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: meta.color }}>
                        {s.result ?? (s.sets.length > 0 ? `${s.sets.length} sets` : s.resultRounds?.length > 0 ? `${s.resultRounds.length} rounds` : "—")}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )} */}

      </main>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
      `}</style>
    </>
  );
}