import { cn } from "@/lib/format";

const toneClass = {
  green: "bg-green-50 text-moss ring-green-200",
  amber: "bg-amber-50 text-amber ring-amber-200",
  red: "bg-red-50 text-danger ring-red-200",
  neutral: "bg-mist text-neutral-700 ring-line",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1", toneClass[tone])}>
      {children}
    </span>
  );
}
