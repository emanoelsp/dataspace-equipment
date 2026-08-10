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
      equipment: "Hydraulic Press",
      assetId: "urn:dataspace:plant1:equipment:press:hydraulic:001",
      eclassIrdi: "0173-1#01-ADN573#001",
      endpoints: { aas: "/api/aas", data: "/api/data", health: "/api/health" },
      timestamp: new Date().toISOString(),
    },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
