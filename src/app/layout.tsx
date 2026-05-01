import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GƎNƎSIS — Trade Analytics",
  description:
    "GƎNƎSIS is a premium trading analytics SaaS — journal trades, analyze edge, run backtests, and integrate numerology + astrology into your edge.",
  icons: { icon: "/favicon.svg" }
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
