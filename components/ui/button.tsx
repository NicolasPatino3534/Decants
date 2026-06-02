import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

const variants = {
  primary: "bg-ink text-white [color:#ffffff] shadow-[0_14px_34px_rgba(11,13,15,0.16)] hover:bg-black",
  secondary: "border border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
  subtle: "border border-line bg-white text-ink hover:border-[#b88939] hover:bg-[#fbfaf7]",
  champagne: "bg-[#b88939] text-white shadow-[0_14px_30px_rgba(184,137,57,0.22)] hover:bg-[#9f742e]",
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
