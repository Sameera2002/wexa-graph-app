import { Node, Relationship } from "neo4j-driver";
import { runQuery, toNumber } from "./neo4j";
import type {
  Service,
  Incident,
  IncidentSummary,
  RelatedIncident,
  Deploy,
  Person,
  Team,
  HopResult,
  OnCallContact,
  GraphData,
} from "./types";

// ---- small mapping helpers -------------------------------------------------

function toService(node: Node): Service {
  const p = node.properties;
  return {
    name: p.name,
    description: p.description,
    team: p.team,
    tier: p.tier,
    language: p.language,
  };
}

function toIncident(node: Node): Incident {
  const p = node.properties;
  return {
    id: p.id,
    title: p.title,
    severity: p.severity,
    startedAt: p.startedAt,
    resolvedAt: p.resolvedAt ?? null,
    rootCause: p.rootCause,
  };
}

function toDeploy(node: Node): Deploy {
  const p = node.properties;
  return { id: p.id, version: p.version, timestamp: p.timestamp, status: p.status };
}

function toPerson(node: Node): Person {
  const p = node.properties;
  return { name: p.name, email: p.email, role: p.role };
}

function toTeam(node: Node): Team {
  return { name: node.properties.name };
}

// ---- services ---------------------------------------------------------------

export async function getAllServices(): Promise<Service[]> {
  const rows = await runQuery<{ s: Node }>(
    `MATCH (s:Service) RETURN s ORDER BY s.tier, s.name`
  );
  return rows.map((r) => toService(r.s));
}

export async function getGraphStats(): Promise<{
  services: number;
  dependencies: number;
  incidents: number;
  teams: number;
}> {
  const rows = await runQuery<{
    services: unknown;
    dependencies: unknown;
    incidents: unknown;
    teams: unknown;
  }>(`
    MATCH (s:Service)
    WITH count(s) AS services
    MATCH ()-[d:DEPENDS_ON]->()
    WITH services, count(d) AS dependencies
    MATCH (i:Incident)
    WITH services, dependencies, count(i) AS incidents
    MATCH (t:Team)
    RETURN services, dependencies, incidents, count(t) AS teams
  `);
  const r = rows[0];
  return {
    services: toNumber(r?.services ?? 0),
    dependencies: toNumber(r?.dependencies ?? 0),
    incidents: toNumber(r?.incidents ?? 0),
    teams: toNumber(r?.teams ?? 0),
  };
}

export interface ServiceDetail {
  service: Service;
  team: Team | null;
  dependsOn: { service: Service; critical: boolean }[]; // what this service needs
  dependents: { service: Service; critical: boolean }[]; // what needs this service
  incidents: Incident[];
}

export async function getServiceDetail(name: string): Promise<ServiceDetail | null> {
  const serviceRows = await runQuery<{ s: Node }>(
    `MATCH (s:Service {name: $name}) RETURN s`,
    { name }
  );
  if (serviceRows.length === 0) return null;

  const [teamRows, dependsOnRows, dependentRows, incidentRows] = await Promise.all([
    runQuery<{ t: Node }>(
      `MATCH (:Service {name: $name})-[:OWNED_BY]->(t:Team) RETURN t`,
      { name }
    ),
    runQuery<{ dep: Node; rel: Relationship }>(
      `MATCH (:Service {name: $name})-[rel:DEPENDS_ON]->(dep:Service) RETURN dep, rel ORDER BY dep.name`,
      { name }
    ),
    runQuery<{ dep: Node; rel: Relationship }>(
      `MATCH (dep:Service)-[rel:DEPENDS_ON]->(:Service {name: $name}) RETURN dep, rel ORDER BY dep.name`,
      { name }
    ),
    runQuery<{ i: Node }>(
      `MATCH (i:Incident)-[:AFFECTED]->(:Service {name: $name}) RETURN i ORDER BY i.startedAt DESC`,
      { name }
    ),
  ]);

  return {
    service: toService(serviceRows[0].s),
    team: teamRows[0] ? toTeam(teamRows[0].t) : null,
    dependsOn: dependsOnRows.map((r) => ({
      service: toService(r.dep),
      critical: r.rel.properties.critical,
    })),
    dependents: dependentRows.map((r) => ({
      service: toService(r.dep),
      critical: r.rel.properties.critical,
    })),
    incidents: incidentRows.map((r) => toIncident(r.i)),
  };
}

/**
 * BLAST RADIUS â€” the core multi-hop traversal of the app.
 *
 * "If `name` goes down, what else breaks?" We walk DEPENDS_ON edges
 * *backwards* (from things that depend on `name`, transitively, outward)
 * up to `maxHops` hops, and keep the *shortest* distance at which each
 * downstream service is reachable.
 *
 * In SQL this is the classic "arbitrary-depth transitive closure" problem:
 * you'd need a recursive CTE that self-joins a dependency table an unknown
 * number of times, manually de-duplicates nodes reached via multiple paths,
 * and tracks minimum depth per node â€” doable, but painful and slow at
 * scale. Here it's one variable-length pattern.
 */
export async function getBlastRadius(
  name: string,
  maxHops = 6
): Promise<HopResult[]> {
  const rows = await runQuery<{ downstream: Node; hops: unknown }>(
    `
    MATCH path = (target:Service {name: $name})<-[:DEPENDS_ON*1..${maxHops}]-(downstream:Service)
    WITH downstream, min(length(path)) AS hops
    RETURN downstream, hops
    ORDER BY hops, downstream.name
    `,
    { name }
  );
  return rows.map((r) => ({ service: toService(r.downstream), hops: toNumber(r.hops) }));
}

/** The inverse view: everything `name` transitively depends on (its own risk exposure). */
export async function getUpstreamDependencies(
  name: string,
  maxHops = 6
): Promise<HopResult[]> {
  const rows = await runQuery<{ upstream: Node; hops: unknown }>(
    `
    MATCH path = (target:Service {name: $name})-[:DEPENDS_ON*1..${maxHops}]->(upstream:Service)
    WITH upstream, min(length(path)) AS hops
    RETURN upstream, hops
    ORDER BY hops, upstream.name
    `,
    { name }
  );
  return rows.map((r) => ({ service: toService(r.upstream), hops: toNumber(r.hops) }));
}

/**
 * On-call chain: every person who should be paged if `name` goes down,
 * meaning anyone who owns a team responsible for `name` OR any service
 * within its blast radius. Combines a variable-length traversal with two
 * more relationship hops (Service -> Team -> Person) in a single query.
 */
export async function getOnCallChain(
  name: string,
  maxHops = 3
): Promise<OnCallContact[]> {
  const rows = await runQuery<{
    p: Node;
    t: Node;
    s: Node;
    hops: unknown;
  }>(
    `
    MATCH path = (target:Service {name: $name})<-[:DEPENDS_ON*0..${maxHops}]-(affected:Service)
    WITH affected, min(length(path)) AS hops
    MATCH (affected)-[:OWNED_BY]->(t:Team)<-[:MEMBER_OF]-(p:Person)
    RETURN DISTINCT p, t, affected AS s, hops
    ORDER BY hops, t.name, p.name
    `,
    { name }
  );
  return rows.map((r) => ({
    person: toPerson(r.p),
    team: toTeam(r.t),
    service: toService(r.s),
    hops: toNumber(r.hops),
  }));
}

// ---- incidents ---------------------------------------------------------------

export async function getAllIncidents(): Promise<IncidentSummary[]> {
  const rows = await runQuery<{ i: Node; s: Node }>(
    `MATCH (i:Incident)-[:AFFECTED]->(s:Service) RETURN i, s ORDER BY i.startedAt DESC`
  );
  return rows.map((r) => ({ ...toIncident(r.i), affectedService: toService(r.s) }));
}

export interface IncidentDetail {
  incident: Incident;
  affectedService: Service;
  causedByDeploy: Deploy | null;
  resolvedBy: Person | null;
  relatedIncidents: RelatedIncident[];
}

/**
 * "Related incidents" is the other query a relational schema would find
 * awkward: for the incident's root-cause service, find OTHER incidents
 * whose affected service sits within N hops downstream in the dependency
 * graph â€” i.e. plausible knock-on effects, even though nothing in the
 * incident records themselves says these incidents are connected. That
 * connection only exists implicitly, via the shape of the dependency graph.
 */
export async function getIncidentDetail(id: string): Promise<IncidentDetail | null> {
  const rows = await runQuery<{ i: Node; s: Node }>(
    `MATCH (i:Incident {id: $id})-[:AFFECTED]->(s:Service) RETURN i, s`,
    { id }
  );
  if (rows.length === 0) return null;

  const [deployRows, resolverRows, relatedRows] = await Promise.all([
    runQuery<{ d: Node }>(
      `MATCH (i:Incident {id: $id})-[:CAUSED_BY]->(d:Deploy) RETURN d`,
      { id }
    ),
    runQuery<{ p: Node }>(
      `MATCH (i:Incident {id: $id})-[:RESOLVED_BY]->(p:Person) RETURN p`,
      { id }
    ),
    runQuery<{ i2: Node; s2: Node; hops: unknown }>(
      `
      MATCH (i:Incident {id: $id})-[:AFFECTED]->(root:Service)
      MATCH path = (root)<-[:DEPENDS_ON*1..3]-(affected:Service)
      MATCH (i2:Incident)-[:AFFECTED]->(affected)
      WHERE i2.id <> $id
      WITH i2, affected AS s2, min(length(path)) AS hops
      RETURN i2, s2, hops
      ORDER BY hops, i2.startedAt DESC
      LIMIT 10
      `,
      { id }
    ),
  ]);

  return {
    incident: toIncident(rows[0].i),
    affectedService: toService(rows[0].s),
    causedByDeploy: deployRows[0] ? toDeploy(deployRows[0].d) : null,
    resolvedBy: resolverRows[0] ? toPerson(resolverRows[0].p) : null,
    relatedIncidents: relatedRows.map((r) => ({
      ...toIncident(r.i2),
      affectedService: toService(r.s2),
      hops: toNumber(r.hops),
    })),
  };
}

// ---- full graph (for the explorer visualization) -----------------------------

export async function getFullGraph(): Promise<GraphData> {
  const [nodeRows, edgeRows] = await Promise.all([
    runQuery<{ s: Node }>(`MATCH (s:Service) RETURN s`),
    runQuery<{ a: string; b: string; rel: Relationship }>(
      `MATCH (a:Service)-[rel:DEPENDS_ON]->(b:Service) RETURN a.name AS a, b.name AS b, rel`
    ),
  ]);

  return {
    nodes: nodeRows.map((r) => {
      const s = toService(r.s);
      return { id: s.name, label: s.name, team: s.team, tier: s.tier };
    }),
    edges: edgeRows.map((r) => ({
      source: r.a,
      target: r.b,
      critical: Boolean(r.rel.properties.critical),
    })),
  };
}
