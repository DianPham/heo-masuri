import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Nunito, Dancing_Script } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  display: "swap",
});

// Nunito: modern, rounded, full Vietnamese support — primary accent font
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-accent",
  display: "swap",
});

// Dancing Script: handwritten cursive with full Vietnamese support — notebook titles, Masuri's letters.
// Weights: 400–700, variable available. Vietnamese diacritics fully covered.
const dancingScript = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  variable: "--font-handwritten",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heo & Masuri",
  description: "Một nơi nhỏ chỉ dành cho hai người 🐷",
  manifest: "/manifest.json",
  // iOS Safari ignores manifest.json display:standalone — these tags are required.
  appleWebApp: {
    capable: true,
    title: "H&M",
    statusBarStyle: "default",
  },
  // apple-touch-icon is emitted automatically by app/apple-icon.tsx
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#E97A95",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // viewport-fit=cover is required for iPhone notch / home-indicator safe areas.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${nunito.variable} ${dancingScript.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
