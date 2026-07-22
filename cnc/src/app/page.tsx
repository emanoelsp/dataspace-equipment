"use client"

import { useState, useEffect, useCallback } from "react"

interface CNCMetrics {
  spindleSpeed_rpm: number; spindleLoad_pct: number; feedRate_mm_min: number
  cuttingTemp_C: number; coolantPressure_bar: number
  axisX_mm: number; axisY_mm: number; axisZ_mm: number
  cycleTime_s: number; partsProducedShift: number
  activeProgram: string; activeToolNumber: number
  errorCode: number; errorMessage: string
}

interface CNCData {
  equipmentId: string; eclassIrdi: string; eclassClass: string
  timestamp: string; state: string; metrics: CNCMetrics
}

const HISTORY_LEN = 40

function SpindleGauge({ speed, maxSpeed = 12000 }: { speed: number; maxSpeed?: number }) {
  const pct = Math.min(speed / maxSpeed, 1)
  const sweepDeg = 250
  const startDeg = -215
  const r = 68, cx = 80, cy = 84
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg))
  const endDeg = startDeg + sweepDeg * pct
  const largeArc = sweepDeg * pct > 180 ? 1 : 0
  const color = pct > 0.85 ? "#f87171" : pct > 0.6 ? "#fbbf24" : "#34d399"

  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      <path
        d={`M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 1 1 ${arcX(startDeg + sweepDeg)} ${arcY(startDeg + sweepDeg)}`}
        fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"
      />
      {pct > 0.005 && (
        <path
          d={`M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endDeg)} ${arcY(endDeg)}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="monospace">
        {speed.toLocaleString("pt-BR")}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="11">rpm</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill={color} fontSize="10">{(pct * 100).toFixed(0)}% max</text>
    </svg>
  )
}

function Sparkline({ data, color = "#34d399", height = 44 }: { data: number[]; color?: string; height?: number }) {
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

function Bar({ pct, color = "bg-emerald-400", warn = false }: { pct: number; color?: string; warn?: boolean }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div className={`${warn ? "bg-red-500" : color} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
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

function KV({ label, value, unit = "", warn = false, big = false }: { label: string; value: string; unit?: string; warn?: boolean; big?: boolean }) {
  return (
    <div className="bg-slate-700/60 rounded-lg p-2.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`font-mono font-semibold leading-none ${big ? "text-2xl" : "text-lg"} ${warn ? "text-red-400" : "text-white"}`}>
        {value}{unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

function AxisBar({ axis, value, range }: { axis: string; value: number; range: number }) {
  const pct = ((value + range) / (range * 2)) * 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400 font-mono font-bold w-5">{axis}</span>
        <span className="font-mono text-white">{value.toFixed(3)} <span className="text-slate-500">mm</span></span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 relative">
        <div className="absolute top-0 left-1/2 w-px h-1.5 bg-slate-500" />
        <div className="bg-sky-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const STATE_STYLE: Record<string, string> = {
  running: "bg-emerald-500 text-white",
  idle: "bg-amber-500 text-black",
  maintenance: "bg-blue-500 text-white",
  alarm: "bg-red-600 text-white animate-pulse",
}

export default function CNCDashboard() {
  const [data, setData] = useState<CNCData | null>(null)
  const [hist, setHist] = useState<{ s: number[]; l: number[]; f: number[] }>({ s: [], l: [], f: [] })
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState(false)

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" })
      const d: CNCData = await r.json()
      if (!d.metrics) { setErr(true); return }
      setData(d)
      setHist(p => ({
        s: [...p.s.slice(-(HISTORY_LEN - 1)), d.metrics.spindleSpeed_rpm],
        l: [...p.l.slice(-(HISTORY_LEN - 1)), d.metrics.spindleLoad_pct],
        f: [...p.f.slice(-(HISTORY_LEN - 1)), d.metrics.feedRate_mm_min],
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
            <span className="text-4xl select-none">⚙️</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Centro de Usinagem CNC</h1>
              <p className="text-slate-400 text-sm">DMG MORI · NHX 4000 2nd Generation</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              ["ECLASS", "27-01-02-16"],
              ["IRDI", "0173-1#01-ACJ843#001"],
              ["AAS", "IDTA-01001-3-0"],
              ["SN", "NH4G-2024-BRA-0042"],
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
            <InfoRow label="Fabricante" value="DMG MORI AG" />
            <InfoRow label="Produto" value="NHX 4000 2nd Gen" />
            <InfoRow label="Série" value="NH4G-2024-BRA-0042" />
            <InfoRow label="Ano" value="2023" />
            <InfoRow label="País" value="Japão (JP)" />
            <InfoRow label="Código pedido" value="NHX4000-2ND-II-HSK63-40T" />
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Technical Data</p>
            <InfoRow label="Spindle max" value="12.000 rpm" />
            <InfoRow label="Potência" value="22 kW" />
            <InfoRow label="Torque max" value="281 Nm" />
            <InfoRow label="Interface" value="HSK-A63" />
            <InfoRow label="Magazine" value="40 ferramentas" />
            <InfoRow label="Curso X/Y/Z" value="560 mm" />
            <InfoRow label="Refrigerante" value="80 bar máx." />
            <InfoRow label="Tanque" value="560 L" />
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Asset ID</p>
            <p className="text-xs font-mono text-slate-500 break-all leading-relaxed">
              urn:dataspace:plant1:<br />equipment:cnc:machining<br />center:001
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              <p>GET /api/aas</p>
              <p>GET /api/aas?submodel=Nameplate</p>
              <p>GET /api/aas?submodel=TechnicalData</p>
              <p>GET /api/aas?submodel=OperationalData</p>
              <p>GET /api/data</p>
            </div>
          </div>
        </div>

        {/* Coluna 2 — Spindle */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Spindle</h2>

          <div className="flex justify-center">
            <SpindleGauge speed={m?.spindleSpeed_rpm ?? 0} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Carga spindle</span>
              <span className="font-mono text-white">{m?.spindleLoad_pct ?? 0}%</span>
            </div>
            <Bar pct={m?.spindleLoad_pct ?? 0} warn={(m?.spindleLoad_pct ?? 0) > 85} />
            <div className="mt-0.5 h-10">
              <Sparkline data={hist.l} color="#a78bfa" height={40} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KV label="Temperatura corte" value={`${m?.cuttingTemp_C ?? 0}`} unit="°C" warn={(m?.cuttingTemp_C ?? 0) > 100} />
            <KV label="Refrigerante" value={`${m?.coolantPressure_bar ?? 0}`} unit="bar" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Avanço (feed rate)</span>
              <span className="font-mono text-white">{m?.feedRate_mm_min?.toLocaleString("pt-BR") ?? 0} mm/min</span>
            </div>
            <Bar pct={((m?.feedRate_mm_min ?? 0) / 5000) * 100} color="bg-sky-400" />
            <div className="mt-0.5 h-10">
              <Sparkline data={hist.f} color="#38bdf8" height={40} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Histórico spindle</span>
              <span className="text-slate-600">{HISTORY_LEN} amostras</span>
            </div>
            <Sparkline data={hist.s} color="#34d399" height={48} />
          </div>
        </div>

        {/* Coluna 3 — Eixos + Produção */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Eixos & Produção</h2>

          <div className="space-y-2.5">
            <AxisBar axis="X" value={m?.axisX_mm ?? 0} range={280} />
            <AxisBar axis="Y" value={m?.axisY_mm ?? 0} range={180} />
            <AxisBar axis="Z" value={m?.axisZ_mm ?? 0} range={100} />
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <p className="text-xs text-slate-500">Programa ativo</p>
            <p className="font-mono text-sm text-cyan-300 truncate">{m?.activeProgram ?? "—"}</p>
            <p className="text-xs text-slate-500">Ferramenta: <span className="text-white font-mono">#{m?.activeToolNumber ?? 0}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KV label="Peças / turno" value={`${m?.partsProducedShift?.toLocaleString("pt-BR") ?? 0}`} big />
            <KV label="Tempo ciclo" value={`${m?.cycleTime_s ?? 0}`} unit="s" />
          </div>

          {m && m.errorCode > 0 ? (
            <div className="bg-red-900/40 border border-red-700 rounded-xl p-3">
              <p className="text-red-400 text-xs font-bold mb-0.5">ALARME #{m.errorCode}</p>
              <p className="text-red-300 text-sm">{m.errorMessage}</p>
            </div>
          ) : (
            <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-3">
              <p className="text-emerald-500 text-xs">Sem erros ativos</p>
            </div>
          )}

          <div className="text-xs text-slate-600 pt-1">
            <p>Seção: Usinagem-Linha1</p>
            <p>Auto-refresh: 2 s</p>
          </div>
        </div>

      </div>
    </main>
  )
}
