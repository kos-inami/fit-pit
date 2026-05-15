import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
    primary: "bg-[var(--acc)] text-black hover:opacity-90",
    ghost:   "bg-transparent border border-[var(--grn)] text-[var(--grn)] hover:bg-[#001a0d]",
    outline: "bg-transparent border border-[var(--br2)] text-[var(--tx)] hover:border-[var(--mu2)]",
    danger:  "bg-transparent border border-[var(--red)] text-[var(--red)] hover:bg-[#1a0500]",
};

export default function Button({
    variant = "primary",
    fullWidth = true,
    className,
    children,
    disabled,
    ...props
    }: ButtonProps) {
    return (
        <button
        {...props}
        disabled={disabled}
        className={cn(
            "rounded-[9px] px-4 py-[13px] text-[17px] tracking-[2px] transition-all",
            "font-display cursor-pointer",
            fullWidth && "w-full",
            disabled && "opacity-40 cursor-not-allowed",
            styles[variant],
            className
        )}
        style={{ fontFamily: "'Bebas Neue', sans-serif", ...props.style }}
        >
        {children}
        </button>
    );
    }