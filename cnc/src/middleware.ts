import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Hosts locais autorizados a acessar sem token.
// No Next.js dev sem proxy, request.ip não é populado; usamos o header Host
// que o browser envia com o hostname/IP digitado na barra de endereços.
const TRUSTED_HOSTS = new Set([
  "192.168.0.82:3001",
  "192.168.0.82",
  "localhost:3001",
  "localhost",
  "127.0.0.1:3001",
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
