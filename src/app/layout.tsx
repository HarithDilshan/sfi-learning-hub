import type { Metadata } from "next";
import { DM_Serif_Display, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ── CHANGE THIS to your real Vercel URL or custom domain ──────
const BASE_URL = "https://sfi-learning-hub.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Lär dig Svenska — Free SFI Swedish Learning",
    template: "%s | Lär dig Svenska",
  },

  description:
    "Free interactive Swedish lessons aligned with Sweden's SFI curriculum. " +
    "Learn vocabulary, grammar, listening, writing and pronunciation — from absolute beginner (Kurs A) to advanced (Kurs D).",

  keywords: [
    "learn Swedish",
    "Swedish for beginners",
    "SFI",
    "Svenska för invandrare",
    "lär dig svenska",
    "Swedish grammar",
    "Swedish vocabulary",
    "Swedish pronunciation",
    "free Swedish lessons",
    "SFI kurs A",
    "SFI kurs B",
    "SFI kurs C",
    "SFI kurs D",
    "Swedish language learning",
    "Swedish for immigrants",
  ],

  authors: [{ name: "Lär dig Svenska" }],
  creator: "Lär dig Svenska",
  publisher: "Lär dig Svenska",

  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "sv-SE": "/",
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Lär dig Svenska",
    title: "Lär dig Svenska — Free SFI Swedish Learning",
    description:
      "Free interactive Swedish lessons aligned with Sweden's SFI curriculum. " +
      "Learn vocabulary, grammar, and pronunciation from beginner to advanced.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lär dig Svenska — Free SFI Swedish Learning",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Lär dig Svenska — Free SFI Swedish Learning",
    description:
      "Free interactive Swedish lessons aligned with Sweden's SFI curriculum.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },

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
  },

  // 👇 Paste your code from Google Search Console here
  verification: {
    google: "zsthmqt9eIySt5tqiO4iB37PMq2FLmcli8aoL3gGXjI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${dmSerif.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
        {/* JSON-LD: tells Google exactly what this site is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Lär dig Svenska",
              alternateName: ["Learn Swedish", "SFI Learning Hub", "Svenska för invandrare"],
              url: BASE_URL,
              description:
                "Free interactive Swedish language lessons aligned with Sweden's SFI curriculum.",
              inLanguage: ["en", "sv"],
              publisher: {
                "@type": "Organization",
                name: "Lär dig Svenska",
                url: BASE_URL,
                logo: {
                  "@type": "ImageObject",
                  url: `${BASE_URL}/icon-32.png`,
                  width: 32,
                  height: 32,
                },
              },
              // Enables Google Sitelinks Search Box (when your site is big enough)
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${BASE_URL}/kurs/{search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}