import { NextRequest, NextResponse } from "next/server"
import { validateAccessToken, sineOscillation, noisyValue, round, clamp, nowIso } from "@/lib/equipment-aas"

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }

  const t = Date.now()
  const stateRnd = (Math.sin(t / 120000) + 1) / 2
  const state = stateRnd > 0.3 ? "running" : stateRnd > 0.1 ? "idle" : stateRnd > 0.02 ? "maintenance" : "alarm"
  const isRunning = state === "running"

  const spindleSpeed_rpm = isRunning ? round(clamp(sineOscillation(7800, 600, 45000, 0.3) + noisyValue(0, 80), 0, 12000), 0) : 0
  const feedRate_mm_min = isRunning ? round(clamp(sineOscillation(1800, 400, 30000, 1.1) + noisyValue(0, 50), 0, 5000), 0) : 0
  const spindleLoad_pct = isRunning ? round(clamp(sineOscillation(55, 18, 35000, 0.7) + noisyValue(0, 3), 0, 100), 1) : 0
  const activeToolNumber = isRunning ? clamp(Math.floor(((Math.sin(t / 600000) + 1) / 2) * 40) + 1, 1, 40) : 0
  const axisX_mm = isRunning ? round(sineOscillation(-280, 250, 55000, 0), 3) : round(noisyValue(-10, 0.5), 3)
  const axisY_mm = isRunning ? round(sineOscillation(-180, 170, 42000, 1.0), 3) : round(noisyValue(-5, 0.3), 3)
  const axisZ_mm = isRunning ? round(sineOscillation(-100, 90, 38000, 2.1), 3) : round(noisyValue(-2, 0.2), 3)
  const cuttingTemp_C = isRunning ? round(clamp(sineOscillation(65, 20, 25000, 0.5) + noisyValue(0, 2), 20, 150), 1) : round(noisyValue(22, 1), 1)
  const coolantPressure_bar = isRunning ? round(clamp(noisyValue(65, 4), 50, 80), 1) : 0
  const cycleTime_s = isRunning ? round(clamp(noisyValue(82, 5), 45, 180), 1) : 0
  const programs = ["HOUSING_BODY_V4.NC", "BRACKET_REAR_V2.NC", "SHAFT_FLANGE_V7.NC", "COVER_PLATE_V1.NC"]
  const activeProgram = isRunning ? programs[Math.floor(((Math.sin(t / 900000) + 1) / 2) * programs.length)] : "NONE"
  const partsProducedShift = Math.floor((t / 1000 / 90) % 10000)

  return NextResponse.json({
    equipmentId: "urn:dataspace:plant1:equipment:cnc:machiningcenter:001",
    equipmentType: "CNC",
    eclassIrdi: "0173-1#01-ACJ843#001",
    eclassClass: "27-01-02-16",
    timestamp: nowIso(),
    state,
    metrics: {
      spindleSpeed_rpm,
      spindleLoad_pct,
      feedRate_mm_min,
      cuttingTemp_C,
      coolantPressure_bar,
      axisX_mm,
      axisY_mm,
      axisZ_mm,
      cycleTime_s,
      partsProducedShift,
      activeProgram,
      activeToolNumber,
      errorCode: state === "alarm" ? 2071 : 0,
      errorMessage: state === "alarm" ? "Thermal overload protection triggered" : "",
    },
  }, { headers: { "Cache-Control": "no-store" } })
}
