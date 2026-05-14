import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tarkam.vercel.app"),
  title: "Tarkam IDM - Idol Meta Fan Made Edition",
  description: "Idol meta fan made edition - TARKAM. Komunitas Idol Meta Indonesia. Turnamen mingguan, leaderboard, dan lebih banyak lagi.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo1.webp",
    apple: "/og-banner.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },

  // ── Open Graph — Rich preview saat share link di WhatsApp, Telegram, dll ──
  openGraph: {
    title: "TARKAM IDM — Turnamen Idol Meta Indonesia",
    description: "Komunitas Idol Meta Indonesia. Turnamen mingguan, leaderboard, MVP, Sultan of the Week, dan lebih banyak lagi. Gabung sekarang!",
    url: "https://tarkam.vercel.app",
    siteName: "TARKAM IDM",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "TARKAM IDM — Turnamen Idol Meta Indonesia",
      },
    ],
    locale: "id_ID",
    type: "website",
  },

  // ── Twitter Card — Preview khusus Twitter/X ──
  twitter: {
    card: "summary_large_image",
    title: "TARKAM IDM — Turnamen Idol Meta Indonesia",
    description: "Komunitas Idol Meta Indonesia. Turnamen mingguan, leaderboard, MVP, dan lebih banyak lagi.",
    images: ["/og-banner.png"],
  },

  // ── Keywords untuk SEO ──
  keywords: ["TARKAM", "IDM", "Idol Meta", "turnamen", "esports", "komunitas", "leaderboard", "MVP"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#080a14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* PWA: Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
