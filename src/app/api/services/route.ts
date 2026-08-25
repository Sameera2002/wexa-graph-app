import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { getAllServices } from "@/lib/queries";

export async function GET() {
  try {
    const services = await getAllServices();
    return NextResponse.json(services);
  } catch (err) {
    const message =
      err instanceof DatabaseUnavailableError ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
