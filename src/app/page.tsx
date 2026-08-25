import Link from "next/link";
import { checkConnectivity } from "@/lib/neo4j";
import { getAllServices, getGraphStats } from "@/lib/queries";
import { DbErrorBanner, EmptyState } from "@/components/States";
import { TierBadge, TeamTag } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const health = await checkConnectivity();

  if (!health.ok) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <DbErrorBanner message={health.message} />
      </div>
    );
  }

  const [services, stats] = await Promise.all([getAllServices(), getGraphStats()]);

  return (
    <div className="space-y-8">
      <PageHeader />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Services" value={stats.services} />
        <StatCard label="Dependencies" value={stats.dependencies} />
        <StatCard label="Incidents logged" value={stats.incidents} />
        <StatCard label="Teams" value={stats.teams} />
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No services in the graph yet"
          hint="Run `npm run seed` to load the sample dataset."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.name}
              href={`/services/${encodeURIComponent(s.name)}`}
              className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-medium text-slate-100 group-hover:text-white">
                  {s.name}
                </span>
                <TierBadge tier={s.tier} />
              </div>
              <p className="line-clamp-2 text-xs text-slate-500">{s.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <TeamTag team={s.team} />
                <span className="text-xs text-slate-600">{s.language}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Service Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Every service in the platform&apos;s dependency graph. Click one to see what
        breaks if it goes down.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
