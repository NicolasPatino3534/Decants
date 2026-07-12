import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

const variants = {
  primary: "bg-amber text-white hover:bg-[var(--accent-hover)]",
  secondary: "border border-[var(--border-strong)] bg-paper text-ink hover:bg-warm",
  subtle: "border border-line bg-paper text-ink hover:border-[var(--border-strong)] hover:bg-warm",
  champagne: "bg-amber text-white hover:bg-[var(--accent-hover)]",
  danger: "bg-danger text-white hover:brightness-95",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
};

export function ButtonLink({ href, className, variant = "primary", ...props }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-bg",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
