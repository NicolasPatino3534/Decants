import { cn } from "@/lib/format";

const toneClass = {
  green: "bg-green-500/10 text-moss ring-green-500/30",
  amber: "bg-warm text-[var(--accent-muted)] ring-line",
  red: "bg-red-500/10 text-danger ring-red-500/30",
  neutral: "bg-mist text-muted ring-line",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
