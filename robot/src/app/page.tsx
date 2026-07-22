"use client"

import { useState, useEffect, useCallback } from "react"

interface RobotMetrics {
  j1_deg: number; j2_deg: number; j3_deg: number
  j4_deg: number; j5_deg: number; j6_deg: number
  tcpX_mm: number; tcpY_mm: number; tcpZ_mm: number
  tcpRx_deg: number; tcpRy_deg: number; tcpRz_deg: number
  speedOverride_pct: number; cycleTime_s: number; totalCycles: number
  payload_kg: number; weldCurrent_kA: number; weldForce_kN: number
  weldSpotsThisCycle: number; motor1Temp_C: number; motor2Temp_C: number
  electrodeWear_pct: number; activeProgram: string; errorCode: number; errorMessage: string
}

interface RobotData {
  equipmentId: string; eclassIrdi: string; eclassClass: string
  timestamp: string; state: string; metrics: RobotMetrics
}

const HISTORY_LEN = 40

const STATE_STYLE: Record<string, string> = {
  automatic: "bg-emerald-500 text-white",
  idle: "bg-amber-500 text-black",
  t1: "bg-blue-500 text-white",
  error: "bg-red-600 text-white animate-pulse",
}

const JOINTS: { key: keyof RobotMetrics; label: string; min: number; max: number; color: string }[] = [
  { key: "j1_deg", label: "J1", min: -185, max: 185, color: "#f87171" },
  { key: "j2_deg", label: "J2", min: -130, max: 45, color: "#fb923c" },
  { key: "j3_deg", label: "J3", min: -120, max: 156, color: "#fbbf24" },
  { key: "j4_deg", label: "J4", min: -350, max: 350, color: "#34d399" },
  { key: "j5_deg", label: "J5", min: -125, max: 125, color: "#38bdf8" },
  { key: "j6_deg", label: "J6", min: -350, max: 350, color: "#a78bfa" },
]

function JointBar({ label, value, min, max, color }: { label: string; value: number; min: number; max: number; color: string }) {
  const range = max - min
  const pct = ((value - min) / range) * 100
  const zeroPct = ((0 - min) / range) * 100
  const left = Math.min(pct, zeroPct)
  const width = Math.abs(pct - zeroPct)

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-mono font-bold text-slate-300 w-7">{label}</span>
        <div className="flex gap-2">
          <span className="text-slate-500 text-xs">{min}°</span>
          <span className="font-mono text-white font-semibold">{value.toFixed(1)}°</span>
          <span className="text-slate-500 text-xs">{max}°</span>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2 relative">
        <div className="absolute top-0 h-2 w-px bg-slate-500" style={{ left: `${zeroPct}%` }} />
        <div className="absolute top-0 h-2 rounded-full transition-all duration-300" style={{ left: `${left}%`, width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function TCPPanel({ m }: { m: RobotMetrics | undefined }) {
  if (!m) return null
  const coords = [
    { label: "X", value: m.tcpX_mm, unit: "mm", color: "text-red-400" },
    { label: "Y", value: m.tcpY_mm, unit: "mm", color: "text-emerald-400" },
    { label: "Z", value: m.tcpZ_mm, unit: "mm", color: "text-blue-400" },
    { label: "Rx", value: m.tcpRx_deg, unit: "°", color: "text-red-300" },
    { label: "Ry", value: m.tcpRy_deg, unit: "°", color: "text-emerald-300" },
    { label: "Rz", value: m.tcpRz_deg, unit: "°", color: "text-blue-300" },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {coords.map(c => (
        <div key={c.label} className="bg-slate-700/60 rounded-lg p-2 text-center">
          <p className={`text-xs font-bold ${c.color} mb-0.5`}>{c.label}</p>
          <p className="font-mono text-white text-sm font-semibold">{c.value.toFixed(1)}</p>
          <p className="text-xs text-slate-500">{c.unit}</p>
        </div>
      ))}
    </div>
  )
}

function Sparkline({ data, color = "#34d399", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} className="w-full" />
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const w = 100, h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-300 text-right truncate">{value}</span>
    </div>
  )
}

function KV({ label, value, unit = "", warn = false }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className="bg-slate-700/60 rounded-lg p-2.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`font-mono font-semibold text-lg leading-none ${warn ? "text-red-400" : "text-white"}`}>
        {value}{unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

function WearBar({ pct }: { pct: number }) {
  const color = pct > 80 ? "#f87171" : pct > 60 ? "#fbbf24" : "#34d399"
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">Desgaste eletrodo</span>
        <span className="font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function RobotDashboard() {
  const [data, setData] = useState<RobotData | null>(null)
  const [hist, setHist] = useState<{ j1: number[]; j4: number[]; tcp: number[] }>({ j1: [], j4: [], tcp: [] })
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState(false)

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" })
      const d: RobotData = await r.json()
      if (!d.metrics) { setErr(true); return }
      setData(d)
      setHist(prev => ({
        j1: [...prev.j1.slice(-(HISTORY_LEN - 1)), d.metrics.j1_deg],
        j4: [...prev.j4.slice(-(HISTORY_LEN - 1)), d.metrics.j4_deg],
        tcp: [...prev.tcp.slice(-(HISTORY_LEN - 1)), d.metrics.tcpZ_mm],
      }))
      setTick(t => t + 1)
      setErr(false)
    } catch { setErr(true) }
  }, [])

  useEffect(() => { poll(); const id = setInterval(poll, 2000); return () => clearInterval(id) }, [poll])

  const m = data?.metrics

  return (
    <main className="min-h-screen bg-slate-900 p-4 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl select-none">🦾</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Robô Industrial de Soldagem a Ponto</h1>
              <p className="text-slate-400 text-sm">KUKA AG · KR 210 R2700 prime — 6 eixos</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              ["ECLASS", "27-01-04-01"],
              ["IRDI", "0173-1#01-AKJ975#001"],
              ["AAS", "IDTA-01001-3-0"],
              ["SN", "KUKR-2024-BRA-0018"],
            ].map(([k, v]) => (
              <span key={k} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                <span className="text-slate-600">{k}:</span> {v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_STYLE[data?.state ?? ""] ?? "bg-slate-700 text-slate-300"}`}>
            {data?.state?.toUpperCase() ?? "—"}
          </span>
          <span className="text-xs text-slate-600">
            {err ? "⚠ erro de conexão" : `#${tick} · ${data ? new Date(data.timestamp).toLocaleTimeString("pt-BR") : "--:--:--"}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Coluna 1 — AAS / ECLASS */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">AAS / ECLASS</h2>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Nameplate</p>
            <InfoRow label="Fabricante" value="KUKA AG" />
            <InfoRow label="Produto" value="KR 210 R2700 prime" />
            <InfoRow label="Série" value="KUKR-2024-BRA-0018" />
            <InfoRow label="Ano" value="2023" />
            <InfoRow label="País" value="Alemanha (DE)" />
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Technical Data</p>
            <InfoRow label="Eixos" value="6 (articulado)" />
            <InfoRow label="Payload max" value="210 kg" />
            <InfoRow label="Alcance" value="2.700 mm" />
            <InfoRow label="Repetibilidade" value="±0,05 mm" />
            <InfoRow label="Vel. TCP max" value="2,0 m/s" />
            <InfoRow label="Tipo pinça" value="X-type servo gun" />
            <InfoRow label="Corrente max" value="20 kA" />
            <InfoRow label="Força solda max" value="6,0 kN" />
            <InfoRow label="Eletrodo" value="Cu-Cr-Zr cap" />
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Asset ID</p>
            <p className="text-xs font-mono text-slate-500 break-all leading-relaxed">
              urn:dataspace:plant1:<br />equipment:robot:<br />welding:001
            </p>
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs font-medium text-slate-500 mb-2">Endpoints</p>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>GET /api/aas</p>
              <p>GET /api/aas?submodel=Nameplate</p>
              <p>GET /api/aas?submodel=TechnicalData</p>
              <p>GET /api/aas?submodel=OperationalData</p>
              <p>GET /api/data</p>
            </div>
          </div>
        </div>

        {/* Coluna 2 — Juntas */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ângulos das Juntas</h2>

          <div className="space-y-2.5">
            {JOINTS.map(j => (
              <JointBar
                key={j.key}
                label={j.label}
                value={(m?.[j.key] as number) ?? 0}
                min={j.min}
                max={j.max}
                color={j.color}
              />
            ))}
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs text-slate-500 mb-1">Histórico J1 (°)</p>
            <Sparkline data={hist.j1} color="#f87171" height={40} />
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Histórico J4 (°)</p>
            <Sparkline data={hist.j4} color="#34d399" height={40} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KV label="Override veloc." value={`${m?.speedOverride_pct ?? 0}`} unit="%" />
            <KV label="Payload TCP" value={`${m?.payload_kg ?? 0}`} unit="kg" />
          </div>
        </div>

        {/* Coluna 3 — TCP + Soldagem */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">TCP & Soldagem</h2>

          <div>
            <p className="text-xs text-slate-500 mb-2">Posição TCP</p>
            <TCPPanel m={m} />
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Histórico TCP Z (mm)</p>
            <Sparkline data={hist.tcp} color="#38bdf8" height={40} />
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-2">
            <p className="text-xs text-slate-500">Processo de Soldagem</p>
            <div className="grid grid-cols-2 gap-2">
              <KV label="Corrente" value={`${m?.weldCurrent_kA ?? 0}`} unit="kA" />
              <KV label="Força" value={`${m?.weldForce_kN ?? 0}`} unit="kN" />
              <KV label="Pontos/ciclo" value={`${m?.weldSpotsThisCycle ?? 0}`} />
              <KV label="Ciclo" value={`${m?.cycleTime_s ?? 0}`} unit="s" />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-2">
            <WearBar pct={m?.electrodeWear_pct ?? 0} />
            <div className="grid grid-cols-2 gap-2">
              <KV label="Temp motor 1" value={`${m?.motor1Temp_C ?? 0}`} unit="°C" warn={(m?.motor1Temp_C ?? 0) > 80} />
              <KV label="Temp motor 2" value={`${m?.motor2Temp_C ?? 0}`} unit="°C" warn={(m?.motor2Temp_C ?? 0) > 80} />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs text-slate-500 mb-1">Programa ativo</p>
            <p className="font-mono text-sm text-violet-300 truncate">{m?.activeProgram ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-1.5">Total ciclos: <span className="text-white font-mono">{(m?.totalCycles ?? 0).toLocaleString("pt-BR")}</span></p>
          </div>

          {m && m.errorCode > 0 ? (
            <div className="bg-red-900/40 border border-red-700 rounded-xl p-3">
              <p className="text-red-400 text-xs font-bold mb-0.5">ERRO #{m.errorCode}</p>
              <p className="text-red-300 text-sm">{m.errorMessage}</p>
            </div>
          ) : (
            <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-2">
              <p className="text-emerald-500 text-xs">Sem erros · Seção: Soldagem-CelulaCar1 · 2s</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
