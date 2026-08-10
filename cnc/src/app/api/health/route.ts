import { NextResponse } from "next/server"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

export async function GET() {
  return NextResponse.json(
    {
      status: "online",
      equipment: "CNC Machining Centre",
      assetId: "urn:dataspace:plant1:equipment:cnc:machiningcenter:001",
      eclassIrdi: "0173-1#01-ACJ843#001",
      endpoints: { aas: "/api/aas", data: "/api/data", health: "/api/health" },
      timestamp: new Date().toISOString(),
    },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
