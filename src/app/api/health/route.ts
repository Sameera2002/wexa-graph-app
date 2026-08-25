import { NextResponse } from "next/server";
import { checkConnectivity } from "@/lib/neo4j";

export async function GET() {
  const result = await checkConnectivity();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
