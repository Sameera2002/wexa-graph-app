import neo4j, { Driver, Session, SessionMode } from "neo4j-driver";

/**
 * Single shared driver instance for the whole app.
 *
 * Connection details come ONLY from environment variables (never hardcoded /
 * committed) so the exact same code works against a local docker-compose
 * Neo4j instance in development and against a CognoDB Cloud instance in
 * production â€” only the .env values change.
 */

declare global {
  var __neo4jDriver: Driver | undefined;
}

export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      "Could not reach the graph database. Check NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD and that the instance is running."
    );
    this.name = "DatabaseUnavailableError";
    if (cause) this.cause = cause;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new DatabaseUnavailableError(
      new Error(`Missing required environment variable: ${name}`)
    );
  }
  return value;
}

function getDriver(): Driver {
  if (global.__neo4jDriver) return global.__neo4jDriver;

  const uri = requiredEnv("NEO4J_URI");
  const user = requiredEnv("NEO4J_USER");
  const password = requiredEnv("NEO4J_PASSWORD");

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });

  global.__neo4jDriver = driver;
  return driver;
}

/** Cheap connectivity check used by the /api/health route and the UI banner. */
export async function checkConnectivity(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Unknown database error",
    };
  }
}

/**
 * Run a single parameterized Cypher query and return the plain records.
 * All query values are passed as `params` (never string-concatenated into
 * the query text) so this goes through the driver's normal parameter
 * binding / escaping.
 */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
  mode: SessionMode = neo4j.session.READ
): Promise<T[]> {
  const database = process.env.NEO4J_DATABASE || undefined;
  let session: Session;

  try {
    session = getDriver().session({ database, defaultAccessMode: mode });
  } catch (err) {
    throw err instanceof DatabaseUnavailableError
      ? err
      : new DatabaseUnavailableError(err);
  }

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject() as T);
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  } finally {
    await session.close();
  }
}

/** Convert a neo4j Integer (or plain number) to a JS number safely. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (neo4j.isInt(value)) return value.toNumber();
  return Number(value);
}
