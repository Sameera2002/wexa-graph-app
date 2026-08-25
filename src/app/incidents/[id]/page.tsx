import Link from "next/link";
import { notFound } from "next/navigation";
import { checkConnectivity } from "@/lib/neo4j";
import { getIncidentDetail } from "@/lib/queries";
import { DbErrorBanner, EmptyState } from "@/components/States";
import { SeverityBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage(
  props: PageProps<"/incidents/[id]">
) {
  const { id: rawId } = await props.params;
  const id = decodeURIComponent(rawId);

  const health = await checkConnectivity();
  if (!health.ok) return <DbErrorBanner message={health.message} />;

  const detail = await getIncidentDetail(id);
  if (!detail) notFound();

  const { incident, affectedService, causedByDeploy, resolvedBy, relatedIncidents } =
    detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/incidents" className="text-xs text-slate-500 hover:text-slate-300">
          &larr; All incidents
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {incident.title}
          </h1>
          <SeverityBadge severity={incident.severity} />
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{incident.rootCause}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Affected service">
          <Link
            href={`/services/${encodeURIComponent(affectedService.name)}`}
            className="font-mono text-sm text-sky-400 hover:underline"
          >
            {affectedService.name}
          </Link>
        </Fact>
        <Fact label="Started">
          <span className="text-sm text-slate-300">
            {new Date(incident.startedAt).toLocaleString()}
          </span>
        </Fact>
        <Fact label="Resolved">
          <span className="text-sm text-slate-300">
            {incident.resolvedAt
              ? new Date(incident.resolvedAt).toLocaleString()
              : "Ongoing"}
          </span>
        </Fact>
        <Fact label="Resolved by">
          <span className="text-sm text-slate-300">{resolvedBy?.name ?? "Unassigned"}</span>
        </Fact>
      </div>

      {causedByDeploy && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-sm">
          <p className="font-medium text-amber-400">Traced to a deploy</p>
          <p className="mt-1 text-slate-400">
            <span className="font-mono text-slate-300">{causedByDeploy.version}</span>{" "}
            deployed {new Date(causedByDeploy.timestamp).toLocaleString()} &mdash; status:{" "}
            <span
              className={
                causedByDeploy.status === "rolled_back"
                  ? "text-rose-400"
                  : "text-emerald-400"
              }
            >
              {causedByDeploy.status.replace("_", " ")}
            </span>
          </p>
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Possibly related incidents
          </h2>
          <p className="text-xs text-slate-500">
            Other incidents whose affected service sits within 3 hops downstream of{" "}
            <span className="font-mono">{affectedService.name}</span> in the dependency
            graph &mdash; a connection that only exists implicitly, through the shape of
            the graph, not in the incident records themselves.
          </p>
        </div>
        {relatedIncidents.length === 0 ? (
          <EmptyState title="No related incidents found within 3 hops." />
        ) : (
          <div className="space-y-2">
            {relatedIncidents.map((r) => (
              <Link
                key={r.id}
                href={`/incidents/${encodeURIComponent(r.id)}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm hover:border-white/20"
              >
                <div>
                  <p className="text-slate-200">{r.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-mono">{r.affectedService.name}</span> &middot;{" "}
                    {r.hops} hop{r.hops === 1 ? "" : "s"} away &middot;{" "}
                    {new Date(r.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <SeverityBadge severity={r.severity} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
