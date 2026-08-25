export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 py-16 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-white/5 ring-1 ring-white/5"
        />
      ))}
    </div>
  );
}

export function DbErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span className="mt-0.5">&#9888;</span>
      <div>
        <p className="font-medium">Can&apos;t reach the graph database</p>
        <p className="mt-0.5 text-rose-400/80">{message}</p>
        <p className="mt-1 text-rose-400/60">
          Check <code className="rounded bg-black/30 px-1">NEO4J_URI</code>,{" "}
          <code className="rounded bg-black/30 px-1">NEO4J_USER</code> and{" "}
          <code className="rounded bg-black/30 px-1">NEO4J_PASSWORD</code> in your
          environment, and that the instance is running.
        </p>
      </div>
    </div>
  );
}
