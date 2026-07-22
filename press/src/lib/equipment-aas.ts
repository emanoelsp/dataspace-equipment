// AAS utilities — IDTA-01001-3-0 + ECLASS. Standalone (sem Firebase).

export type ModelingKind = "Instance" | "Template"
export type AssetKind = "Instance" | "Type"
export type ValueType = "xs:string" | "xs:int" | "xs:float" | "xs:double" | "xs:boolean" | "xs:dateTime" | "xs:long"

export interface LangStringSet { language: string; text: string }
export interface Reference { type: "ExternalReference" | "ModelReference"; keys: Array<{ type: string; value: string }> }

export interface SubmodelElement {
  idShort: string; modelType: string; semanticId?: Reference
  description?: LangStringSet[]; valueType?: ValueType; value?: unknown
  submodelElements?: SubmodelElement[]
}

export interface Submodel {
  id: string; idShort: string; modelType: "Submodel"; kind: ModelingKind
  semanticId?: Reference; description?: LangStringSet[]; submodelElements: SubmodelElement[]
}

export interface AssetAdministrationShell {
  id: string; idShort: string; modelType: "AssetAdministrationShell"
  description?: LangStringSet[]
  assetInformation: { assetKind: AssetKind; globalAssetId: string; specificAssetIds?: Array<{ name: string; value: string }> }
  submodels: Reference[]
}

export interface AASEnvironment {
  assetAdministrationShells: AssetAdministrationShell[]
  submodels: Submodel[]
}

export function extRef(value: string): Reference {
  return { type: "ExternalReference", keys: [{ type: "GlobalReference", value }] }
}

export function prop(idShort: string, valueType: ValueType, value: unknown, semanticIrdi?: string, descPt?: string): SubmodelElement {
  return {
    idShort, modelType: "Property", valueType, value,
    ...(semanticIrdi ? { semanticId: extRef(semanticIrdi) } : {}),
    ...(descPt ? { description: [{ language: "pt", text: descPt }, { language: "en", text: descPt }] } : {}),
  }
}

export function collection(idShort: string, elements: SubmodelElement[], semanticIrdi?: string): SubmodelElement {
  return {
    idShort, modelType: "SubmodelElementCollection",
    ...(semanticIrdi ? { semanticId: extRef(semanticIrdi) } : {}),
    submodelElements: elements,
  }
}

export function mlProp(idShort: string, values: LangStringSet[], semanticIrdi?: string): SubmodelElement {
  return {
    idShort, modelType: "MultiLanguageProperty", value: values,
    ...(semanticIrdi ? { semanticId: extRef(semanticIrdi) } : {}),
  }
}

export function sineOscillation(base: number, amplitude: number, periodMs: number, phaseRad = 0): number {
  return base + amplitude * Math.sin((2 * Math.PI * Date.now()) / periodMs + phaseRad)
}

export function noisyValue(center: number, noiseRange: number): number {
  return center + (Math.random() - 0.5) * 2 * noiseRange
}

export function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function nowIso(): string { return new Date().toISOString() }

export interface TokenValidationResult { valid: boolean; reason?: string }

export function validateAccessToken(rawToken: string | null): TokenValidationResult {
  if (!rawToken) return { valid: false, reason: "Missing Authorization header." }
  const token = rawToken.replace(/^Bearer\s+/i, "").trim()
  if (token === "demo") return { valid: true }
  const envToken = process.env.EQUIPMENT_TOKEN
  if (!envToken) return { valid: true }
  if (token === envToken) return { valid: true }
  return { valid: false, reason: "Invalid token." }
}

export function buildNameplateSubmodel(id: string, data: {
  manufacturerName: string; manufacturerProductDesignation: string; serialNumber: string
  yearOfConstruction: string; orderCode: string; countryOfOrigin?: string
}): Submodel {
  return {
    id: `${id}:Nameplate`, idShort: "Nameplate", modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/zvei/nameplate/2/0/Nameplate"),
    description: [{ language: "pt", text: "Placa de identificação do ativo" }, { language: "en", text: "Asset nameplate" }],
    submodelElements: [
      mlProp("ManufacturerName", [{ language: "pt", text: data.manufacturerName }, { language: "en", text: data.manufacturerName }], "0173-1#02-AAO677#002"),
      mlProp("ManufacturerProductDesignation", [{ language: "pt", text: data.manufacturerProductDesignation }, { language: "en", text: data.manufacturerProductDesignation }], "0173-1#02-AAW338#001"),
      prop("SerialNumber", "xs:string", data.serialNumber, "0173-1#02-AAM556#002", "Número de série"),
      prop("YearOfConstruction", "xs:string", data.yearOfConstruction, "0173-1#02-AAP906#001", "Ano de fabricação"),
      prop("OrderCodeOfManufacturer", "xs:string", data.orderCode, "0173-1#02-AAO227#002", "Código de pedido"),
      prop("CountryOfOrigin", "xs:string", data.countryOfOrigin ?? "DE", "0173-1#02-AAO259#004", "País de origem"),
    ],
  }
}
