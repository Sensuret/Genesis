"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * Wraps next-themes. We register THREE themes:
 *   - dark  (Tradezella-style true dark)
 *   - light (clean white)
 *   - gray  (muted slate, like Tradezella's daytime calendar shots)
 *
 * Each theme gets its own root class so CSS variables in globals.css
 * can switch palette + chart colors automatically.
 */
export function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      themes={["dark", "light", "gray"]}
      defaultTheme="dark"
      enableSystem={false}
      // We use class names "theme-<name>" so they don't collide with Tailwind's
      // built-in `dark` class name semantics. We add `dark` for the dark theme too
      // so any legacy `.dark:` selectors still work.
      value={{ dark: "theme-dark dark", light: "theme-light", gray: "theme-gray dark" }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
