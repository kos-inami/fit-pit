"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import TopNav from "@/components/ui/TopNav";

interface ClientRow {
  id:           string;
  status:       "pending" | "active" | "ended";
  startedAt:    string | null;
  endedAt:      string | null;
  createdAt:    string;
  trainee:      { id: string; name: string; email: string };
  lastActivity: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ClientsPage() {
  const { data: authSession } = useSession();
  const isTrainer = authSession?.user?.roles?.includes("trainer") ?? false;

  const [clients,  setClients]  = useState<ClientRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/trainer/clients")
      .then(r => r.json())
      .then(json => setClients(json.clients ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: "approve" | "decline") => {
    setBusyId(id);
    try {
      await fetch(`/api/trainer/relations/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      load();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  const pending = clients.filter(c => c.status === "pending");
  const active  = clients.filter(c => c.status === "active");
  const ended   = clients.filter(c => c.status === "ended");

  return (
    <>
      <TopNav title="CLIENTS" />
      <main className="px-[18px] pt-5 pb-28">

        {!isTrainer && !loading && clients.length === 0 && (
          <div className="rounded-[12px] p-[1.5rem] text-center"
            style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
            <div className="text-[13px] mb-2" style={{ color: "var(--mu2)" }}>
              You&apos;re not a trainer yet
            </div>
            <Link href="/account" style={{ textDecoration: "none" }}>
              <div className="text-[12px]" style={{ fontFamily: "'DM Mono', monospace", color: "var(--acc)" }}>
                Enable trainer mode in Account →
              </div>
            </Link>
          </div>
        )}

        {loading && (
          <div className="text-center py-10 text-[12px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Loading...
          </div>
        )}

        {pending.length > 0 && (
          <>
            <div className="text-[10px] tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Pending Requests
            </div>
            <div className="rounded-[12px] overflow-hidden mb-5"
              style={{ background: "var(--s1)", border: "1px solid var(--acc)" }}>
              {pending.map((c, i) => (
                <div key={c.id} className="px-4 py-3"
                  style={{ borderBottom: i < pending.length - 1 ? "1px solid var(--br)" : "none" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[14px]">{c.trainee.name}</div>
                      <div className="text-[11px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {c.trainee.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(c.id, "approve")}
                      disabled={busyId === c.id}
                      className="flex-1 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
                      style={{ fontFamily: "'DM Mono', monospace", background: "var(--acc)", border: "none", color: "#000" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(c.id, "decline")}
                      disabled={busyId === c.id}
                      className="flex-1 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
                      style={{ fontFamily: "'DM Mono', monospace", background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {active.length > 0 && (
          <>
            <div className="text-[10px] tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Active Clients
            </div>
            <div className="rounded-[12px] overflow-hidden mb-5"
              style={{ background: "var(--s1)", border: "1px solid var(--br)" }}>
              {active.map((c, i) => (
                <Link key={c.id} href={`/clients/${c.trainee.id}`} style={{ textDecoration: "none" }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: i < active.length - 1 ? "1px solid var(--br)" : "none" }}>
                    <div>
                      <div className="text-[14px]" style={{ color: "var(--tx)" }}>{c.trainee.name}</div>
                      <div className="text-[11px]"
                        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                        {c.lastActivity ? `Last active ${formatDate(c.lastActivity)}` : "No activity yet"}
                      </div>
                    </div>
                    <span style={{ color: "var(--mu)" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {ended.length > 0 && (
          <>
            <div className="text-[10px] tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Past Clients
            </div>
            <div className="rounded-[12px] overflow-hidden mb-5"
              style={{ background: "var(--s1)", border: "1px solid var(--br)", opacity: 0.5 }}>
              {ended.map((c, i) => (
                <div key={c.id} className="px-4 py-3"
                  style={{ borderBottom: i < ended.length - 1 ? "1px solid var(--br)" : "none" }}>
                  <div className="text-[14px]">{c.trainee.name}</div>
                  {c.endedAt && (
                    <div className="text-[11px]"
                      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
                      Ended {formatDate(c.endedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && clients.length === 0 && isTrainer && (
          <div className="rounded-[12px] p-[1.5rem] text-center"
            style={{ background: "var(--s1)", border: "1px dashed var(--br2)" }}>
            <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
              No clients yet
            </div>
            <div className="text-[11px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Share your invite code from Account to connect a trainee
            </div>
          </div>
        )}

      </main>
    </>
  );
}
