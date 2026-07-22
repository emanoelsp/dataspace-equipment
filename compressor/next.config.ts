import type { NextConfig } from "next"

// CORS aberto: o CPS vive na LAN da fábrica; consumidores legítimos são o
// Sidecar PEP (server-side) e o navegador do Dataspace (teste de endpoint e
// colheita de capacidades no registro do ativo).
const CORS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/api/:path*", headers: CORS }]
  },
}
export default nextConfig
