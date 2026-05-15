"use client";

import { useState } from "react";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? "fitpit-admin";

export default function AdminPage() {
  const [adminKey,  setAdminKey]  = useState("");
  const [authed,    setAuthed]    = useState(false);
  const [authError, setAuthError] = useState(false);

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const handleAuth = () => {
    if (adminKey === ADMIN_KEY) { setAuthed(true); setAuthError(false); }
    else setAuthError(true);
  };

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error);
    } else {
      setSuccess(`Account created for ${json.user.email}`);
      setName(""); setEmail(""); setPassword("");
    }

    setLoading(false);
  };

  const inputStyle = {
    background: "var(--s2)",
    border:     "1px solid var(--br)",
    color:      "var(--tx)",
    fontFamily: "'DM Sans', sans-serif",
  };

  // ── admin key gate ─────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="text-[28px] tracking-[4px] mb-8"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
        >
          ADMIN ACCESS
        </div>
        <div
          className="w-full max-w-[360px] rounded-[16px] p-6"
          style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
        >
          <label
            className="block text-[10px] tracking-[1.5px] uppercase mb-[7px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            Admin Key
          </label>
          <input
            type="password"
            placeholder="Enter admin key"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
            className="w-full rounded-[8px] px-[13px] py-[11px] text-[14px] outline-none mb-4"
            style={inputStyle}
          />
          {authError && (
            <div
              className="rounded-[8px] px-4 py-3 mb-4 text-[13px]"
              style={{ background: "#1a0500", border: "1px solid var(--red)", color: "#ff8066" }}
            >
              Invalid admin key
            </div>
          )}
          <button
            onClick={handleAuth}
            className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              background: "var(--acc)",
              border:     "none",
              color:      "#000",
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  // ── create account form ────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="text-[28px] tracking-[4px] mb-2"
        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
      >
        CREATE ACCOUNT
      </div>
      <div
        className="text-[11px] tracking-[2px] uppercase mb-8"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
      >
        Admin · Fit Pit
      </div>

      <div
        className="w-full max-w-[360px] rounded-[16px] p-6"
        style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
      >
        {[
          { label: "Name",     type: "text",     val: name,     set: setName,     ph: "Full name"         },
          { label: "Email",    type: "email",     val: email,    set: setEmail,    ph: "email@example.com" },
          { label: "Password", type: "password",  val: password, set: setPassword, ph: "Min. 6 characters" },
        ].map(f => (
          <div key={f.label} className="mb-4">
            <label
              className="block text-[10px] tracking-[1.5px] uppercase mb-[7px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
            >
              {f.label}
            </label>
            <input
              type={f.type}
              placeholder={f.ph}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="w-full rounded-[8px] px-[13px] py-[11px] text-[14px] outline-none"
              style={inputStyle}
            />
          </div>
        ))}

        {error && (
          <div
            className="rounded-[8px] px-4 py-3 mb-4 text-[13px]"
            style={{ background: "#1a0500", border: "1px solid var(--red)", color: "#ff8066" }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="rounded-[8px] px-4 py-3 mb-4 text-[13px]"
            style={{ background: "#001a0d", border: "1px solid var(--grn)", color: "var(--grn)" }}
          >
            ✓ {success}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !name || !email || !password}
          className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            background: loading || !name || !email || !password ? "var(--s3)" : "var(--acc)",
            border:     "none",
            color:      loading || !name || !email || !password ? "var(--mu)" : "#000",
          }}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </div>
  );
}