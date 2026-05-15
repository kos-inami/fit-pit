"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  };

  const inputStyle = {
    background: "var(--s2)",
    border:     "1px solid var(--br)",
    color:      "var(--tx)",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      {/* logo */}
      <div
        className="text-[42px] tracking-[6px] mb-2"
        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--acc)" }}
      >
        FIT PIT
      </div>
      <div
        className="text-[11px] tracking-[3px] uppercase mb-10"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
      >
        Train. Track. Improve.
      </div>

      {/* card */}
      <div
        className="w-full max-w-[360px] rounded-[16px] p-6"
        style={{ background: "var(--s1)", border: "1px solid var(--br)" }}
      >
        <div
          className="text-[20px] tracking-[2px] mb-5"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          Sign In
        </div>

        <div className="mb-3">
          <label
            className="block text-[10px] tracking-[1.5px] uppercase mb-[7px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-[8px] px-[13px] py-[11px] text-[14px] outline-none"
            style={inputStyle}
          />
        </div>

        <div className="mb-5">
          <label
            className="block text-[10px] tracking-[1.5px] uppercase mb-[7px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            Password
          </label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="w-full rounded-[8px] px-[13px] py-[11px] text-[14px] outline-none"
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            className="rounded-[8px] px-4 py-3 mb-4 text-[13px]"
            style={{
              background: "#1a0500",
              border:     "1px solid var(--red)",
              color:      "#ff8066",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-[9px] py-[13px] text-[17px] tracking-[2px] cursor-pointer"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            background: loading ? "var(--s3)" : "var(--acc)",
            border:     "none",
            color:      loading ? "var(--mu)" : "#000",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>

      <div
        className="mt-8 text-[10px] tracking-[1px]"
        style={{ fontFamily: "'DM Mono', monospace", color: "var(--br2)" }}
      >
        FIT PIT v0.1 · PHASE 1
      </div>
    </div>
  );
}