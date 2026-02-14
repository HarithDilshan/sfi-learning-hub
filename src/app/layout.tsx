import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Lär dig Svenska — SFI Learning Hub",
  description:
    "Free interactive Swedish lessons aligned with the SFI curriculum. Practice vocabulary, grammar, quizzes, and everyday phrases from beginner to advanced.",
  keywords: ["SFI", "Swedish", "learn Swedish", "Svenska", "language learning", "Swedish for immigrants"],
  manifest: "/manifest.json",
  themeColor: "#003D66",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lär dig Svenska",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden"><PWARegister />{children}</body>
    </html>
  );
}
