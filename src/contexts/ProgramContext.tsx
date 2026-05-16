"use client";

import {
  createContext, useContext, useState,
  useEffect, useRef, useCallback, ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { SessionType, SetLog, RoundEntry, RecoveryLog } from "@/types";
import { getLocalDateString } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────
export interface ProgSession {
  id:           string;
  type:         SessionType;
  name:         string;
  desc:         string;
  planSets:     SetLog[];     // planning targets
  sets:         SetLog[];     // result sets (actual)
  rounds:       RoundEntry[]; // planning rounds
  resultRounds: RoundEntry[]; // result rounds (actual)
  result:       string | null;
  notes:        string | null;
  aiNote:       string | null;
  aiLoading:    boolean;
}

export interface AIResult {
  summary:      string;
  perSession:   Record<string, string>;
  chips:        string[];
  recoveryNote: string;
}

export interface ProgDay {
  id:           string | null;
  date:         string;
  sessions:     ProgSession[];
  aiSuggestion: AIResult | null;
  recovery:     RecoveryLog | null;
}

interface ProgramContextType {
  days:          Record<string, ProgDay>;
  getDay:        (date: string) => ProgDay;
  addSession:    (date: string, s: Omit<ProgSession, "id" | "aiLoading" | "aiNote">) => Promise<void>;
  editSession:   (date: string, id: string, data: Partial<Pick<ProgSession, "name" | "desc" | "rounds" | "planSets">>) => Promise<void>;
  removeSession: (date: string, id: string) => Promise<void>;
  saveResult:    (date: string, id: string, data: Partial<Pick<ProgSession, "result" | "notes" | "sets" | "resultRounds">>) => Promise<void>;
  setAINote:     (date: string, id: string, note: string) => void;
  setAILoading:  (date: string, id: string, loading: boolean) => void;
  setDayAI:      (date: string, ai: AIResult) => void;
  saveRecovery:  (date: string, rec: RecoveryLog) => Promise<void>;
  deleteRecovery: (date: string) => Promise<void>;
}

const ProgramContext = createContext<ProgramContextType | null>(null);

// ─── helpers ─────────────────────────────────────────────────
function getWeekAndRecentDates(): string[] {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return getLocalDateString(d);
  });

  const past = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() - i - 1);
    return getLocalDateString(d);
  });

  return [...new Set([...week, ...past])];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDay(dbDay: any): ProgDay {
  return {
    id:   dbDay.id,
    date: dbDay.date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessions: (dbDay.sessions ?? []).map((s: any) => ({
      id:           s.id,
      type:         s.type as SessionType,
      name:         s.name,
      desc:         s.desc         ?? "",
      planSets:     s.planSets     ? JSON.parse(s.planSets)     : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sets:         (s.sets ?? []).map((set: any) => ({
        id:        set.id,
        setNumber: set.setNumber,
        weight:    set.weight,
        reps:      set.reps,
        notes:     set.notes ?? "",
      })),
      rounds:       s.rounds       ? JSON.parse(s.rounds)       : [],
      resultRounds: s.resultRounds ? JSON.parse(s.resultRounds) : [],
      result:       s.result       ?? null,
      notes:        s.notes        ?? null,
      aiNote:       null,
      aiLoading:    false,
    })),
    aiSuggestion: dbDay.aiSuggestion ? {
      summary:      dbDay.aiSuggestion.summary,
      perSession:   JSON.parse(dbDay.aiSuggestion.perSession ?? "{}"),
      chips:        JSON.parse(dbDay.aiSuggestion.chips      ?? "[]"),
      recoveryNote: dbDay.aiSuggestion.recoveryNote          ?? "",
    } : null,
    recovery: dbDay.recovery ? {
      energy:       dbDay.recovery.energy,
      sore:         JSON.parse(dbDay.recovery.sore ?? "[]"),
      soreOther:    dbDay.recovery.soreOther    ?? "",
      sleepHours:   dbDay.recovery.sleepHours   ?? null,
      sleepQuality: dbDay.recovery.sleepQuality ?? null,
      notes:        dbDay.recovery.notes        ?? "",
    } : null,
  };
}

// ─── provider ────────────────────────────────────────────────
export function ProgramProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [days, setDays] = useState<Record<string, ProgDay>>({});
  const loadedRef       = useRef<Set<string>>(new Set());

  const updateDay = useCallback((date: string, updater: (d: ProgDay) => ProgDay) => {
    setDays(prev => ({
      ...prev,
      [date]: updater(
        prev[date] ?? { id: null, date, sessions: [], aiSuggestion: null, recovery: null }
      ),
    }));
  }, []);

  const loadDate = useCallback(async (date: string) => {
    if (!userId || loadedRef.current.has(date)) return;
    loadedRef.current.add(date);
    try {
      const res  = await fetch(`/api/sessions?userId=${userId}&date=${date}`);
      const json = await res.json();
      if (json.day) {
        setDays(prev => ({ ...prev, [date]: transformDay(json.day) }));
      } else {
        setDays(prev => ({
          ...prev,
          [date]: prev[date] ?? { id: null, date, sessions: [], aiSuggestion: null, recovery: null },
        }));
      }
    } catch { /* keep existing */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    getWeekAndRecentDates().forEach(loadDate);
  }, [userId, loadDate]);

  const getDay = useCallback((date: string): ProgDay => {
    if (userId && !loadedRef.current.has(date)) loadDate(date);
    return days[date] ?? { id: null, date, sessions: [], aiSuggestion: null, recovery: null };
  }, [days, userId, loadDate]);

  const ensureDayId = useCallback(async (date: string): Promise<string | null> => {
    if (!userId) return null;
    if (days[date]?.id) return days[date].id;
    const res  = await fetch(`/api/sessions?userId=${userId}&date=${date}`);
    const json = await res.json();
    if (json.day?.id) {
      updateDay(date, d => ({ ...d, id: json.day.id }));
      return json.day.id;
    }
    return null;
  }, [userId, days, updateDay]);

  // ── addSession ───────────────────────────────────────────
  const addSession = useCallback(async (
    date: string,
    s: Omit<ProgSession, "id" | "aiLoading" | "aiNote">
  ) => {
    if (!userId) return;
    const tempId = `temp_${crypto.randomUUID()}`;

    updateDay(date, d => ({
      ...d,
      sessions: [...d.sessions, { ...s, id: tempId, aiNote: null, aiLoading: false }],
    }));

    try {
      const res  = await fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId, date,
          type:  s.type, name: s.name, desc: s.desc,
          order: days[date]?.sessions.length ?? 0,
        }),
      });
      const json = await res.json();
      if (!json.session) throw new Error("No session returned");
      const realId = json.session.id;

      // save planSets as JSON
      if (s.planSets.length > 0) {
        await fetch("/api/sessions", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId: realId, planSets: JSON.stringify(s.planSets) }),
        });
      }

      // save planning rounds as JSON
      if (s.rounds.length > 0) {
        await fetch(`/api/sessions/${realId}/result`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ rounds: JSON.stringify(s.rounds) }),
        });
      }

      updateDay(date, d => ({
        ...d,
        sessions: d.sessions.map(sess =>
          sess.id === tempId ? { ...sess, id: realId } : sess
        ),
      }));
    } catch {
      updateDay(date, d => ({
        ...d,
        sessions: d.sessions.filter(sess => sess.id !== tempId),
      }));
    }
  }, [userId, days, updateDay]);

  // ── editSession ──────────────────────────────────────────
  const editSession = useCallback(async (
    date: string,
    id:   string,
    data: Partial<Pick<ProgSession, "name" | "desc" | "rounds" | "planSets">>
  ) => {
    updateDay(date, d => ({
      ...d,
      sessions: d.sessions.map(s => s.id === id ? { ...s, ...data } : s),
    }));
    try {
      await fetch("/api/sessions", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId: id,
          name:      data.name,
          desc:      data.desc,
          rounds:    data.rounds   !== undefined ? JSON.stringify(data.rounds)   : undefined,
          planSets:  data.planSets !== undefined ? JSON.stringify(data.planSets) : undefined,
        }),
      });
    } catch { console.error("Failed to update session"); }
  }, [updateDay]);

  // ── removeSession ────────────────────────────────────────
  const removeSession = useCallback(async (date: string, id: string) => {
    updateDay(date, d => ({ ...d, sessions: d.sessions.filter(s => s.id !== id) }));
    try {
      await fetch(`/api/sessions?sessionId=${id}`, { method: "DELETE" });
    } catch {
      loadedRef.current.delete(date);
      await loadDate(date);
    }
  }, [updateDay, loadDate]);

  // ── saveResult ───────────────────────────────────────────
  const saveResult = useCallback(async (
    date: string,
    id:   string,
    data: Partial<Pick<ProgSession, "result" | "notes" | "sets" | "resultRounds">>
  ) => {
    updateDay(date, d => ({
      ...d,
      sessions: d.sessions.map(s => s.id === id ? { ...s, ...data } : s),
    }));
    try {
      if (data.sets !== undefined) {
        // save result sets to Set relation
        await fetch(`/api/sessions/${id}/sets`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sets: data.sets }),
        });
        if (data.notes !== undefined) {
          await fetch(`/api/sessions/${id}/result`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ notes: data.notes }),
          });
        }
      } else {
        await fetch(`/api/sessions/${id}/result`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            result:       data.result,
            notes:        data.notes,
            resultRounds: data.resultRounds !== undefined
              ? JSON.stringify(data.resultRounds) : undefined,
          }),
        });
      }
    } catch { console.error("Failed to save result"); }
  }, [updateDay]);

  // ── AI ───────────────────────────────────────────────────
  const setAINote = useCallback((date: string, id: string, note: string) => {
    updateDay(date, d => ({
      ...d,
      sessions: d.sessions.map(s =>
        s.id === id ? { ...s, aiNote: note, aiLoading: false } : s
      ),
    }));
  }, [updateDay]);

  const setAILoading = useCallback((date: string, id: string, loading: boolean) => {
    updateDay(date, d => ({
      ...d,
      sessions: d.sessions.map(s =>
        s.id === id ? { ...s, aiLoading: loading } : s
      ),
    }));
  }, [updateDay]);

  const setDayAI = useCallback((date: string, ai: AIResult) => {
    updateDay(date, d => ({ ...d, aiSuggestion: ai }));
  }, [updateDay]);

  // ── saveRecovery ─────────────────────────────────────────
  const saveRecovery = useCallback(async (date: string, rec: RecoveryLog) => {
    updateDay(date, d => ({ ...d, recovery: rec }));
    try {
      const dayId = await ensureDayId(date);
      if (!dayId) return;
      await fetch("/api/recovery", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          dayId,
          energy:       rec.energy,
          sore:         JSON.stringify(rec.sore),
          soreOther:    rec.soreOther    ?? "",
          sleepHours:   rec.sleepHours   ?? null,
          sleepQuality: rec.sleepQuality ?? null,
          notes:        rec.notes        ?? "",
        }),
      });
    } catch {
      console.error("Failed to save recovery");
    }
  }, [updateDay, ensureDayId]);

  // -- delete Recovery ---
  const deleteRecovery = useCallback(async (date: string) => {
    const dayId = days[date]?.id;
    updateDay(date, d => ({ ...d, recovery: null }));
    if (!dayId) return;
    try {
      await fetch(`/api/recovery?dayId=${dayId}`, { method: "DELETE" });
    } catch {
      console.error("Failed to delete recovery");
    }
  }, [days, updateDay]);

  return (
    <ProgramContext.Provider value={{
      days, getDay,
      addSession, editSession, removeSession,
      saveResult, setAINote, setAILoading,
      setDayAI, saveRecovery, deleteRecovery,
    }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("useProgram must be used within ProgramProvider");
  return ctx;
}