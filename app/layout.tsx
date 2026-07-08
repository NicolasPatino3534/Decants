import type { Metadata } from "next";
import "./globals.css";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: brand.displayName,
    template: `%s | ${brand.displayName}`,
  },
  description: brand.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: brand.displayName,
    description: "Decants originales en 2ml, 5ml y 10ml para probar antes del frasco completo.",
    url: "/",
    siteName: brand.displayName,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: brand.displayName,
    description: "Decants originales para descubrir tu proxima firma sin comprar a ciegas.",
  },
  icons: {
    icon: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    (() => {
      try {
        const stored = localStorage.getItem("decantscba-theme");
        const theme = stored === "dark" || stored === "light"
          ? stored
          : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.dataset.theme = theme;
      } catch (_) {}
    })();
  `;

  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {env.googleTagManagerId ? <GoogleTagManager gtmId={env.googleTagManagerId} /> : null}
        <CartProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
