"use client";

import { useEffect, useState } from "react";

/**
 * Returns false during SSR and the first client render, then flips to true
 * after the component has hydrated. Use this to gate buttons whose handlers
 * depend on React event listeners — without this, a fast user can click a
 * `type="submit"` button BEFORE React attaches its `onSubmit` handler,
 * causing the browser to perform a native form submit (which navigates away
 * silently). The user thinks "it didn't work" and clicks again. Disabling
 * the submit button until hydration is complete eliminates the multi-click
 * issue entirely.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
