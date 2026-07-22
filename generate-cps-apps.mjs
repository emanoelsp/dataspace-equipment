#!/usr/bin/env node
/**
 * Gera uma app Next.js AUTÔNOMA por CPS da frota (fleet-config.mjs), no mesmo
 * padrão de cnc/press/robot — para implantação em computadores distintos da
 * rede (1 máquina = 1 CPS), permitindo medir tempos de comunicação reais.
 *
 * Uso:  node generate-cps-apps.mjs          # gera/atualiza as 7 apps
 *
 * Em cada máquina:  cd api-equipment/<id> && npm install && npm run dev
 * A fleet (server.mjs) permanece SOMENTE para a escada de escalabilidade.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { FLEET } from "./fleet/fleet-config.mjs"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CNC = path.join(ROOT, "cnc")

const PORTS = {
  oven: 3004, conveyor: 3005, agv: 3006, paint: 3007,
  quality: 3008, compressor: 3009, warehouse: 3010,
}

const copyFromCnc = [
  "next.config.ts",
  "src/middleware.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "src/app/globals.css",
  "src/lib/equipment-aas.ts",
]

function write(dir, rel, content) {
  const target = path.join(dir, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf-8")
}

function copy(dir, rel) {
  const src = path.join(CNC, rel)
  const target = path.join(dir, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(src, target)
}

const packageJson = (eq, port) => JSON.stringify({
  name: `equipment-${eq.id}`,
  version: "1.0.0",
  private: true,
  scripts: {
    dev: `next dev --turbopack -p ${port}`,
    build: "next build",
    start: `next start -p ${port}`,
  },
  dependencies: { next: "^15.1.11", react: "^19.0.0", "react-dom": "^19.0.0" },
  devDependencies: {
    "@types/node": "^20", "@types/react": "^19", "@types/react-dom": "^19",
    autoprefixer: "^10.5.0", postcss: "^8", tailwindcss: "^3.4.1", typescript: "^5",
  },
}, null, 2) + "\n"

const layoutTsx = (eq) => `import "./globals.css"

export const metadata = { title: "${eq.name} — CPS Simulator" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
`

const equipmentDefTs = (eq) => `// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = ${JSON.stringify({
  id: eq.id, name: eq.name, urn: eq.urn, equipmentType: eq.equipmentType,
  eclassClass: eq.eclassClass, eclassIrdi: eq.eclassIrdi,
  nameplate: eq.nameplate, technical: eq.technical,
  states: eq.states, runningStates: eq.runningStates, metrics: eq.metrics,
}, null, 2)}
`

const simulatorTs = `// Motor de simulação declarativo — idêntico em todas as apps geradas.
import {
  prop, mlProp, collection, extRef, round, clamp, nowIso, buildNameplateSubmodel,
  type AASEnvironment, type Submodel, type SubmodelElement, type ValueType,
} from "./equipment-aas"

export interface MetricGen {
  kind: "sine" | "noise" | "counter" | "batch" | "enum"
  base?: number; amp?: number; period?: number; phase?: number; noise?: number
  min?: number; max?: number; offset?: number; prefix?: string; values?: string[]
}

export interface MetricDef { key: string; decimals?: number; onlyRunning?: boolean; gen: MetricGen }

export interface EquipmentDef {
  id: string; name: string; urn: string; equipmentType: string
  eclassClass: string; eclassIrdi: string
  nameplate: {
    manufacturerName: string; productDesignation: string; serialNumber: string
    yearOfConstruction: string; orderCode: string; countryOfOrigin: string
  }
  technical: Array<[string, Array<[string, ValueType, unknown] | [string, ValueType, unknown, string]>]>
  states: Array<[string, number]>
  runningStates: string[]
  metrics: MetricDef[]
}

export function currentState(eq: EquipmentDef, t: number): string {
  const stateRnd = (Math.sin(t / 150000) + 1) / 2
  for (const [name, threshold] of eq.states) {
    if (stateRnd > threshold) return name
  }
  return eq.states[eq.states.length - 1][0]
}

export function genValue(m: MetricDef, t: number, running: boolean): unknown {
  const g = m.gen
  if (m.onlyRunning && !running) return g.kind === "enum" || g.kind === "batch" ? "NONE" : 0
  const rnd = () => Math.random()
  switch (g.kind) {
    case "sine": {
      const v = (g.base ?? 0) + (g.amp ?? 0) * Math.sin((2 * Math.PI * t) / (g.period ?? 60000) + (g.phase ?? 0)) + (g.noise ?? 0) * (rnd() - 0.5) * 2
      return round(clamp(v, g.min ?? -Infinity, g.max ?? Infinity), m.decimals ?? 2)
    }
    case "noise": {
      const v = (g.base ?? 0) + (g.noise ?? 0) * (rnd() - 0.5) * 2
      return round(clamp(v, g.min ?? -Infinity, g.max ?? Infinity), m.decimals ?? 2)
    }
    case "counter":
      return Math.floor(t / (g.period ?? 60000)) % 1000000 + (g.offset ?? 0)
    case "batch":
      return \`\${g.prefix ?? "LOT"}-\${String(Math.floor(t / (g.period ?? 3600000)) % 10000).padStart(4, "0")}\`
    case "enum":
      return (g.values ?? ["-"])[Math.floor(t / (g.period ?? 60000)) % (g.values ?? ["-"]).length]
  }
}

export function buildData(eq: EquipmentDef) {
  const t = Date.now()
  const state = currentState(eq, t)
  const running = eq.runningStates.includes(state)
  const metrics: Record<string, unknown> = {}
  for (const m of eq.metrics) metrics[m.key] = genValue(m, t, running)
  return {
    equipmentId: eq.urn,
    equipmentType: eq.equipmentType,
    eclassIrdi: eq.eclassIrdi,
    eclassClass: eq.eclassClass,
    timestamp: nowIso(),
    state,
    metrics,
  }
}

function buildTechnicalData(eq: EquipmentDef): Submodel {
  return {
    id: \`\${eq.urn}:TechnicalData\`, idShort: "TechnicalData", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2"),
    submodelElements: [
      collection("GeneralInformation", [
        prop("ManufacturerName", "xs:string", eq.nameplate.manufacturerName, "0173-1#02-AAO677#002"),
        prop("EclassClassification", "xs:string", eq.eclassClass, "0173-1#02-AAO041#003"),
        prop("EclassIrdi", "xs:string", eq.eclassIrdi),
        prop("EquipmentType", "xs:string", eq.equipmentType),
      ]),
      ...eq.technical.map(([name, props]) =>
        collection(name, props.map((p) => prop(p[0], p[1], p[2], p[3])))),
    ],
  }
}

function buildOperationalData(eq: EquipmentDef): Submodel {
  const data = buildData(eq)
  const elements: SubmodelElement[] = eq.metrics.map((m) => prop(
    m.key,
    typeof data.metrics[m.key] === "number" ? "xs:double" : "xs:string",
    data.metrics[m.key],
    \`urn:dataspace:plant1:semantic:\${eq.equipmentType.toLowerCase()}:\${m.key}\`,
  ))
  return {
    id: \`\${eq.urn}:OperationalData\`, idShort: "OperationalData", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("urn:dataspace:submodel:OperationalData:1:0"),
    submodelElements: [
      prop("State", "xs:string", data.state, "urn:dataspace:semantic:state"),
      prop("Timestamp", "xs:dateTime", data.timestamp),
      collection("Metrics", elements),
    ],
  }
}

export function buildAas(eq: EquipmentDef, submodelFilter?: string | null): AASEnvironment {
  const submodels = [
    buildNameplateSubmodel(eq.urn, {
      manufacturerName: eq.nameplate.manufacturerName,
      manufacturerProductDesignation: eq.nameplate.productDesignation,
      serialNumber: eq.nameplate.serialNumber,
      yearOfConstruction: eq.nameplate.yearOfConstruction,
      orderCode: eq.nameplate.orderCode,
      countryOfOrigin: eq.nameplate.countryOfOrigin,
    }),
    buildTechnicalData(eq),
    buildOperationalData(eq),
  ].filter((sm) => !submodelFilter || sm.idShort.toLowerCase() === submodelFilter.toLowerCase())

  return {
    assetAdministrationShells: [{
      id: \`\${eq.urn}:aas\`,
      idShort: eq.name.replace(/[^A-Za-z0-9]+/g, "_"),
      modelType: "AssetAdministrationShell",
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: eq.urn,
        specificAssetIds: [{ name: "equipmentSlug", value: eq.id }],
      },
      submodels: submodels.map((sm) => ({
        type: "ModelReference" as const,
        keys: [{ type: "Submodel", value: sm.id }],
      })),
    }],
    submodels,
  }
}
`

const dataRouteTs = `import { NextRequest, NextResponse } from "next/server"
import { validateAccessToken } from "@/lib/equipment-aas"
import { buildData } from "@/lib/simulator"
import { EQUIPMENT } from "@/lib/equipment-def"

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }
  return NextResponse.json(buildData(EQUIPMENT), { headers: { "Cache-Control": "no-store" } })
}
`

const aasRouteTs = `import { NextRequest, NextResponse } from "next/server"
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
`

const pageTsx = (eq, port) => `"use client"

// Painel de telemetria do CPS — visual local do equipamento nesta máquina.
import { useCallback, useEffect, useState } from "react"

type Data = {
  equipmentId: string; equipmentType: string; eclassIrdi: string; eclassClass: string
  timestamp: string; state: string; metrics: Record<string, number | string>
}

const STATE_COLORS: Record<string, string> = {
  error: "bg-red-500", jam: "bg-red-500", idle: "bg-yellow-400",
  charging: "bg-blue-400", maintenance: "bg-yellow-400",
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { headers: { Authorization: "Bearer demo" } })
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
      setData(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed")
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 2000)
    return () => clearInterval(id)
  }, [load])

  const stateColor = data ? STATE_COLORS[data.state] ?? "bg-emerald-500" : "bg-gray-400"

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">${eq.name}</h1>
          <p className="text-slate-400 text-sm mt-1">${eq.urn}</p>
          <p className="text-slate-500 text-xs mt-1">ECLASS ${eq.eclassClass} · IRDI ${eq.eclassIrdi} · porta ${port}</p>
        </header>

        <div className="flex items-center gap-3">
          <span className={\`inline-block w-3 h-3 rounded-full \${stateColor} animate-pulse\`} />
          <span className="uppercase tracking-widest text-sm">{data?.state ?? "connecting..."}</span>
          <span className="text-slate-500 text-xs ml-auto">{data?.timestamp}</span>
        </div>

        {error ? <p className="text-red-400 text-sm">{error}</p> : null}

        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {data ? Object.entries(data.metrics).map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 text-slate-400">{k}</td>
                <td className="py-1.5 text-right text-emerald-300">{String(v)}</td>
              </tr>
            )) : null}
          </tbody>
        </table>

        <footer className="text-xs text-slate-500 border-t border-slate-800 pt-4 space-y-1">
          <p>Endpoints deste CPS (consumidos pelo Sidecar PEP):</p>
          <p>GET /api/data — telemetria em tempo real (Bearer demo)</p>
          <p>GET /api/aas — Asset Administration Shell (?submodel=Nameplate|TechnicalData|OperationalData)</p>
        </footer>
      </div>
    </main>
  )
}
`

const gitignore = `node_modules/\n.next/\nnext-env.d.ts\n*.tsbuildinfo\n`

// ── geração ─────────────────────────────────────────────────────────────────
for (const eq of FLEET) {
  const port = PORTS[eq.id]
  if (!port) {
    console.log(`! ${eq.id}: sem porta atribuída — pulado`)
    continue
  }
  const dir = path.join(ROOT, eq.id)
  write(dir, "package.json", packageJson(eq, port))
  write(dir, ".gitignore", gitignore)
  for (const rel of copyFromCnc) copy(dir, rel)
  write(dir, "src/app/layout.tsx", layoutTsx(eq))
  write(dir, "src/app/page.tsx", pageTsx(eq, port))
  write(dir, "src/lib/simulator.ts", simulatorTs)
  write(dir, "src/lib/equipment-def.ts", equipmentDefTs(eq))
  write(dir, "src/app/api/data/route.ts", dataRouteTs)
  write(dir, "src/app/api/aas/route.ts", aasRouteTs)
  console.log(`✓ ${eq.id.padEnd(12)} porta ${port} → api-equipment/${eq.id}/`)
}
console.log("\nEm cada computador: cd api-equipment/<id> && npm install && npm run dev")
