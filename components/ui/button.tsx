import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

const variants = {
  primary: "bg-[#b8872f] text-white hover:bg-[#9f7225]",
  secondary: "border border-[#caa55c] bg-white text-ink hover:bg-[#f8f1e3]",
  subtle: "border border-line bg-white text-ink hover:border-[#caa55c] hover:bg-[#fbf7ed]",
  champagne: "bg-[#b8872f] text-white hover:bg-[#9f7225]",
  danger: "bg-danger text-white hover:brightness-95",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#b88939] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#b88939] focus:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
