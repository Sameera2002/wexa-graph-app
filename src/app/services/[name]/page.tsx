import Link from "next/link";
import { notFound } from "next/navigation";
import { checkConnectivity } from "@/lib/neo4j";
import {
  getServiceDetail,
  getBlastRadius,
  getOnCallChain,
} from "@/lib/queries";
import { DbErrorBanner, EmptyState } from "@/components/States";
import { TierBadge, TeamTag, SeverityBadge } from "@/components/Badges";
import type { Service, HopResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage(
  props: PageProps<"/services/[name]">
) {
  const { name: rawName } = await props.params;
  const name = decodeURIComponent(rawName);

  const health = await checkConnectivity();
  if (!health.ok) {
    return <DbErrorBanner message={health.message} />;
  }

  const detail = await getServiceDetail(name);
  if (!detail) notFound();

  const [blastRadius, onCall] = await Promise.all([
    getBlastRadius(name),
    getOnCallChain(name),
  ]);

  const { service, team, dependsOn, dependents, incidents } = detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
          &larr; All services
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-white">
            {service.name}
          </h1>
          <TierBadge tier={service.tier} />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{service.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {team && <TeamTag team={team.name} />}
          <span>&middot;</span>
          <span>{service.language}</span>
        </div>
      </div>

      {/* Blast radius — the headline feature */}
      <section>
        <SectionHeader
          title="Blast radius if this goes down"
          hint={`${blastRadius.length} downstream service${blastRadius.length === 1 ? "" : "s"} transitively depend on ${service.name}`}
        />
        {blastRadius.length === 0 ? (
          <EmptyState title="Nothing depends on this service, directly or transitively." />
        ) : (
          <BlastRadiusList radius={blastRadius} />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader title="Depends on" hint="What this service needs to function" />
          <ServiceEdgeList
            items={dependsOn}
            emptyLabel="This service has no dependencies &mdash; it's a leaf node."
          />
        </section>
        <section>
          <SectionHeader title="Depended on by" hint="Direct callers only" />
          <ServiceEdgeList
            items={dependents}
            emptyLabel="No other service directly depends on this one."
          />
        </section>
      </div>

      <section>
        <SectionHeader
          title="Who to page"
          hint="Owners of every team touched across the blast radius"
        />
        {onCall.length === 0 ? (
          <EmptyState title="No on-call contacts found." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Person</th>
                  <th className="px-4 py-2 font-medium">Team</th>
                  <th className="px-4 py-2 font-medium">Because of</th>
                  <th className="px-4 py-2 font-medium">Hops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {onCall.map((c) => (
                  <tr key={`${c.person.email}-${c.service.name}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-slate-200">{c.person.name}</p>
                      <p className="text-xs text-slate-500">{c.person.role}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{c.team.name}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/services/${encodeURIComponent(c.service.name)}`}
                        className="font-mono text-xs text-sky-400 hover:underline"
                      >
                        {c.service.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{c.hops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Incident history" hint="Incidents where this service was the affected system" />
        {incidents.length === 0 ? (
          <EmptyState title="No recorded incidents for this service." />
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidents/${encodeURIComponent(inc.id)}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm hover:border-white/20"
              >
                <div>
                  <p className="text-slate-200">{inc.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(inc.startedAt).toLocaleString()}
                  </p>
                </div>
                <SeverityBadge severity={inc.severity} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ServiceEdgeList({
  items,
  emptyLabel,
}: {
  items: { service: Service; critical: boolean }[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <EmptyState title={emptyLabel} />;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.service.name}>
          <Link
            href={`/services/${encodeURIComponent(item.service.name)}`}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:border-white/20"
          >
            <span className="font-mono text-slate-300">{item.service.name}</span>
            {item.critical && (
              <span className="text-xs font-medium text-rose-400">critical</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BlastRadiusList({ radius }: { radius: HopResult[] }) {
  const grouped = new Map<number, HopResult[]>();
  for (const r of radius) {
    const list = grouped.get(r.hops) ?? [];
    list.push(r);
    grouped.set(r.hops, list);
  }
  const hopLevels = [...grouped.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {hopLevels.map((hops) => (
        <div key={hops}>
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            {hops} hop{hops === 1 ? "" : "s"} away
          </p>
          <div className="flex flex-wrap gap-2">
            {grouped.get(hops)!.map((r) => (
              <Link
                key={r.service.name}
                href={`/services/${encodeURIComponent(r.service.name)}`}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm hover:border-white/20"
              >
                <span className="font-mono text-slate-200">{r.service.name}</span>
                <TierBadge tier={r.service.tier} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
