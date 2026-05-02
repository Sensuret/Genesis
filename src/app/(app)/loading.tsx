/**
 * Route-level Suspense fallback shared by every page inside the (app)
 * segment. Next.js shows this skeleton instantly on navigation while the
 * destination page's JS bundle is fetched, so the user never sees a blank
 * screen between clicks.
 */
export default function AppRouteLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-bg-soft/60" />
      <div className="h-4 w-80 animate-pulse rounded-md bg-bg-soft/40" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-bg-soft/40" />
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-bg-soft/40" />
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-bg-soft/40" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-bg-soft/40" />
    </div>
  );
}
