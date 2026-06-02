import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

const variants = {
  primary: "bg-[#afa466] text-[#151515] shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:bg-[#fcffcc]",
  secondary: "border border-[#afa466] bg-transparent text-[#fcffcc] hover:bg-[#afa466] hover:text-[#151515]",
  subtle: "border border-line bg-[#303030] text-[#fcffcc] hover:border-[#afa466] hover:bg-[#242424]",
  champagne: "bg-[#afa466] text-[#151515] shadow-[0_14px_30px_rgba(0,0,0,0.24)] hover:bg-[#fcffcc]",
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
