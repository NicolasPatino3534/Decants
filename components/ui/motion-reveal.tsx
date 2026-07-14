"use client";

import type { HTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

type MotionRevealProps = HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  style,
  ...props
}: MotionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [prepared, setPrepared] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || reducedMotion.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    if (element.getBoundingClientRect().top > window.innerHeight * 0.9) {
      setPrepared(true);
    } else {
      setVisible(true);
    }
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-reveal",
        prepared && "is-prepared",
        visible && "is-visible",
        className,
      )}
      style={{
        ...style,
        ...(delay
          ? { transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` }
          : undefined),
      }}
      {...props}
    >
      {children}
    </div>
  );
}
