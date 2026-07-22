import { NextRequest, NextResponse } from "next/server"
import {
  validateAccessToken, buildNameplateSubmodel,
  sineOscillation, noisyValue, round, clamp, nowIso,
  prop, collection, extRef,
  type AASEnvironment, type Submodel,
} from "@/lib/equipment-aas"

const ASSET_ID = "urn:dataspace:plant1:equipment:cnc:machiningcenter:001"
const GLOBAL_ASSET_ID = "urn:dataspace:plant1:asset:cnc:001"

function buildTechnicalData(): Submodel {
  return {
    id: `${ASSET_ID}:TechnicalData`, idShort: "TechnicalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2"),
    description: [{ language: "pt", text: "Dados técnicos do centro de usinagem" }],
    submodelElements: [
      collection("GeneralInformation", [
        prop("ManufacturerName", "xs:string", "DMG MORI AG", "0173-1#02-AAO677#002"),
        prop("ManufacturerProductFamily", "xs:string", "NHX Series"),
        prop("ManufacturerArticleNumber", "xs:string", "NHX4000-2ND-II"),
        prop("EclassClassification", "xs:string", "27-01-02-16", "0173-1#02-AAO041#003"),
        prop("EclassIrdi", "xs:string", "0173-1#01-ACJ843#001"),
      ]),
      collection("SpindleCapabilities", [
        prop("SpindleMaxSpeed_rpm", "xs:int", 12000, "0173-1#02-AAV232#001"),
        prop("SpindleMotorPower_kW", "xs:float", 22, "0173-1#02-AAV216#001"),
        prop("SpindleTorqueMax_Nm", "xs:float", 281, "0173-1#02-AAV217#001"),
        prop("SpindleTaper", "xs:string", "HSK-A63"),
      ]),
      collection("AxesCapabilities", [
        prop("AxisX_TravelRange_mm", "xs:float", 560),
        prop("AxisY_TravelRange_mm", "xs:float", 560),
        prop("AxisZ_TravelRange_mm", "xs:float", 560),
        prop("MaxFeedRate_mm_min", "xs:int", 50000, "0173-1#02-AAV233#001"),
      ]),
      collection("ToolMagazine", [
        prop("ToolCapacity", "xs:int", 40, "0173-1#02-ABF612#001"),
        prop("MaxToolDiameter_mm", "xs:float", 125),
        prop("ChipToChipTime_s", "xs:float", 3.8, "0173-1#02-AAV469#001"),
      ]),
      collection("CoolantSystem", [
        prop("CoolantType", "xs:string", "Emulsão 5%"),
        prop("CoolantPressureMax_bar", "xs:float", 80, "0173-1#02-BAC063#007"),
        prop("CoolantTankCapacity_L", "xs:float", 560),
      ]),
    ],
  }
}

function buildOperationalData(): Submodel {
  const t = Date.now()
  const stateRnd = (Math.sin(t / 120000) + 1) / 2
  const machineState = stateRnd > 0.3 ? "running" : stateRnd > 0.1 ? "idle" : stateRnd > 0.02 ? "maintenance" : "alarm"
  const isRunning = machineState === "running"

  const spindleSpeed = isRunning ? round(clamp(sineOscillation(7800, 600, 45000, 0.3) + noisyValue(0, 80), 0, 12000), 0) : 0
  const feedRate = isRunning ? round(clamp(sineOscillation(1800, 400, 30000, 1.1) + noisyValue(0, 50), 0, 5000), 0) : 0
  const spindleLoad = isRunning ? round(clamp(sineOscillation(55, 18, 35000, 0.7) + noisyValue(0, 3), 0, 100), 1) : 0
  const toolNumber = isRunning ? clamp(Math.floor(((Math.sin(t / 600000) + 1) / 2) * 40) + 1, 1, 40) : 0
  const axisX = isRunning ? round(sineOscillation(-280, 250, 55000, 0), 3) : round(noisyValue(-10, 0.5), 3)
  const axisY = isRunning ? round(sineOscillation(-180, 170, 42000, 1.0), 3) : round(noisyValue(-5, 0.3), 3)
  const axisZ = isRunning ? round(sineOscillation(-100, 90, 38000, 2.1), 3) : round(noisyValue(-2, 0.2), 3)
  const cuttingTemp = isRunning ? round(clamp(sineOscillation(65, 20, 25000, 0.5) + noisyValue(0, 2), 20, 150), 1) : round(noisyValue(22, 1), 1)
  const coolantPressure = isRunning ? round(clamp(noisyValue(65, 4), 50, 80), 1) : 0
  const cycleTime = isRunning ? round(clamp(noisyValue(82, 5), 45, 180), 1) : 0
  const programs = ["HOUSING_BODY_V4.NC", "BRACKET_REAR_V2.NC", "SHAFT_FLANGE_V7.NC", "COVER_PLATE_V1.NC"]
  const currentProgram = isRunning ? programs[Math.floor(((Math.sin(t / 900000) + 1) / 2) * programs.length)] : "NONE"
  const partsProduced = Math.floor((t / 1000 / 90) % 10000)

  return {
    id: `${ASSET_ID}:OperationalData`, idShort: "OperationalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("urn:dataspace:submodel:OperationalData:1:0"),
    description: [{ language: "pt", text: "Dados operacionais em tempo real" }],
    submodelElements: [
      collection("MachineStatus", [
        prop("MachineState", "xs:string", machineState),
        prop("Timestamp", "xs:dateTime", nowIso()),
        prop("ActiveProgram", "xs:string", currentProgram),
        prop("ActiveToolNumber", "xs:int", toolNumber),
        prop("CycleTime_s", "xs:float", cycleTime),
        prop("PartsProducedShift", "xs:long", partsProduced),
        prop("ErrorCode", "xs:int", machineState === "alarm" ? 2071 : 0),
        prop("ErrorMessage", "xs:string", machineState === "alarm" ? "Thermal overload protection triggered" : ""),
      ]),
      collection("SpindleData", [
        prop("SpindleSpeed_rpm", "xs:int", spindleSpeed, "0173-1#02-AAV232#001"),
        prop("SpindleLoad_pct", "xs:float", spindleLoad),
        prop("CuttingTemperature_C", "xs:float", cuttingTemp),
      ]),
      collection("AxesPosition", [
        prop("AxisX_mm", "xs:double", axisX),
        prop("AxisY_mm", "xs:double", axisY),
        prop("AxisZ_mm", "xs:double", axisZ),
        prop("FeedRate_mm_min", "xs:int", feedRate, "0173-1#02-AAV233#001"),
      ]),
      collection("CoolantSystem", [
        prop("CoolantPressure_bar", "xs:float", coolantPressure),
        prop("CoolantActive", "xs:boolean", isRunning),
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
    manufacturerName: "DMG MORI AG",
    manufacturerProductDesignation: "NHX 4000 2nd Generation — Horizontal Machining Centre",
    serialNumber: "NH4G-2024-BRA-0042",
    yearOfConstruction: "2023",
    orderCode: "NHX4000-2ND-II-HSK63-40T",
    countryOfOrigin: "JP",
  })
  const technicalData = buildTechnicalData()
  const operationalData = buildOperationalData()

  const shell: AASEnvironment = {
    assetAdministrationShells: [{
      id: ASSET_ID, idShort: "CNC_MachiningCentre_001",
      modelType: "AssetAdministrationShell",
      description: [{ language: "pt", text: "Centro de usinagem CNC horizontal — Linha de usinagem de precisão" }],
      assetInformation: {
        assetKind: "Instance", globalAssetId: GLOBAL_ASSET_ID,
        specificAssetIds: [
          { name: "SerialNumber", value: "NH4G-2024-BRA-0042" },
          { name: "PlantSection", value: "Usinagem-Linha1" },
          { name: "EclassIrdi", value: "0173-1#01-ACJ843#001" },
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
      : sub === "TechnicalData" ? [technicalData]
      : sub === "OperationalData" ? [operationalData]
      : [nameplate, technicalData, operationalData],
  }

  return NextResponse.json(shell, {
    headers: {
      "Cache-Control": "no-store",
      "X-Asset-Id": ASSET_ID,
      "X-Eclass-Irdi": "0173-1#01-ACJ843#001",
    },
  })
}
