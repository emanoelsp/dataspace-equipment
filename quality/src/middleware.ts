import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Preflight CORS para chamadas browser→CPS com header Authorization.
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
  return NextResponse.next()
}

export const config = { matcher: "/api/:path*" }
