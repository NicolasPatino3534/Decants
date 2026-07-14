import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type SplitSectionProps = {
  content: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
  className?: string;
  contentClassName?: string;
  visualClassName?: string;
};

/** A two-column editorial layout. By default the visual sits left and the content right. */
export function SplitSection({
  content,
  visual,
  reverse = false,
  className,
  contentClassName,
  visualClassName,
}: SplitSectionProps) {
  return (
    <div
      className={cn(
        "premium-split",
        reverse && "premium-split--content-left",
        className,
      )}
      data-split-section
      data-reverse={reverse}
    >
      <div
        className={cn("premium-split__visual", visualClassName)}
        data-split-visual
      >
        {visual}
      </div>
      <div
        className={cn("premium-split__content", contentClassName)}
        data-split-content
      >
        {content}
      </div>
    </div>
  );
}
