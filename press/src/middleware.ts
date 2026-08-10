import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const TRUSTED_HOSTS = new Set([
  "192.168.0.82:3002",
  "192.168.0.82",
  "localhost:3002",
  "localhost",
  "127.0.0.1:3002",
  "127.0.0.1",
])

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    })
  }

  const host = request.headers.get("host") ?? ""
  const requestHeaders = new Headers(request.headers)
  if (TRUSTED_HOSTS.has(host) && !requestHeaders.get("authorization")) {
    requestHeaders.set("authorization", "Bearer demo")
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type")
  return response
}

export const config = { matcher: "/api/:path*" }
