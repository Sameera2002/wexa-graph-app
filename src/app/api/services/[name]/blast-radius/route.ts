import { NextRequest, NextResponse } from "next/server";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { getBlastRadius } from "@/lib/queries";

// Cypher's variable-length relationship bound (`*1..N`) can't be bound as a
// query parameter, so we clamp any user-supplied value to a safe integer
// range here rather than interpolating an unvalidated value into the query.
function clampHops(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(Math.max(parsed, 1), 10);
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/services/[name]/blast-radius">
) {
  const { name: rawName } = await context.params;
  const name = decodeURIComponent(rawName);
  const maxHops = clampHops(request.nextUrl.searchParams.get("maxHops"));

  try {
    const radius = await getBlastRadius(name, maxHops);
    return NextResponse.json({ service: name, maxHops, radius });
  } catch (err) {
    const message =
      err instanceof DatabaseUnavailableError ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
