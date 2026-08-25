"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import type { GraphData, GraphNode, Tier } from "@/lib/types";
import { LoadingSkeleton, DbErrorBanner, EmptyState } from "@/components/States";

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

interface PositionedEdge {
  source: PositionedNode;
  target: PositionedNode;
  critical: boolean;
}

const tierColor: Record<Tier, string> = {
  critical: "#fb7185", // rose-400
  core: "#fbbf24", // amber-400
  supporting: "#38bdf8", // sky-400
};

const WIDTH = 900;
const HEIGHT = 620;

function layout(graph: GraphData): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  interface SimNode extends GraphNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  const simNodes: SimNode[] = graph.nodes.map((n) => ({ ...n, x: 0, y: 0 }));
  const simLinks = graph.edges.map((e) => ({ source: e.source, target: e.target }));

  const simulation = forceSimulation(simNodes as never)
    .force(
      "link",
      forceLink(simLinks as never)
        .id((d: unknown) => (d as SimNode).id)
        .distance(90)
        .strength(0.4)
    )
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("collide", forceCollide(34))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  const byId = new Map(simNodes.map((n) => [n.id, n as PositionedNode]));

  return {
    nodes: simNodes as PositionedNode[],
    edges: graph.edges.map((e) => ({
      source: byId.get(e.source)!,
      target: byId.get(e.target)!,
      critical: e.critical,
    })),
  };
}

export function GraphExplorer() {
  const router = useRouter();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("/api/graph")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: GraphData) => setGraph(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"));
  }, []);

  const positioned = useMemo(() => (graph ? layout(graph) : null), [graph]);

  if (error) return <DbErrorBanner message={error} />;
  if (!graph) return <LoadingSkeleton rows={6} />;
  if (graph.nodes.length === 0)
    return (
      <EmptyState
        title="No graph data yet"
        hint="Run `npm run seed` to load the sample dataset."
      />
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[620px] w-full">
          <g>
            {positioned!.edges.map((e, i) => (
              <line
                key={i}
                x1={e.source.x}
                y1={e.source.y}
                x2={e.target.x}
                y2={e.target.y}
                stroke={e.critical ? "#f43f5e" : "#334155"}
                strokeOpacity={e.critical ? 0.45 : 0.35}
                strokeWidth={e.critical ? 1.4 : 1}
                markerEnd="url(#arrow)"
              />
            ))}
          </g>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
            </marker>
          </defs>
          <g>
            {positioned!.nodes.map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                className="cursor-pointer"
                onClick={() => setSelected(n)}
                onDoubleClick={() => router.push(`/services/${encodeURIComponent(n.id)}`)}
              >
                <circle
                  r={selected?.id === n.id ? 10 : 7}
                  fill={tierColor[n.tier]}
                  stroke={selected?.id === n.id ? "#fff" : "transparent"}
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  className="select-none fill-slate-400 font-mono"
                  fontSize={9}
                >
                  {n.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Legend</p>
          <div className="space-y-1.5 text-xs">
            {(["critical", "core", "supporting"] as Tier[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: tierColor[t] }}
                />
                <span className="text-slate-400">{t}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="h-0.5 w-4 bg-rose-500/60" />
              <span className="text-slate-400">critical dependency</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Click a node to select it, double-click to open its detail page.
          </p>
        </div>

        {selected && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="font-mono text-sm text-slate-100">{selected.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              {selected.team} &middot; {selected.tier}
            </p>
            <a
              href={`/services/${encodeURIComponent(selected.id)}`}
              className="mt-3 inline-block text-xs text-sky-400 hover:underline"
            >
              View full detail &rarr;
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
