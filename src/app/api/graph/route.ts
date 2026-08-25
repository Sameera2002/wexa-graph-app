import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { getFullGraph } from "@/lib/queries";

/** Powers the interactive graph explorer (client-side force-directed layout). */
export async function GET() {
  try {
    const graph = await getFullGraph();
    return NextResponse.json(graph);
  } catch (err) {
    const message =
      err instanceof DatabaseUnavailableError ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
