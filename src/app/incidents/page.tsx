import Link from "next/link";
import { checkConnectivity } from "@/lib/neo4j";
import { getAllIncidents } from "@/lib/queries";
import { DbErrorBanner, EmptyState } from "@/components/States";
import { SeverityBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const health = await checkConnectivity();
  if (!health.ok) return <DbErrorBanner message={health.message} />;

  const incidents = await getAllIncidents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Incidents</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every recorded incident, most recent first.
        </p>
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents recorded"
          hint="Run `npm run seed` to load the sample dataset."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Incident</th>
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incidents.map((inc) => (
                <tr key={inc.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/incidents/${encodeURIComponent(inc.id)}`}
                      className="text-slate-200 hover:text-white hover:underline"
                    >
                      {inc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/services/${encodeURIComponent(inc.affectedService.name)}`}
                      className="font-mono text-xs text-sky-400 hover:underline"
                    >
                      {inc.affectedService.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(inc.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
