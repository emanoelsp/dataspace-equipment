import { NextRequest, NextResponse } from "next/server"
import { validateAccessToken } from "@/lib/equipment-aas"
import { buildAas } from "@/lib/simulator"
import { EQUIPMENT } from "@/lib/equipment-def"

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }
  const sub = request.nextUrl.searchParams.get("submodel")
  return NextResponse.json(buildAas(EQUIPMENT, sub), { headers: { "Cache-Control": "no-store" } })
}
