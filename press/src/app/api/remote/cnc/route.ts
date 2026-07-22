import { NextRequest, NextResponse } from "next/server"

const DEFAULT_SIDECAR = process.env.SIDECAR_URL ?? "http://localhost:3100"

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  const sidecarUrl = request.nextUrl.searchParams.get("sidecarUrl") ?? DEFAULT_SIDECAR
  const endpoint = request.nextUrl.searchParams.get("endpoint") ?? "data"

  if (!token) {
    return NextResponse.json(
      { error: "Token required", hint: "Authorization: Bearer <token>" },
      { status: 401 }
    )
  }

  const targetUrl = `${sidecarUrl}/api/proxy/cnc/${endpoint}`
  const t0 = Date.now()

  try {
    const upstream = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const responseTimeMs = Date.now() - t0
    const body = await upstream.json()

    return NextResponse.json(
      {
        meta: {
          origin: {
            id: "urn:dataspace:plant1:equipment:cnc:001",
            label: "CNC Machining Center",
            eclassIrdi: "0173-1#01-ACJ843#001",
          },
          destination: {
            id: "urn:dataspace:plant1:equipment:press:hydraulic:001",
            label: "Hydraulic Press — Prensa Hidráulica",
            eclassIrdi: "0173-1#01-ADN573#001",
          },
          broker: {
            label: "Sidecar Proxy (IDS-PEP)",
            url: sidecarUrl,
            endpoint: `/api/proxy/cnc/${endpoint}`,
          },
          responseTimeMs,
          sidecarInternalMs: upstream.headers.get("x-response-time-ms")
            ? Number(upstream.headers.get("x-response-time-ms"))
            : null,
          statusCode: upstream.status,
          timestamp: new Date().toISOString(),
          tokenId: upstream.headers.get("x-token-id"),
          federationId: upstream.headers.get("x-federation-id"),
          dataOwnerId: upstream.headers.get("x-data-owner"),
          dataClientId: upstream.headers.get("x-data-client"),
        },
        data: upstream.ok ? body : null,
        error: upstream.ok ? null : body,
      },
      {
        status: upstream.ok ? 200 : upstream.status,
        headers: {
          "X-Response-Time-Ms": String(responseTimeMs),
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (err) {
    const responseTimeMs = Date.now() - t0
    return NextResponse.json(
      {
        meta: {
          origin: { id: "urn:dataspace:plant1:equipment:cnc:001", label: "CNC Machining Center" },
          destination: {
            id: "urn:dataspace:plant1:equipment:press:hydraulic:001",
            label: "Hydraulic Press",
          },
          broker: { label: "Sidecar Proxy (IDS-PEP)", url: sidecarUrl },
          responseTimeMs,
          statusCode: 503,
          timestamp: new Date().toISOString(),
        },
        data: null,
        error: { message: err instanceof Error ? err.message : String(err) },
      },
      { status: 503 }
    )
  }
}
