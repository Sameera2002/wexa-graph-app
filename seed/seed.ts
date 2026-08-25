// Loads the seed data (seed/data.ts) into the configured graph database.
// Run with: npm run seed
//
// Uses the official neo4j-driver directly (not the app's runQuery helper)
// so this script has zero dependency on the Next.js runtime.

import { config } from "dotenv";
import { existsSync } from "node:fs";
import neo4j from "neo4j-driver";

// Next.js convention: prefer .env.local, fall back to .env
config({ path: existsSync(".env.local") ? ".env.local" : ".env" });
import { teams, services, dependencies, people, deploys, incidents } from "./data";

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE || undefined;

  if (!uri || !user || !password) {
    console.error(
      "Missing NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD. Copy .env.local.example to .env.local and fill it in first."
    );
    process.exit(1);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    await driver.verifyConnectivity();
    console.log(`Connected to ${uri}`);
  } catch (err) {
    console.error("Could not connect to the database:", err);
    await driver.close();
    process.exit(1);
  }

  const session = driver.session({ database });

  try {
    console.log("Wiping existing graph...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("Creating constraints...");
    await session.run(
      "CREATE CONSTRAINT service_name IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT team_name IF NOT EXISTS FOR (t:Team) REQUIRE t.name IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT person_email IF NOT EXISTS FOR (p:Person) REQUIRE p.email IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT incident_id IF NOT EXISTS FOR (i:Incident) REQUIRE i.id IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT deploy_id IF NOT EXISTS FOR (d:Deploy) REQUIRE d.id IS UNIQUE"
    );

    console.log(`Creating ${teams.length} teams...`);
    await session.run(
      `UNWIND $teams AS name CREATE (:Team {name: name})`,
      { teams }
    );

    console.log(`Creating ${services.length} services...`);
    await session.run(
      `
      UNWIND $services AS svc
      CREATE (s:Service {
        name: svc.name,
        description: svc.description,
        team: svc.team,
        tier: svc.tier,
        language: svc.language
      })
      WITH s, svc
      MATCH (t:Team {name: svc.team})
      CREATE (s)-[:OWNED_BY]->(t)
      `,
      { services }
    );

    console.log(`Creating ${dependencies.length} DEPENDS_ON relationships...`);
    await session.run(
      `
      UNWIND $deps AS dep
      MATCH (a:Service {name: dep[0]})
      MATCH (b:Service {name: dep[1]})
      CREATE (a)-[:DEPENDS_ON {critical: dep[2]}]->(b)
      `,
      { deps: dependencies }
    );

    console.log(`Creating ${people.length} people...`);
    await session.run(
      `
      UNWIND $people AS person
      CREATE (p:Person {name: person.name, email: person.email, role: person.role})
      WITH p, person
      MATCH (t:Team {name: person.team})
      CREATE (p)-[:MEMBER_OF]->(t)
      `,
      { people }
    );

    console.log(`Creating ${deploys.length} deploys...`);
    await session.run(
      `
      UNWIND $deploys AS dep
      MATCH (s:Service {name: dep.service})
      CREATE (d:Deploy {id: dep.id, version: dep.version, timestamp: dep.timestamp, status: dep.status})
      CREATE (d)-[:DEPLOYED]->(s)
      `,
      { deploys }
    );

    console.log(`Creating ${incidents.length} incidents...`);
    await session.run(
      `
      UNWIND $incidents AS inc
      MATCH (s:Service {name: inc.affectedService})
      CREATE (i:Incident {
        id: inc.id,
        title: inc.title,
        severity: inc.severity,
        startedAt: inc.startedAt,
        resolvedAt: inc.resolvedAt,
        rootCause: inc.rootCause
      })
      CREATE (i)-[:AFFECTED]->(s)
      WITH i, inc
      OPTIONAL MATCH (d:Deploy {id: inc.causedByDeploy})
      FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
        CREATE (i)-[:CAUSED_BY]->(d)
      )
      WITH i, inc
      OPTIONAL MATCH (p:Person {name: inc.resolvedBy})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        CREATE (i)-[:RESOLVED_BY]->(p)
      )
      `,
      { incidents }
    );

    const counts = await session.run(`
      MATCH (s:Service) WITH count(s) AS services
      MATCH (i:Incident) WITH services, count(i) AS incidents
      MATCH ()-[d:DEPENDS_ON]->() WITH services, incidents, count(d) AS deps
      RETURN services, incidents, deps
    `);
    const row = counts.records[0];
    console.log(
      `\nSeed complete: ${row.get("services")} services, ${row.get(
        "deps"
      )} dependencies, ${row.get("incidents")} incidents.`
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
