import type { Metadata } from "next";
import { Libre_Caslon_Text, Open_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

const libreCaslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-libre-caslon",
});

const themeBootstrapScript = `
  try {
    const saved = window.localStorage.getItem("decantscba-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.themeReady = "true";
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    document.documentElement.dataset.themeReady = "true";
  }
`;

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: "Descubrí perfumes premium en decants de 3ml, 5ml y 10ml.",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-AR"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${openSans.variable} ${libreCaslon.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido principal
        </a>
        <ThemeProvider>
          <CartProvider>
            <SiteHeader />
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <SiteFooter />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
