import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Caveat } from "next/font/google";
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

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heo & Masuri",
  description: "Một nơi nhỏ chỉ dành cho hai người 🐷",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "H&M",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#E97A95",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${caveat.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
