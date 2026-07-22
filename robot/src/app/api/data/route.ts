import { NextRequest, NextResponse } from "next/server"
import { validateAccessToken, sineOscillation, noisyValue, round, clamp, nowIso } from "@/lib/equipment-aas"

export async function GET(request: NextRequest) {
  const auth = validateAccessToken(request.headers.get("authorization"))
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, hint: "Bearer demo" }, { status: 401 })
  }

  const t = Date.now()
  const stateRnd = (Math.sin(t / 150000) + 1) / 2
  const state = stateRnd > 0.35 ? "automatic" : stateRnd > 0.1 ? "idle" : stateRnd > 0.02 ? "t1" : "error"
  const isRunning = state === "automatic"

  return NextResponse.json({
    equipmentId: "urn:dataspace:plant1:equipment:robot:welding:001",
    equipmentType: "Robot",
    eclassIrdi: "0173-1#01-AKJ975#001",
    eclassClass: "27-01-04-01",
    timestamp: nowIso(),
    state,
    metrics: {
      j1_deg: isRunning ? round(sineOscillation(45, 80, 12000, 0.0), 2) : round(noisyValue(0, 0.5), 2),
      j2_deg: isRunning ? round(sineOscillation(-30, 40, 14000, 0.8), 2) : round(noisyValue(-20, 0.5), 2),
      j3_deg: isRunning ? round(sineOscillation(90, 30, 11000, 1.6), 2) : round(noisyValue(90, 0.5), 2),
      j4_deg: isRunning ? round(sineOscillation(0, 60, 9000, 2.4), 2) : round(noisyValue(0, 0.5), 2),
      j5_deg: isRunning ? round(sineOscillation(-45, 35, 10000, 3.1), 2) : round(noisyValue(-10, 0.3), 2),
      j6_deg: isRunning ? round(sineOscillation(120, 90, 8000, 0.5), 2) : round(noisyValue(0, 0.5), 2),
      tcpX_mm: isRunning ? round(sineOscillation(1200, 450, 12000, 0.0) + noisyValue(0, 5), 1) : 0,
      tcpY_mm: isRunning ? round(sineOscillation(300, 200, 14000, 1.5) + noisyValue(0, 5), 1) : 0,
      tcpZ_mm: isRunning ? round(sineOscillation(800, 350, 11000, 0.7) + noisyValue(0, 5), 1) : 1200,
      tcpRx_deg: isRunning ? round(sineOscillation(0, 30, 12000, 2.1) + noisyValue(0, 1), 2) : 0,
      tcpRy_deg: isRunning ? round(sineOscillation(90, 20, 10000, 1.0) + noisyValue(0, 1), 2) : 0,
      tcpRz_deg: isRunning ? round(sineOscillation(45, 40, 8000, 3.0) + noisyValue(0, 1), 2) : 0,
      speedOverride_pct: isRunning ? round(clamp(noisyValue(85, 5), 60, 100), 0) : 0,
      cycleTime_s: isRunning ? round(clamp(noisyValue(18, 2), 12, 35), 1) : 0,
      totalCycles: Math.floor(t / 1000 / 20) % 100000,
      payload_kg: isRunning ? round(noisyValue(180, 8), 1) : 0,
      weldCurrent_kA: isRunning ? round(clamp(noisyValue(14.5, 1.5), 10, 20), 1) : 0,
      weldForce_kN: isRunning ? round(clamp(noisyValue(4.8, 0.4), 3.0, 6.0), 2) : 0,
      weldSpotsThisCycle: isRunning ? clamp(Math.floor(noisyValue(24, 2)), 18, 32) : 0,
      motor1Temp_C: round(clamp(sineOscillation(68, 8, 120000, 0.0) + noisyValue(0, 1), 40, 90), 1),
      motor2Temp_C: round(clamp(sineOscillation(72, 6, 110000, 1.0) + noisyValue(0, 1), 40, 90), 1),
      electrodeWear_pct: round(clamp(noisyValue(42, 5), 0, 100), 0),
      activeProgram: isRunning ? ["SPOT_WELD_SIDE_PANEL_L", "SPOT_WELD_SIDE_PANEL_R", "HANDLING_DOOR_INNER", "SPOT_WELD_ROOF_RAIL"][Math.floor(((Math.sin(t / 720000) + 1) / 2) * 4)] : "NONE",
      errorCode: state === "error" ? 4120 : 0,
      errorMessage: state === "error" ? "Electrode cap wear limit exceeded" : "",
    },
  }, { headers: { "Cache-Control": "no-store" } })
}
