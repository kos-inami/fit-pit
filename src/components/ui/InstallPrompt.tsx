"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt:     () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [prompt,  setPrompt]  = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-36px)] max-w-[394px] z-[60] rounded-[14px] p-4"
      style={{
        background: "var(--s1)",
        border:     "1px solid var(--br2)",
        boxShadow:  "0 8px 32px rgba(0,0,0,0.6)",
        animation:  "slideUp .3s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[22px]"
          style={{ background: "var(--acc)" }}
        >
          🏋️
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium">
            Install Fit Pit
          </div>
          <div
            className="text-[11px]"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}
          >
            Add to home screen for quick access
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", fontSize: 18 }}
        >
          ×
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setVisible(false)}
          className="flex-1 rounded-[8px] py-[9px] text-[12px] cursor-pointer"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: "transparent",
            border:     "1px solid var(--br2)",
            color:      "var(--mu2)",
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 rounded-[8px] py-[9px] text-[13px] tracking-[1.5px] cursor-pointer"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            background: "var(--acc)",
            border:     "none",
            color:      "#000",
          }}
        >
          Install
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translate(-50%, 20px); }
          to   { opacity:1; transform:translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}