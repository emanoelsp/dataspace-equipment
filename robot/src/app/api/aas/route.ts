import { NextRequest, NextResponse } from "next/server"
import {
  validateAccessToken, buildNameplateSubmodel,
  sineOscillation, noisyValue, round, clamp, nowIso,
  prop, collection, extRef,
  type AASEnvironment, type Submodel,
} from "@/lib/equipment-aas"

const ASSET_ID = "urn:dataspace:plant1:equipment:robot:welding:001"
const GLOBAL_ASSET_ID = "urn:dataspace:plant1:asset:robot:001"

function buildTechnicalData(): Submodel {
  return {
    id: `${ASSET_ID}:TechnicalData`, idShort: "TechnicalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2"),
    description: [{ language: "pt", text: "Dados técnicos do robô industrial" }],
    submodelElements: [
      collection("GeneralInformation", [
        prop("ManufacturerName", "xs:string", "KUKA AG", "0173-1#02-AAO677#002"),
        prop("ManufacturerProductFamily", "xs:string", "KR QUANTEC Series"),
        prop("EclassClassification", "xs:string", "27-01-04-01", "0173-1#02-AAO041#003"),
        prop("EclassIrdi", "xs:string", "0173-1#01-AKJ975#001"),
        prop("RobotType", "xs:string", "Articulated (6-axis)"),
        prop("Application", "xs:string", "Spot welding / Part handling"),
      ]),
      collection("KinematicsCapabilities", [
        prop("NumberOfAxes", "xs:int", 6),
        prop("PayloadMax_kg", "xs:float", 210, "0173-1#02-AAV212#001"),
        prop("Reach_mm", "xs:int", 2700),
        prop("RepeatabilityPosition_mm", "xs:float", 0.05),
        prop("Axis1Range_deg", "xs:string", "±185"),
        prop("Axis2Range_deg", "xs:string", "+45/−130"),
        prop("Axis3Range_deg", "xs:string", "+156/−120"),
        prop("Axis4Range_deg", "xs:string", "±350"),
        prop("Axis5Range_deg", "xs:string", "±125"),
        prop("Axis6Range_deg", "xs:string", "±350"),
      ]),
      collection("PerformanceData", [
        prop("MaxTCPSpeed_m_s", "xs:float", 2.0),
        prop("MaxTCPForce_N", "xs:float", 2100),
      ]),
      collection("WeldingToolData", [
        prop("WeldingGunType", "xs:string", "X-type servo gun"),
        prop("WeldingForceMax_kN", "xs:float", 6.0),
        prop("WeldingCurrentMax_kA", "xs:float", 20.0),
        prop("ElectrodeType", "xs:string", "Cu-Cr-Zr cap electrode"),
      ]),
    ],
  }
}

function buildOperationalData(): Submodel {
  const t = Date.now()
  const stateRnd = (Math.sin(t / 150000) + 1) / 2
  const operationMode = stateRnd > 0.35 ? "automatic" : stateRnd > 0.1 ? "idle" : stateRnd > 0.02 ? "t1" : "error"
  const isRunning = operationMode === "automatic"

  const j1 = isRunning ? round(sineOscillation(45, 80, 12000, 0.0), 2) : round(noisyValue(0, 0.5), 2)
  const j2 = isRunning ? round(sineOscillation(-30, 40, 14000, 0.8), 2) : round(noisyValue(-20, 0.5), 2)
  const j3 = isRunning ? round(sineOscillation(90, 30, 11000, 1.6), 2) : round(noisyValue(90, 0.5), 2)
  const j4 = isRunning ? round(sineOscillation(0, 60, 9000, 2.4), 2) : round(noisyValue(0, 0.5), 2)
  const j5 = isRunning ? round(sineOscillation(-45, 35, 10000, 3.1), 2) : round(noisyValue(-10, 0.3), 2)
  const j6 = isRunning ? round(sineOscillation(120, 90, 8000, 0.5), 2) : round(noisyValue(0, 0.5), 2)

  const tcpX = isRunning ? round(sineOscillation(1200, 450, 12000, 0.0) + noisyValue(0, 5), 1) : 0
  const tcpY = isRunning ? round(sineOscillation(300, 200, 14000, 1.5) + noisyValue(0, 5), 1) : 0
  const tcpZ = isRunning ? round(sineOscillation(800, 350, 11000, 0.7) + noisyValue(0, 5), 1) : 1200

  return {
    id: `${ASSET_ID}:OperationalData`, idShort: "OperationalData",
    modelType: "Submodel", kind: "Instance",
    semanticId: extRef("urn:dataspace:submodel:OperationalData:1:0"),
    description: [{ language: "pt", text: "Dados operacionais em tempo real" }],
    submodelElements: [
      collection("RobotStatus", [
        prop("OperationMode", "xs:string", operationMode),
        prop("Timestamp", "xs:dateTime", nowIso()),
        prop("ActiveProgram", "xs:string", isRunning ? ["SPOT_WELD_SIDE_PANEL_L", "SPOT_WELD_SIDE_PANEL_R", "HANDLING_DOOR_INNER"][Math.floor(((Math.sin(t / 720000) + 1) / 2) * 3)] : "NONE"),
        prop("SpeedOverride_pct", "xs:int", isRunning ? round(clamp(noisyValue(85, 5), 60, 100), 0) : 0),
        prop("CycleTime_s", "xs:float", isRunning ? round(clamp(noisyValue(18, 2), 12, 35), 1) : 0),
        prop("TotalCycles", "xs:long", Math.floor(t / 1000 / 20) % 100000),
        prop("ErrorCode", "xs:int", operationMode === "error" ? 4120 : 0),
        prop("ErrorMessage", "xs:string", operationMode === "error" ? "Electrode cap wear limit exceeded" : ""),
      ]),
      collection("JointAngles_deg", [
        prop("J1_deg", "xs:double", j1), prop("J2_deg", "xs:double", j2),
        prop("J3_deg", "xs:double", j3), prop("J4_deg", "xs:double", j4),
        prop("J5_deg", "xs:double", j5), prop("J6_deg", "xs:double", j6),
      ]),
      collection("TCPPosition", [
        prop("X_mm", "xs:double", tcpX), prop("Y_mm", "xs:double", tcpY), prop("Z_mm", "xs:double", tcpZ),
        prop("Payload_kg", "xs:float", isRunning ? round(noisyValue(180, 8), 1) : 0),
      ]),
      collection("WeldingProcess", [
        prop("WeldSpotsThisCycle", "xs:int", isRunning ? clamp(Math.floor(noisyValue(24, 2)), 18, 32) : 0),
        prop("WeldCurrent_kA", "xs:float", isRunning ? round(clamp(noisyValue(14.5, 1.5), 10, 20), 1) : 0),
        prop("WeldForce_kN", "xs:float", isRunning ? round(clamp(noisyValue(4.8, 0.4), 3.0, 6.0), 2) : 0),
      ]),
      collection("Diagnostics", [
        prop("Motor1Temp_C", "xs:float", round(clamp(sineOscillation(68, 8, 120000, 0.0) + noisyValue(0, 1), 40, 90), 1)),
        prop("Motor2Temp_C", "xs:float", round(clamp(sineOscillation(72, 6, 110000, 1.0) + noisyValue(0, 1), 40, 90), 1)),
        prop("ElectrodeWear_pct", "xs:float", round(clamp(noisyValue(42, 5), 0, 100), 0)),
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
    manufacturerName: "KUKA AG",
    manufacturerProductDesignation: "KR 210 R2700 prime — 6-axis Articulated Robot",
    serialNumber: "KUKR-2024-BRA-0018",
    yearOfConstruction: "2023",
    orderCode: "KR210-R2700-PRIME-SW-49",
    countryOfOrigin: "DE",
  })

  const shell: AASEnvironment = {
    assetAdministrationShells: [{
      id: ASSET_ID, idShort: "Robot_SpotWelding_001",
      modelType: "AssetAdministrationShell",
      description: [{ language: "pt", text: "Robô industrial 6 eixos — Soldagem a ponto e manuseio de peças" }],
      assetInformation: {
        assetKind: "Instance", globalAssetId: GLOBAL_ASSET_ID,
        specificAssetIds: [
          { name: "SerialNumber", value: "KUKR-2024-BRA-0018" },
          { name: "PlantSection", value: "Soldagem-CelulaCar1" },
          { name: "EclassIrdi", value: "0173-1#01-AKJ975#001" },
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
    headers: { "Cache-Control": "no-store", "X-Asset-Id": ASSET_ID, "X-Eclass-Irdi": "0173-1#01-AKJ975#001" },
  })
}
