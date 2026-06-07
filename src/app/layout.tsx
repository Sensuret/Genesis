import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const siteDescription =
  "GƎNƎSIS is a premium trading analytics SaaS — journal trades, analyze edge, run prop-firm simulations, and integrate numerology + astrology into your edge.";

export const metadata: Metadata = {
  title: "GƎNƎSIS | Your Trading Partner",
  description: siteDescription,
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }]
  },
  openGraph: {
    title: "GƎNƎSIS | Your Trading Partner",
    description: siteDescription,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GƎNƎSIS — GS trade analytics mark" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "GƎNƎSIS | Your Trading Partner",
    description: siteDescription,
    images: ["/og-image.png"]
  }
};

// Mobile lock: pin width to device, disable user-zoom and bounce-scroll so
// the app doesn't drift around when the user swipes outside content.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0912"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-fg">
        <ThemeProvider
          attribute="class"
          defaultTheme="purple"
          enableSystem={false}
          themes={["light", "dark", "grey", "purple"]}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

