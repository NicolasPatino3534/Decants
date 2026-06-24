import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: brand.name,
    description: "Descubrí perfumes premium en decants de 2ml, 5ml y 10ml.",
    url: "/",
    siteName: brand.name,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: "Decants premium para descubrir tu próxima firma.",
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
    <html lang="es" data-scroll-behavior="smooth">
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
