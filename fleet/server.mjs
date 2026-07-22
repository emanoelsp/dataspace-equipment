#!/usr/bin/env node
/**
 * Fleet — frota de CPS simulados da plant1 em um único processo, sem dependências.
 *
 * Endpoints (mesmo contrato dos simuladores cnc/press/robot):
 *   GET /                          → índice da frota (ids + endpoints)
 *   GET /eq/{id}/api/data          → telemetria em tempo real     (Bearer demo)
 *   GET /eq/{id}/api/aas           → AAS Environment (IDTA/ECLASS) (Bearer demo)
 *   GET /eq/{id}/api/aas?submodel=Nameplate|TechnicalData|OperationalData
 *
 * Uso:
 *   node server.mjs                     # porta 3010, 7 equipamentos
 *   node server.mjs --port 3010
 *   node server.mjs --scale 3           # replica cada template 3x (frota 21)
 *                                       # → escada de escalabilidade 5/20/50/100/500
 *
 * Registro no sidecar: baseUrl de cada CPS = http://{host}:{porta}/eq/{id}
 * (o Sidecar PEP chama {baseUrl}/api/data e {baseUrl}/api/aas).
 */

import http from "http"
import { FLEET } from "./fleet-config.mjs"

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const PORT = Number(argValue("--port", process.env.FLEET_PORT ?? "3050"))
const SCALE = Math.max(1, Number(argValue("--scale", "1")))

// ── frota efetiva (com replicação para testes de escalabilidade) ────────────
function instantiate() {
  const out = new Map()
  for (const tpl of FLEET) {
    for (let k = 1; k <= SCALE; k++) {
      const id = k === 1 ? tpl.id : `${tpl.id}-${k}`
      const suffix = String(k).padStart(3, "0")
      out.set(id, {
        ...tpl,
        id,
        name: k === 1 ? tpl.name : `${tpl.name} #${k}`,
        urn: tpl.urn.replace(/:\d+$/, `:${suffix}`),
        phaseSeed: hash(`${tpl.id}:${k}`),
      })
    }
  }
  return out
}

function hash(s) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100000
  return h / 100000
}

const EQUIPMENT = instantiate()

// ── geradores (mesmo estilo dos simuladores originais) ──────────────────────
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const clamp = (v, min, max) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
const rnd = () => Math.random()

function currentState(eq, t) {
  const stateRnd = (Math.sin(t / 150000 + eq.phaseSeed * Math.PI * 2) + 1) / 2
  for (const [name, threshold] of eq.states) {
    if (stateRnd > threshold) return name
  }
  return eq.states[eq.states.length - 1][0]
}

function genValue(eq, m, t, running) {
  const g = m.gen
  if (m.onlyRunning && !running) {
    return g.kind === "enum" || g.kind === "batch" ? "NONE" : 0
  }
  const phase = (g.phase ?? 0) + eq.phaseSeed * Math.PI * 2
  switch (g.kind) {
    case "sine": {
      const v = g.base + (g.amp ?? 0) * Math.sin((2 * Math.PI * t) / g.period + phase) + (g.noise ?? 0) * (rnd() - 0.5) * 2
      return round(clamp(v, g.min, g.max), m.decimals ?? 2)
    }
    case "noise": {
      const v = g.base + (g.noise ?? 0) * (rnd() - 0.5) * 2
      return round(clamp(v, g.min, g.max), m.decimals ?? 2)
    }
    case "counter":
      return Math.floor(t / g.period) % 1000000 + (g.offset ?? 0)
    case "batch":
      return `${g.prefix}-${String(Math.floor(t / g.period) % 10000).padStart(4, "0")}`
    case "enum":
      return g.values[Math.floor(t / g.period) % g.values.length]
    default:
      return null
  }
}

function buildData(eq) {
  const t = Date.now()
  const state = currentState(eq, t)
  const running = eq.runningStates.includes(state)
  const metrics = {}
  for (const m of eq.metrics) metrics[m.key] = genValue(eq, m, t, running)
  return {
    equipmentId: eq.urn,
    equipmentType: eq.equipmentType,
    eclassIrdi: eq.eclassIrdi,
    eclassClass: eq.eclassClass,
    timestamp: new Date().toISOString(),
    state,
    metrics,
  }
}

// ── AAS (IDTA-01001-3-0, mesmo formato dos simuladores originais) ───────────
const extRef = (value) => ({ type: "ExternalReference", keys: [{ type: "GlobalReference", value }] })
const prop = (idShort, valueType, value, irdi) => ({
  idShort, modelType: "Property", valueType, value,
  ...(irdi ? { semanticId: extRef(irdi) } : {}),
})
const mlProp = (idShort, text, irdi) => ({
  idShort, modelType: "MultiLanguageProperty",
  value: [{ language: "pt", text }, { language: "en", text }],
  ...(irdi ? { semanticId: extRef(irdi) } : {}),
})
const smc = (idShort, elements) => ({ idShort, modelType: "SubmodelElementCollection", submodelElements: elements })

function buildNameplate(eq) {
  const n = eq.nameplate
  return {
    id: `${eq.urn}:Nameplate`, idShort: "Nameplate", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/zvei/nameplate/2/0/Nameplate"),
    submodelElements: [
      mlProp("ManufacturerName", n.manufacturerName, "0173-1#02-AAO677#002"),
      mlProp("ManufacturerProductDesignation", n.productDesignation, "0173-1#02-AAW338#001"),
      prop("SerialNumber", "xs:string", n.serialNumber, "0173-1#02-AAM556#002"),
      prop("YearOfConstruction", "xs:string", n.yearOfConstruction, "0173-1#02-AAP906#001"),
      prop("OrderCodeOfManufacturer", "xs:string", n.orderCode, "0173-1#02-AAO227#002"),
      prop("CountryOfOrigin", "xs:string", n.countryOfOrigin, "0173-1#02-AAO259#004"),
    ],
  }
}

function buildTechnicalData(eq) {
  return {
    id: `${eq.urn}:TechnicalData`, idShort: "TechnicalData", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2"),
    submodelElements: [
      smc("GeneralInformation", [
        prop("ManufacturerName", "xs:string", eq.nameplate.manufacturerName, "0173-1#02-AAO677#002"),
        prop("EclassClassification", "xs:string", eq.eclassClass, "0173-1#02-AAO041#003"),
        prop("EclassIrdi", "xs:string", eq.eclassIrdi),
        prop("EquipmentType", "xs:string", eq.equipmentType),
      ]),
      ...eq.technical.map(([name, props]) => smc(name, props.map(([idShort, vt, value, irdi]) => prop(idShort, vt, value, irdi)))),
    ],
  }
}

function buildOperationalData(eq) {
  const data = buildData(eq)
  return {
    id: `${eq.urn}:OperationalData`, idShort: "OperationalData", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("urn:dataspace:submodel:OperationalData:1:0"),
    submodelElements: [
      prop("State", "xs:string", data.state, "urn:dataspace:semantic:state"),
      prop("Timestamp", "xs:dateTime", data.timestamp),
      smc("Metrics", eq.metrics.map(m => prop(
        m.key,
        typeof data.metrics[m.key] === "number" ? "xs:double" : "xs:string",
        data.metrics[m.key],
        `urn:dataspace:plant1:semantic:${eq.equipmentType.toLowerCase()}:${m.key}`,
      ))),
    ],
  }
}

function buildAas(eq, submodelFilter) {
  const submodels = [buildNameplate(eq), buildTechnicalData(eq), buildOperationalData(eq)]
    .filter(sm => !submodelFilter || sm.idShort.toLowerCase() === submodelFilter.toLowerCase())
  return {
    assetAdministrationShells: [{
      id: `${eq.urn}:aas`,
      idShort: eq.name.replace(/[^A-Za-z0-9]+/g, "_"),
      modelType: "AssetAdministrationShell",
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: eq.urn,
        specificAssetIds: [{ name: "equipmentSlug", value: eq.id }],
      },
      submodels: submodels.map(sm => ({ type: "ModelReference", keys: [{ type: "Submodel", value: sm.id }] })),
    }],
    submodels,
  }
}

// ── HTTP ────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS })
  res.end(JSON.stringify(body))
}

function checkAuth(req) {
  const raw = req.headers.authorization
  if (!raw) return { valid: false, reason: "Missing Authorization header." }
  const token = raw.replace(/^Bearer\s+/i, "").trim()
  if (token === "demo") return { valid: true }
  const envToken = process.env.EQUIPMENT_TOKEN
  if (!envToken || token === envToken) return { valid: true }
  return { valid: false, reason: "Invalid token." }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS)
    return res.end()
  }
  const url = new URL(req.url, `http://${req.headers.host}`)
  const parts = url.pathname.split("/").filter(Boolean)

  // índice
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "fleet")) {
    return send(res, 200, {
      plant: "plant1",
      scale: SCALE,
      count: EQUIPMENT.size,
      equipment: Array.from(EQUIPMENT.values()).map(eq => ({
        id: eq.id,
        name: eq.name,
        equipmentType: eq.equipmentType,
        eclassClass: eq.eclassClass,
        baseUrl: `/eq/${eq.id}`,
        endpoints: [`/eq/${eq.id}/api/data`, `/eq/${eq.id}/api/aas`],
      })),
    })
  }

  // /eq/{id}/api/{data|aas}
  if (parts[0] === "eq" && parts[2] === "api" && parts.length === 4) {
    const eq = EQUIPMENT.get(parts[1])
    if (!eq) return send(res, 404, { error: `Unknown equipment: ${parts[1]}` })

    const auth = checkAuth(req)
    if (!auth.valid) return send(res, 401, { error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" })

    if (parts[3] === "data") return send(res, 200, buildData(eq))
    if (parts[3] === "aas") return send(res, 200, buildAas(eq, url.searchParams.get("submodel")))
  }

  return send(res, 404, { error: "Not found. Use / for index or /eq/{id}/api/{data|aas}" })
})

server.listen(PORT, () => {
  console.log(`[fleet] plant1 — ${EQUIPMENT.size} CPS (scale ${SCALE}) em http://localhost:${PORT}`)
  for (const eq of EQUIPMENT.values()) console.log(`  - ${eq.id.padEnd(16)} ${eq.name}`)
})
