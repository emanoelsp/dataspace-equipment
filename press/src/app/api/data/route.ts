import { NextRequest, NextResponse } from "next/server"
import { validateAccessToken, sineOscillation, noisyValue, round, clamp, nowIso } from "@/lib/equipment-aas"

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }

  const t = Date.now()
  const cyclePeriodMs = 8000
  const phasePct = (t % cyclePeriodMs) / cyclePeriodMs
  const machineCycle = (Math.sin(t / 180000) + 1) / 2
  const isRunning = machineCycle > 0.25

  let state: string, strokePosition_mm: number, pressForce_kN: number
  let hydraulicPressure_bar: number, strokeSpeed_mm_s: number

  if (!isRunning) {
    state = phasePct < 0.05 ? "maintenance" : "idle"
    strokePosition_mm = round(noisyValue(2, 0.5), 1)
    pressForce_kN = 0
    hydraulicPressure_bar = round(noisyValue(25, 2), 1)
    strokeSpeed_mm_s = 0
  } else if (phasePct < 0.15) {
    state = "approach"
    strokePosition_mm = round(clamp((phasePct / 0.15) * 340, 0, 340), 1)
    pressForce_kN = round(noisyValue(20, 5), 1)
    hydraulicPressure_bar = round(clamp(noisyValue(180, 10), 150, 210), 1)
    strokeSpeed_mm_s = round(clamp(noisyValue(380, 20), 300, 420), 0)
  } else if (phasePct < 0.35) {
    const p = (phasePct - 0.15) / 0.20
    state = "pressing"
    strokePosition_mm = round(clamp(340 + p * 58, 340, 398), 1)
    pressForce_kN = round(clamp(20 + p * 1560, 0, 1600), 0)
    hydraulicPressure_bar = round(clamp(180 + p * 130, 180, 312), 1)
    strokeSpeed_mm_s = round(clamp(30 - p * 28, 2, 30), 1)
  } else if (phasePct < 0.5) {
    state = "hold"
    strokePosition_mm = round(clamp(noisyValue(398, 0.3), 395, 400), 2)
    pressForce_kN = round(clamp(noisyValue(1580, 20), 1500, 1620), 0)
    hydraulicPressure_bar = round(clamp(noisyValue(308, 4), 295, 315), 1)
    strokeSpeed_mm_s = 0
  } else if (phasePct < 0.7) {
    const p = (phasePct - 0.5) / 0.20
    state = "return"
    strokePosition_mm = round(clamp(398 - p * 396, 2, 398), 1)
    pressForce_kN = round(clamp(noisyValue(200, 30), 100, 400), 0)
    hydraulicPressure_bar = round(clamp(noisyValue(100, 15), 60, 140), 1)
    strokeSpeed_mm_s = -round(clamp(noisyValue(340, 20), 280, 380), 0)
  } else {
    state = "part-exchange"
    strokePosition_mm = round(noisyValue(2, 0.5), 1)
    pressForce_kN = 0
    hydraulicPressure_bar = round(noisyValue(28, 3), 1)
    strokeSpeed_mm_s = 0
  }

  return NextResponse.json({
    equipmentId: "urn:dataspace:plant1:equipment:press:hydraulic:001",
    equipmentType: "Press",
    eclassIrdi: "0173-1#01-ADN573#001",
    eclassClass: "27-01-05-01",
    timestamp: nowIso(),
    state,
    metrics: {
      strokePosition_mm,
      strokePositionPct: round((strokePosition_mm / 400) * 100, 1),
      strokeSpeed_mm_s,
      pressForce_kN,
      pressForceUtilization_pct: round((pressForce_kN / 1600) * 100, 1),
      hydraulicPressure_bar,
      oilTemperature_C: round(clamp(sineOscillation(48, 8, 3600000, 0) + noisyValue(0, 1), 35, 70), 1),
      pump1Speed_rpm: isRunning ? round(clamp(noisyValue(1445, 10), 1400, 1460), 0) : 0,
      pump2Speed_rpm: isRunning && state === "pressing" ? round(clamp(noisyValue(1445, 10), 1400, 1460), 0) : 0,
      cycleCount: Math.floor(t / 1000 / 8) % 1000000,
      strokesPerMinActual: isRunning ? round(60 / (cyclePeriodMs / 1000), 1) : 0,
      upTime_pct: round(clamp(noisyValue(87, 3), 70, 99), 1),
      safetyDoorOpen: state === "maintenance",
      lightCurtainOk: state !== "maintenance",
      partPresent: state === "part-exchange" || state === "idle",
      activeProgram: isRunning ? ["BRACKET_DEEP_DRAW_T1", "PANEL_SIDE_FORM_T2", "COVER_STAMP_TRIM_T3"][Math.floor(((Math.sin(t / 600000) + 1) / 2) * 3)] : "NONE",
      filterDifferentialPressure_bar: round(clamp(sineOscillation(1.8, 0.8, 7200000, 0) + noisyValue(0, 0.1), 0, 8), 2),
      filterAlarm: false,
    },
  }, { headers: { "Cache-Control": "no-store" } })
}
