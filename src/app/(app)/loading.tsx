/** Instant shell while a route segment loads — keeps sidebar navigation feeling responsive. */
export default function AppLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-bg-soft" />
      <div className="h-4 w-72 max-w-full rounded bg-bg-soft/80" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 rounded-2xl bg-bg-soft/60" />
        <div className="h-32 rounded-2xl bg-bg-soft/60" />
        <div className="h-32 rounded-2xl bg-bg-soft/60" />
      </div>
      <div className="h-64 rounded-2xl bg-bg-soft/40" />
    </div>
  );
}
