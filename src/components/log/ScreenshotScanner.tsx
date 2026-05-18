"use client";

import { useState, useCallback, useRef } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { SessionType } from "@/types";

interface ScannedData {
  name: string;
  desc: string;
  type: SessionType;
}

interface Props {
  onFill:  (data: ScannedData) => void;
  onClose: () => void;
}

// ─── helpers ─────────────────────────────────────────────────
async function cropImage(imgEl: HTMLImageElement, px: PixelCrop): Promise<string> {
  const canvas = document.createElement("canvas");
  const scaleX  = imgEl.naturalWidth  / imgEl.width;
  const scaleY  = imgEl.naturalHeight / imgEl.height;
  canvas.width  = px.width  * scaleX;
  canvas.height = px.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    imgEl,
    px.x * scaleX, px.y * scaleY,
    px.width * scaleX, px.height * scaleY,
    0, 0,
    canvas.width, canvas.height
  );
  return canvas.toDataURL("image/jpeg", 0.95);
}

function parseText(raw: string): ScannedData {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { name: "", desc: "", type: "wod" };

  const name  = lines[0].toUpperCase();
  const desc  = lines.slice(1).join("\n").trim();
  const upper = raw.toUpperCase();

  let type: SessionType = "wod";
  if (/\bSQUAT\b|\bDEADLIFT\b|\bBENCH\b|\bPRESS\b|\bROW\b/.test(upper))  type = "strength";
  if (/\bSNATCH\b|\bCLEAN\b|\bJERK\b|\bC&J\b/.test(upper))                type = "weightlift";
  if (/\bRUN\b|\bKM\b|\bMILE\b|\b5K\b|\b10K\b/.test(upper))                type = "run";
  if (/\bEMOM\b|\bAMRAP\b|\bZONE\b/.test(upper))                           type = "zone";

  return { name, desc, type };
}

// ────────────────────────────────────────────────────────────
type Step = "idle" | "crop" | "scanning" | "result" | "error";

export default function ScreenshotScanner({ onFill, onClose }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const imgRef   = useRef<HTMLImageElement>(null);

  const [step,          setStep]          = useState<Step>("idle");
  const [imageSrc,      setImageSrc]      = useState("");
  const [crop,          setCrop]          = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rawText,       setRawText]       = useState("");
  const [parsed,        setParsed]        = useState<ScannedData | null>(null);
  const [error,         setError]         = useState("");

  // ── file select ──────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop(undefined);
      setStep("crop");
    };
    reader.readAsDataURL(file);
  };

  // set default crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height),
      width, height
    );
    setCrop(initialCrop);
  }, []);

  // ── scan ─────────────────────────────────────────────────
  const handleScan = async () => {
    if (!completedCrop || !imgRef.current) return;
    setStep("scanning");
    try {
      const cropped = await cropImage(imgRef.current, completedCrop);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: () => {} });
      const { data: { text } } = await worker.recognize(cropped);
      await worker.terminate();
      setRawText(text);
      setParsed(parseText(text));
      setStep("result");
    } catch (err) {
      console.error(err);
      setError("Could not read the image. Try a clearer crop.");
      setStep("error");
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onFill(parsed);
    onClose();
  };

  const btnBase: React.CSSProperties = {
    fontFamily:    "'Bebas Neue', sans-serif",
    fontSize:      16,
    letterSpacing: "1.5px",
    cursor:        "pointer",
    border:        "none",
    width:         "100%",
    borderRadius:  9,
    padding:       "12px 0",
  };

  // ── render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* idle */}
      {step === "idle" && (
        <>
          <div className="rounded-[10px] py-8 text-center"
            style={{ background: "var(--s2)", border: "1px dashed var(--br2)" }}>
            <div className="text-[28px] mb-2">📸</div>
            <div className="text-[13px] mb-1" style={{ color: "var(--mu2)" }}>
              Select a screenshot
            </div>
            <div className="text-[11px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              Processed locally — nothing uploaded
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            style={{ ...btnBase, background: "var(--acc)", color: "#000" }}>
            Choose Screenshot
          </button>
          <button onClick={onClose}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
            Cancel
          </button>
        </>
      )}

      {/* crop */}
      {step === "crop" && (
        <>
          <div className="text-[11px] text-center"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Drag corners &amp; edges to resize crop area
          </div>

          <div className="rounded-[10px] overflow-hidden"
            style={{ background: "#000", maxHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              style={{ maxHeight: 400 }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Screenshot"
                onLoad={onImageLoad}
                style={{ maxHeight: 400, maxWidth: "100%", display: "block" }}
              />
            </ReactCrop>
          </div>

          <div className="text-[10px] text-center"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Pinch or scroll to zoom · Drag blue handles to resize
          </div>

          <button onClick={handleScan} disabled={!completedCrop}
            style={{
              ...btnBase,
              background: !completedCrop ? "var(--s3)" : "var(--acc)",
              color:      !completedCrop ? "var(--mu)" : "#000",
            }}>
            Scan Text
          </button>
          <button onClick={() => setStep("idle")}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
            Back
          </button>
        </>
      )}

      {/* scanning */}
      {step === "scanning" && (
        <div className="py-12 text-center">
          <div className="text-[28px] mb-3"
            style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>
            🔍
          </div>
          <div className="text-[13px]" style={{ color: "var(--mu2)" }}>Reading text...</div>
          <div className="text-[11px] mt-1"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Processing locally
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* result */}
      {step === "result" && parsed && (
        <>
          <div className="text-[10px] tracking-[2px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
            Detected — edit if needed
          </div>

          <div>
            <div className="text-[10px] tracking-[1.5px] uppercase mb-1"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Name</div>
            <input
              value={parsed.name}
              onChange={e => setParsed(p => p ? { ...p, name: e.target.value } : p)}
              className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
              style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Mono', monospace" }}
            />
          </div>

          <div>
            <div className="text-[10px] tracking-[1.5px] uppercase mb-1"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Session Type</div>
            <select
              value={parsed.type}
              onChange={e => setParsed(p => p ? { ...p, type: e.target.value as SessionType } : p)}
              className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
              style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", cursor: "pointer" }}
            >
              {(["wod","strength","weightlift","zone","run","accessory"] as SessionType[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[10px] tracking-[1.5px] uppercase mb-1"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>Description</div>
            <textarea
              rows={4}
              value={parsed.desc}
              onChange={e => setParsed(p => p ? { ...p, desc: e.target.value } : p)}
              className="w-full rounded-[8px] px-3 py-[10px] text-[12px] outline-none resize-none"
              style={{ background: "var(--s2)", border: "1px solid var(--br)", color: "var(--tx)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

          <details className="text-[11px]" style={{ color: "var(--mu)" }}>
            <summary className="cursor-pointer"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Raw extracted text
            </summary>
            <pre className="mt-2 text-[10px] whitespace-pre-wrap rounded-[8px] p-3 leading-relaxed"
              style={{ background: "var(--s2)", color: "var(--mu2)" }}>
              {rawText}
            </pre>
          </details>

          <button onClick={handleConfirm}
            style={{ ...btnBase, background: "var(--acc)", color: "#000" }}>
            Fill Session
          </button>
          <button onClick={() => setStep("crop")}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--br2)", color: "var(--mu2)" }}>
            Re-scan
          </button>
        </>
      )}

      {/* error */}
      {step === "error" && (
        <>
          <div className="rounded-[10px] p-4 text-center"
            style={{ background: "#1a0000", border: "1px solid var(--red)" }}>
            <div className="text-[20px] mb-2">⚠️</div>
            <div className="text-[13px] mb-1" style={{ color: "var(--red)" }}>Scan failed</div>
            <div className="text-[11px]"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
              {error}
            </div>
          </div>
          <button onClick={() => setStep("crop")}
            style={{ ...btnBase, background: "var(--acc)", color: "#000" }}>
            Try Again
          </button>
        </>
      )}

    </div>
  );
}