// Shared domain types for the incident blast-radius graph app.

export type Tier = "critical" | "core" | "supporting";

export interface Service {
  name: string;
  description: string;
  team: string;
  tier: Tier;
  language: string;
}

export interface Team {
  name: string;
}

export interface Person {
  name: string;
  email: string;
  role: string;
}

export type Severity = "SEV1" | "SEV2" | "SEV3";

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  startedAt: string; // ISO string
  resolvedAt: string | null;
  rootCause: string;
}

export interface Deploy {
  id: string;
  version: string;
  timestamp: string;
  status: "success" | "rolled_back";
}

/** A downstream/upstream service found during a blast-radius traversal. */
export interface HopResult {
  service: Service;
  hops: number;
}

export interface OnCallContact {
  person: Person;
  team: Team;
  service: Service;
  hops: number;
}

export interface IncidentSummary extends Incident {
  affectedService: Service;
}

export interface RelatedIncident extends Incident {
  affectedService: Service;
  hops: number;
}

export interface GraphNode {
  id: string;
  label: string;
  team: string;
  tier: Tier;
}

export interface GraphEdge {
  source: string;
  target: string;
  critical: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
