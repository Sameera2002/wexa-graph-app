import type { Severity, Tier } from "@/lib/types";

const tierStyles: Record<Tier, string> = {
  critical: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  core: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  supporting: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tierStyles[tier]}`}
    >
      {tier}
    </span>
  );
}

const severityStyles: Record<Severity, string> = {
  SEV1: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  SEV2: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  SEV3: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${severityStyles[severity]}`}
    >
      {severity}
    </span>
  );
}

export function TeamTag({ team }: { team: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-white/10">
      {team}
    </span>
  );
}

export function CriticalPathTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 ring-1 ring-inset ring-rose-500/30">
      critical path
    </span>
  );
}
