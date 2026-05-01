"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Quick Sun/Moon toggle in the sidebar — flips Light <-> Purple (the two
 * "main" themes per spec). For the full 4-way picker (Pure Black / Pure
 * White / Grey / Purple) see <ThemePicker /> in the Settings page.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-9" />;

  const isLight = theme === "light";
  const next = isLight ? "purple" : "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={className}
      onClick={() => setTheme(next)}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
