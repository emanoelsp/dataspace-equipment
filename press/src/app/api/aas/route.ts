import { NextRequest, NextResponse } from "next/server"
import {
  validateAccessToken, buildNameplateSubmodel,
  sineOscillation, noisyValue, round, clamp, nowIso,
  prop, collection, extRef,
  type AASEnvironment, type Submodel,
} from "@/lib/equipment-aas"

const ASSET_ID = "urn:dataspace:plant1:equipment:press:hydraulic:001"
const GLOBAL_ASSET_ID = "urn:dataspace:plant1:asset:press:001"

function buildTechnicalData(): Submodel {
  return {
    id: `${ASSET_ID}:TechnicalData`, idShort: "TechnicalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2"),
    description: [{ language: "pt", text: "Dados técnicos da prensa hidráulica" }],
    submodelElements: [
      collection("GeneralInformation", [
        prop("ManufacturerName", "xs:string", "Schuler AG", "0173-1#02-AAO677#002"),
        prop("ManufacturerProductFamily", "xs:string", "MSP Series"),
        prop("EclassClassification", "xs:string", "27-01-05-01", "0173-1#02-AAO041#003"),
        prop("EclassIrdi", "xs:string", "0173-1#01-ADN573#001"),
        prop("PressType", "xs:string", "Hydraulic cold-forming press"),
      ]),
      collection("ForceCapabilities", [
        prop("NominalForce_kN", "xs:float", 1600, "0173-1#02-BAD093#005"),
        prop("MaxForce_kN", "xs:float", 1760),
        prop("ReturnForce_kN", "xs:float", 400),
      ]),
      collection("StrokeGeometry", [
        prop("StrokeLength_mm", "xs:float", 400, "0173-1#02-BAD094#005"),
        prop("DieHeight_mm", "xs:string", "200–350"),
        prop("SlideArea_mm", "xs:string", "2000×1800"),
      ]),
      collection("StrokePerformance", [
        prop("StrokesPerMin_max", "xs:int", 12),
        prop("ApproachSpeed_mm_s", "xs:float", 400),
        prop("PressSpeed_mm_s", "xs:float", 30),
        prop("ReturnSpeed_mm_s", "xs:float", 350),
      ]),
      collection("HydraulicSystem", [
        prop("SystemPressureMax_bar", "xs:float", 315, "0173-1#02-BAC063#007"),
        prop("OilTankCapacity_L", "xs:float", 1200),
        prop("PumpCount", "xs:int", 2),
        prop("PumpMotorPower_kW", "xs:float", 90),
        prop("OilType", "xs:string", "HLP 46 hydraulic oil"),
      ]),
    ],
  }
}

function buildOperationalData(): Submodel {
  const t = Date.now()
  const cyclePeriodMs = 8000
  const phasePct = (t % cyclePeriodMs) / cyclePeriodMs
  const machineCycle = (Math.sin(t / 180000) + 1) / 2
  const isRunning = machineCycle > 0.25

  let machineState: string, strokePosition_mm: number, pressForce_kN: number
  let hydraulicPressure_bar: number, strokeSpeed_mm_s: number

  if (!isRunning) {
    machineState = phasePct < 0.05 ? "maintenance" : "idle"
    strokePosition_mm = round(noisyValue(2, 0.5), 1)
    pressForce_kN = 0
    hydraulicPressure_bar = round(noisyValue(25, 2), 1)
    strokeSpeed_mm_s = 0
  } else if (phasePct < 0.15) {
    machineState = "approach"
    strokePosition_mm = round(clamp(phasePct / 0.15 * 340, 0, 340), 1)
    pressForce_kN = round(noisyValue(20, 5), 1)
    hydraulicPressure_bar = round(clamp(noisyValue(180, 10), 150, 210), 1)
    strokeSpeed_mm_s = round(clamp(noisyValue(380, 20), 300, 420), 0)
  } else if (phasePct < 0.35) {
    const p = (phasePct - 0.15) / 0.20
    machineState = "pressing"
    strokePosition_mm = round(clamp(340 + p * 58, 340, 398), 1)
    pressForce_kN = round(clamp(20 + p * 1560, 0, 1600), 0)
    hydraulicPressure_bar = round(clamp(180 + p * 130, 180, 312), 1)
    strokeSpeed_mm_s = round(clamp(30 - p * 28, 2, 30), 1)
  } else if (phasePct < 0.5) {
    machineState = "hold"
    strokePosition_mm = round(clamp(noisyValue(398, 0.3), 395, 400), 2)
    pressForce_kN = round(clamp(noisyValue(1580, 20), 1500, 1620), 0)
    hydraulicPressure_bar = round(clamp(noisyValue(308, 4), 295, 315), 1)
    strokeSpeed_mm_s = 0
  } else if (phasePct < 0.7) {
    const p = (phasePct - 0.5) / 0.20
    machineState = "return"
    strokePosition_mm = round(clamp(398 - p * 396, 2, 398), 1)
    pressForce_kN = round(clamp(noisyValue(200, 30), 100, 400), 0)
    hydraulicPressure_bar = round(clamp(noisyValue(100, 15), 60, 140), 1)
    strokeSpeed_mm_s = -round(clamp(noisyValue(340, 20), 280, 380), 0)
  } else {
    machineState = "part-exchange"
    strokePosition_mm = round(noisyValue(2, 0.5), 1)
    pressForce_kN = 0
    hydraulicPressure_bar = round(noisyValue(28, 3), 1)
    strokeSpeed_mm_s = 0
  }

  const oilTemperature = round(clamp(sineOscillation(48, 8, 3600000, 0) + noisyValue(0, 1), 35, 70), 1)
  const cycleCount = Math.floor(t / 1000 / 8) % 1000000
  const programs = ["BRACKET_DEEP_DRAW_T1", "PANEL_SIDE_FORM_T2", "COVER_STAMP_TRIM_T3"]
  const currentProgram = isRunning ? programs[Math.floor(((Math.sin(t / 600000) + 1) / 2) * programs.length)] : "NONE"

  return {
    id: `${ASSET_ID}:OperationalData`, idShort: "OperationalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("urn:dataspace:submodel:OperationalData:1:0"),
    description: [{ language: "pt", text: "Dados operacionais em tempo real" }],
    submodelElements: [
      collection("PressStatus", [
        prop("MachineState", "xs:string", machineState),
        prop("Timestamp", "xs:dateTime", nowIso()),
        prop("ActiveProgram", "xs:string", currentProgram),
        prop("CycleCount", "xs:long", cycleCount),
        prop("SafetyDoorOpen", "xs:boolean", machineState === "maintenance"),
        prop("LightCurtainOk", "xs:boolean", machineState !== "maintenance"),
        prop("PartPresent", "xs:boolean", machineState === "part-exchange" || machineState === "idle"),
      ]),
      collection("SlideData", [
        prop("StrokePosition_mm", "xs:float", strokePosition_mm, "0173-1#02-BAD094#005"),
        prop("StrokeSpeed_mm_s", "xs:float", strokeSpeed_mm_s),
        prop("PressForce_kN", "xs:float", pressForce_kN, "0173-1#02-BAD093#005"),
      ]),
      collection("HydraulicSystem", [
        prop("MainPressure_bar", "xs:float", hydraulicPressure_bar, "0173-1#02-BAC063#007"),
        prop("OilTemperature_C", "xs:float", oilTemperature, "0173-1#02-BAC120#008"),
        prop("Pump1Speed_rpm", "xs:int", isRunning ? round(clamp(noisyValue(1445, 10), 1400, 1460), 0) : 0),
        prop("FilterAlarm", "xs:boolean", false),
      ]),
      collection("ProductionMetrics", [
        prop("StrokesPerMinActual", "xs:float", isRunning ? round(60 / (cyclePeriodMs / 1000), 1) : 0),
        prop("UpTime_pct", "xs:float", round(clamp(noisyValue(87, 3), 70, 99), 1)),
        prop("ScrapCount", "xs:int", Math.floor(cycleCount * 0.005)),
      ]),
    ],
  }
}

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }

  const sub = request.nextUrl.searchParams.get("submodel")
  const nameplate = buildNameplateSubmodel(ASSET_ID, {
    manufacturerName: "Schuler AG",
    manufacturerProductDesignation: "MSP 160 — Multi-station Hydraulic Press",
    serialNumber: "SCH-MSP160-2024-BRA-0007",
    yearOfConstruction: "2024",
    orderCode: "MSP160-4000-CNC-HYD315",
    countryOfOrigin: "DE",
  })

  const shell: AASEnvironment = {
    assetAdministrationShells: [{
      id: ASSET_ID, idShort: "Press_Hydraulic_001",
      modelType: "AssetAdministrationShell",
      description: [{ language: "pt", text: "Prensa hidráulica de conformação — Linha de estampagem de chapas" }],
      assetInformation: {
        assetKind: "Instance", globalAssetId: GLOBAL_ASSET_ID,
        specificAssetIds: [
          { name: "SerialNumber", value: "SCH-MSP160-2024-BRA-0007" },
          { name: "PlantSection", value: "Estampagem-Linha2" },
          { name: "EclassIrdi", value: "0173-1#01-ADN573#001" },
        ],
      },
      submodels: [
        { type: "ModelReference", keys: [{ type: "Submodel", value: `${ASSET_ID}:Nameplate` }] },
        { type: "ModelReference", keys: [{ type: "Submodel", value: `${ASSET_ID}:TechnicalData` }] },
        { type: "ModelReference", keys: [{ type: "Submodel", value: `${ASSET_ID}:OperationalData` }] },
      ],
    }],
    submodels:
      sub === "Nameplate" ? [nameplate]
      : sub === "TechnicalData" ? [buildTechnicalData()]
      : sub === "OperationalData" ? [buildOperationalData()]
      : [nameplate, buildTechnicalData(), buildOperationalData()],
  }

  return NextResponse.json(shell, {
    headers: { "Cache-Control": "no-store", "X-Asset-Id": ASSET_ID, "X-Eclass-Irdi": "0173-1#01-ADN573#001" },
  })
}
