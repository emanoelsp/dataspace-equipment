// Motor de simulação declarativo — idêntico em todas as apps geradas.
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
      return `${g.prefix ?? "LOT"}-${String(Math.floor(t / (g.period ?? 3600000)) % 10000).padStart(4, "0")}`
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
    id: `${eq.urn}:TechnicalData`, idShort: "TechnicalData", modelType: "Submodel", kind: "Instance",
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
    `urn:dataspace:plant1:semantic:${eq.equipmentType.toLowerCase()}:${m.key}`,
  ))
  return {
    id: `${eq.urn}:OperationalData`, idShort: "OperationalData", modelType: "Submodel", kind: "Instance",
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
      id: `${eq.urn}:aas`,
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
