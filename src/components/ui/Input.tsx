import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const labelClass = `block mb-[7px] text-[10px] tracking-[1.5px] uppercase`
const inputBase  = `w-full rounded-[8px] px-[13px] py-[11px] text-[14px] outline-none transition-colors`
const inputStyle = {
  background:  "var(--s2)",
  border:      "1px solid var(--br)",
  color:       "var(--tx)",
  fontFamily:  "'DM Sans', sans-serif",
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className={labelClass}
      style={{ fontFamily: "'DM Mono', monospace", color: "var(--mu)" }}>
      {children}
    </label>
  );
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="mb-[14px]">
      {label && <Label>{label}</Label>}
      <input
        {...props}
        className={cn(inputBase, className)}
        style={{ ...inputStyle }}
      />
    </div>
  );
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="mb-[14px]">
      {label && <Label>{label}</Label>}
      <textarea
        {...props}
        className={cn(inputBase, "resize-none min-h-[80px] leading-relaxed", className)}
        style={{ ...inputStyle }}
      />
    </div>
  );
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="mb-[14px]">
      {label && <Label>{label}</Label>}
      <select
        {...props}
        className={inputBase}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        {children}
      </select>
    </div>
  );
}