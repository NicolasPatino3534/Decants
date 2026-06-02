import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Aurum Decants",
    template: "%s | Aurum Decants",
  },
  description: "Tienda online de decants premium, muestras originales y perfumes boutique.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aurum Decants",
    description: "Descubri perfumes premium en decants de 2ml, 5ml y 10ml.",
    url: "/",
    siteName: "Aurum Decants",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurum Decants",
    description: "Decants premium para descubrir tu proxima firma.",
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
  return (
    <html lang="es">
      <body>
        <CartProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
