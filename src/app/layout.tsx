import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GƎNƎSIS — Trade Analytics",
  description:
    "GƎNƎSIS is a premium trading analytics SaaS — journal trades, analyze edge, run backtests, and integrate numerology + astrology into your edge.",
  icons: { icon: "/favicon.svg" }
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
