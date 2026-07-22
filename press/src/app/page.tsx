"use client"

import { useState, useEffect, useCallback } from "react"

interface PressMetrics {
  strokePosition_mm: number; strokePositionPct: number; strokeSpeed_mm_s: number
  pressForce_kN: number; pressForceUtilization_pct: number; hydraulicPressure_bar: number
  oilTemperature_C: number; pump1Speed_rpm: number; pump2Speed_rpm: number
  cycleCount: number; strokesPerMinActual: number; upTime_pct: number
  safetyDoorOpen: boolean; lightCurtainOk: boolean; partPresent: boolean
  activeProgram: string; filterDifferentialPressure_bar: number; filterAlarm: boolean
}

interface PressData {
  equipmentId: string; eclassIrdi: string; eclassClass: string
  timestamp: string; state: string; metrics: PressMetrics
}

interface RemoteExchangeMeta {
  origin: { id: string; label: string; eclassIrdi?: string }
  destination: { id: string; label: string; eclassIrdi?: string }
  broker: { label: string; url: string; endpoint?: string }
  responseTimeMs: number
  sidecarInternalMs: number | null
  statusCode: number
  timestamp: string
  tokenId: string | null
  federationId: string | null
  dataOwnerId: string | null
  dataClientId: string | null
}

interface RemoteExchange {
  meta: RemoteExchangeMeta
  data: Record<string, unknown> | null
  error: { message: string } | null
}

const HISTORY_LEN = 40

const STATE_STYLE: Record<string, string> = {
  approach: "bg-sky-500 text-white",
  pressing: "bg-orange-500 text-white",
  hold: "bg-red-600 text-white",
  return: "bg-blue-500 text-white",
  "part-exchange": "bg-violet-500 text-white",
  idle: "bg-amber-500 text-black",
  maintenance: "bg-slate-500 text-white",
}

function StrokeGauge({ position, maxStroke = 400 }: { position: number; maxStroke?: number }) {
  const pct = Math.min(position / maxStroke, 1)
  const barH = 120
  const filled = barH * pct
  const color = pct > 0.9 ? "#f87171" : pct > 0.5 ? "#fb923c" : "#38bdf8"

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-slate-500">0 mm</span>
      <div className="relative w-12 rounded-lg overflow-hidden border border-slate-600" style={{ height: barH }}>
        <div className="absolute bottom-0 left-0 w-full transition-all duration-300 rounded-b-lg" style={{ height: filled, background: color }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-mono font-bold" style={{ textShadow: "0 1px 3px #000" }}>
            {position.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-500">{maxStroke} mm</span>
    </div>
  )
}

function ForceArc({ force, maxForce = 1600 }: { force: number; maxForce?: number }) {
  const pct = Math.min(force / maxForce, 1)
  const sweepDeg = 200
  const startDeg = -200
  const r = 55, cx = 65, cy = 70
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg))
  const endDeg = startDeg + sweepDeg * pct
  const largeArc = sweepDeg * pct > 180 ? 1 : 0
  const color = pct > 0.9 ? "#f87171" : pct > 0.6 ? "#fb923c" : "#fbbf24"

  return (
    <svg width="130" height="100" viewBox="0 0 130 100">
      <path
        d={`M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 1 1 ${arcX(startDeg + sweepDeg)} ${arcY(startDeg + sweepDeg)}`}
        fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round"
      />
      {pct > 0.005 && (
        <path
          d={`M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endDeg)} ${arcY(endDeg)}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="monospace">
        {force.toLocaleString("pt-BR")}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="10">kN</text>
    </svg>
  )
}

function Sparkline({ data, color = "#fb923c", height = 44 }: { data: number[]; color?: string; height?: number }) {
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

function KV({ label, value, unit = "", warn = false, ok = false }: { label: string; value: string; unit?: string; warn?: boolean; ok?: boolean }) {
  return (
    <div className="bg-slate-700/60 rounded-lg p-2.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`font-mono font-semibold text-lg leading-none ${warn ? "text-red-400" : ok ? "text-emerald-400" : "text-white"}`}>
        {value}{unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

function SensorBadge({ label, ok, inverse = false }: { label: string; ok: boolean; inverse?: boolean }) {
  const active = inverse ? !ok : ok
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${active ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
      {label}
    </div>
  )
}

export default function PressDashboard() {
  const [data, setData] = useState<PressData | null>(null)
  const [hist, setHist] = useState<{ f: number[]; p: number[]; s: number[] }>({ f: [], p: [], s: [] })
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState(false)

  const [dsToken, setDsToken] = useState("")
  const [dsSidecarUrl, setDsSidecarUrl] = useState("http://localhost:3100")
  const [dsConnected, setDsConnected] = useState(false)
  const [dsData, setDsData] = useState<RemoteExchange | null>(null)
  const [dsErr, setDsErr] = useState<string | null>(null)
  const [dsTimes, setDsTimes] = useState<number[]>([])
  const [dsTick, setDsTick] = useState(0)

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" })
      const d: PressData = await r.json()
      if (!d.metrics) { setErr(true); return }
      setData(d)
      setHist(prev => ({
        f: [...prev.f.slice(-(HISTORY_LEN - 1)), d.metrics.pressForce_kN],
        p: [...prev.p.slice(-(HISTORY_LEN - 1)), d.metrics.hydraulicPressure_bar],
        s: [...prev.s.slice(-(HISTORY_LEN - 1)), d.metrics.strokePosition_mm],
      }))
      setTick(t => t + 1)
      setErr(false)
    } catch { setErr(true) }
  }, [])

  useEffect(() => { poll(); const id = setInterval(poll, 2000); return () => clearInterval(id) }, [poll])

  const pollRemote = useCallback(async () => {
    if (!dsToken.trim()) return
    try {
      const r = await fetch(
        `/api/remote/cnc?sidecarUrl=${encodeURIComponent(dsSidecarUrl)}`,
        { headers: { Authorization: `Bearer ${dsToken.trim()}` }, cache: "no-store" }
      )
      const d: RemoteExchange = await r.json()
      setDsData(d)
      if (d.meta?.responseTimeMs !== undefined) {
        setDsTimes(prev => [...prev.slice(-39), d.meta.responseTimeMs])
      }
      setDsTick(t => t + 1)
      setDsErr(r.ok ? null : (d.error?.message ?? `HTTP ${r.status}`))
    } catch (e) {
      setDsErr(e instanceof Error ? e.message : "Erro de conexão")
    }
  }, [dsToken, dsSidecarUrl])

  useEffect(() => {
    if (!dsConnected) return
    pollRemote()
    const id = setInterval(pollRemote, 2000)
    return () => clearInterval(id)
  }, [dsConnected, pollRemote])

  const m = data?.metrics

  return (
    <main className="min-h-screen bg-slate-900 p-4 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl select-none">🔩</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Prensa Hidráulica de Conformação</h1>
              <p className="text-slate-400 text-sm">Schuler AG · MSP 160 Multi-station Hydraulic Press</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              ["ECLASS", "27-01-05-01"],
              ["IRDI", "0173-1#01-ADN573#001"],
              ["AAS", "IDTA-01001-3-0"],
              ["SN", "SCH-MSP160-2024-BRA-0007"],
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
            <InfoRow label="Fabricante" value="Schuler AG" />
            <InfoRow label="Produto" value="MSP 160 — Multi-station Press" />
            <InfoRow label="Série" value="SCH-MSP160-2024-BRA-0007" />
            <InfoRow label="Ano" value="2024" />
            <InfoRow label="País" value="Alemanha (DE)" />
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Technical Data</p>
            <InfoRow label="Força nominal" value="1.600 kN" />
            <InfoRow label="Força máxima" value="1.760 kN" />
            <InfoRow label="Pressão max" value="315 bar" />
            <InfoRow label="Curso total" value="400 mm" />
            <InfoRow label="Golpes/min max" value="12" />
            <InfoRow label="Vel. aproximação" value="400 mm/s" />
            <InfoRow label="Vel. prensagem" value="30 mm/s" />
            <InfoRow label="Tanque óleo" value="1.200 L" />
            <InfoRow label="Bombas" value="2 × 90 kW" />
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Asset ID</p>
            <p className="text-xs font-mono text-slate-500 break-all leading-relaxed">
              urn:dataspace:plant1:<br />equipment:press:<br />hydraulic:001
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

        {/* Coluna 2 — Ciclo de prensagem */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ciclo de Prensagem</h2>

          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1.5">Posição do carro</p>
              <StrokeGauge position={m?.strokePosition_mm ?? 0} />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Força</p>
              <ForceArc force={m?.pressForce_kN ?? 0} />
              <p className="text-xs text-slate-500">{m?.pressForceUtilization_pct ?? 0}% nominal</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-400">Histórico força (kN)</span>
            </div>
            <Sparkline data={hist.f} color="#fb923c" height={48} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-400">Histórico pressão hid. (bar)</span>
            </div>
            <Sparkline data={hist.p} color="#818cf8" height={40} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KV label="Pressão principal" value={`${m?.hydraulicPressure_bar ?? 0}`} unit="bar" warn={(m?.hydraulicPressure_bar ?? 0) > 300} />
            <KV label="Velocidade" value={`${Math.abs(m?.strokeSpeed_mm_s ?? 0)}`} unit="mm/s" />
          </div>
        </div>

        {/* Coluna 3 — Sistema hid. + Produção */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Hidráulico & Produção</h2>

          <div className="grid grid-cols-2 gap-2">
            <KV label="Temperatura óleo" value={`${m?.oilTemperature_C ?? 0}`} unit="°C" warn={(m?.oilTemperature_C ?? 0) > 60} />
            <KV label="Bomba 1" value={`${m?.pump1Speed_rpm ?? 0}`} unit="rpm" />
            <KV label="Bomba 2" value={`${m?.pump2Speed_rpm ?? 0}`} unit="rpm" />
            <KV label="ΔP filtro" value={`${m?.filterDifferentialPressure_bar ?? 0}`} unit="bar" warn={m?.filterAlarm} />
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs text-slate-500 mb-2">Sensores de Segurança</p>
            <div className="flex flex-wrap gap-1.5">
              <SensorBadge label="Porta seg." ok={!m?.safetyDoorOpen} />
              <SensorBadge label="Cortina luz" ok={m?.lightCurtainOk ?? true} />
              <SensorBadge label="Peça presente" ok={m?.partPresent ?? false} />
              <SensorBadge label="Filtro OK" ok={!m?.filterAlarm} />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-2">
            <p className="text-xs text-slate-500 mb-1">Produção</p>
            <div className="grid grid-cols-2 gap-2">
              <KV label="Total ciclos" value={(m?.cycleCount ?? 0).toLocaleString("pt-BR")} />
              <KV label="Golpes/min" value={`${m?.strokesPerMinActual ?? 0}`} />
            </div>
            <KV label="Disponibilidade turno" value={`${m?.upTime_pct ?? 0}`} unit="%" ok={(m?.upTime_pct ?? 0) > 80} />
          </div>

          <div className="border-t border-slate-700 pt-2">
            <p className="text-xs text-slate-500 mb-1">Programa ativo</p>
            <p className="font-mono text-sm text-amber-300 truncate">{m?.activeProgram ?? "—"}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-0.5">Histórico posição carro (mm)</p>
            <Sparkline data={hist.s} color="#34d399" height={40} />
          </div>

          <div className="text-xs text-slate-600">
            <p>Seção: Estampagem-Linha2 · Auto-refresh: 2 s</p>
          </div>
        </div>

      </div>

      {/* ── Dataspace Exchange Panel ─────────────────────────────────────────── */}
      <div className="mt-4 bg-slate-800 rounded-2xl p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Dataspace Exchange — P2P via IDS
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Prensa consulta dados do CNC via Sidecar Proxy com token negociado no dataspace
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dsConnected ? "bg-emerald-900/50 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>
            {dsConnected ? "● Conectado" : "○ Desconectado"}
          </span>
        </div>

        {/* Flow diagram: Press → Sidecar → CNC */}
        <div className="flex items-stretch gap-2 mb-4 text-center text-xs">
          <div className="flex-1 bg-slate-700/60 rounded-xl p-3 border-2 border-orange-500/40">
            <div className="text-orange-400 font-bold text-sm mb-0.5">PRESS — DESTINO</div>
            <div className="text-slate-500">Solicitante / Cliente de Dados</div>
            <div className="font-mono text-slate-400 mt-1.5">192.168.0.8:3002</div>
            <div className="text-slate-600 mt-0.5">IRDI: 0173-1#01-ADN573#001</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 px-1 text-slate-600 shrink-0">
            <span className="text-[10px]">Bearer token IDS</span>
            <span className="text-xl">→</span>
          </div>
          <div className="flex-1 bg-slate-700/60 rounded-xl p-3 border-2 border-indigo-500/40">
            <div className="text-indigo-400 font-bold text-sm mb-0.5">SIDECAR — BROKER</div>
            <div className="text-slate-500">IDS-PEP / Policy Enforcement</div>
            <div className="font-mono text-slate-400 mt-1.5 text-[11px] break-all">{dsSidecarUrl}</div>
            <div className="text-slate-600 mt-0.5">/api/proxy/cnc/data</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 px-1 text-slate-600 shrink-0">
            <span className="text-[10px]">Bearer demo</span>
            <span className="text-xl">→</span>
          </div>
          <div className="flex-1 bg-slate-700/60 rounded-xl p-3 border-2 border-cyan-500/40">
            <div className="text-cyan-400 font-bold text-sm mb-0.5">CNC — ORIGEM</div>
            <div className="text-slate-500">Provedor / Dono dos Dados</div>
            <div className="font-mono text-slate-400 mt-1.5">192.168.0.70:3001</div>
            <div className="text-slate-600 mt-0.5">IRDI: 0173-1#01-ACJ843#001</div>
          </div>
        </div>

        {/* Config */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            className="flex-1 min-w-0 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 font-mono border border-slate-600 focus:border-indigo-500 focus:outline-none"
            placeholder="Token IDS  (ex: dsp_abc123…)"
            value={dsToken}
            onChange={e => setDsToken(e.target.value)}
            disabled={dsConnected}
          />
          <input
            className="w-60 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 font-mono border border-slate-600 focus:border-indigo-500 focus:outline-none"
            placeholder="Sidecar URL"
            value={dsSidecarUrl}
            onChange={e => setDsSidecarUrl(e.target.value)}
            disabled={dsConnected}
          />
          <button
            onClick={() => {
              if (dsConnected) {
                setDsConnected(false); setDsData(null); setDsErr(null)
                setDsTimes([]); setDsTick(0)
              } else if (dsToken.trim()) {
                setDsConnected(true)
              }
            }}
            disabled={!dsConnected && !dsToken.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              dsConnected
                ? "bg-red-700 hover:bg-red-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {dsConnected ? "Desconectar" : "Conectar"}
          </button>
        </div>

        {/* Status bar */}
        {dsData && (
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <span className="bg-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
              Resposta total:{" "}
              <span className={`font-mono font-bold ${
                (dsData.meta.responseTimeMs ?? 0) > 200 ? "text-red-400"
                  : (dsData.meta.responseTimeMs ?? 0) > 100 ? "text-amber-400"
                  : "text-emerald-400"
              }`}>
                {dsData.meta.responseTimeMs} ms
              </span>
            </span>
            {dsData.meta.sidecarInternalMs !== null && (
              <span className="bg-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
                Sidecar→CNC:{" "}
                <span className="font-mono font-bold text-indigo-400">
                  {dsData.meta.sidecarInternalMs} ms
                </span>
              </span>
            )}
            <span className="bg-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
              Req. #{dsTick} · {new Date(dsData.meta.timestamp).toLocaleTimeString("pt-BR")}
            </span>
            {dsData.meta.tokenId && (
              <span className="bg-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-500 text-[11px]">
                token: {dsData.meta.tokenId.slice(0, 20)}…
              </span>
            )}
            {dsData.meta.federationId && (
              <span className="bg-slate-700 rounded-lg px-2.5 py-1.5 text-slate-500 text-[11px]">
                fed: {dsData.meta.federationId.slice(0, 14)}…
              </span>
            )}
          </div>
        )}

        {dsErr && (
          <div className="mb-3 bg-red-900/30 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-400">
            ⚠ {dsErr}
          </div>
        )}

        {/* CNC data + latency chart */}
        {dsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-700/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  Dados CNC (Origem)
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  STATE_STYLE[(dsData.data as { state?: string }).state ?? ""]
                    ?? "bg-slate-600 text-slate-300"
                }`}>
                  {((dsData.data as { state?: string }).state ?? "—").toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                {Object.entries(
                  (dsData.data as { metrics?: Record<string, unknown> }).metrics ?? {}
                )
                  .filter(([, v]) => typeof v === "number" || typeof v === "boolean" || typeof v === "string")
                  .slice(0, 10)
                  .map(([k, v]) => (
                    <InfoRow key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                  ))}
              </div>
              <p className="text-[11px] font-mono text-slate-600 mt-2 break-all">
                {(dsData.data as { equipmentId?: string }).equipmentId}
              </p>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Latência P2P — histórico
              </p>
              <Sparkline data={dsTimes} color="#818cf8" height={64} />
              {dsTimes.length > 1 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">mín</p>
                    <p className="font-mono text-emerald-400 font-bold text-base">{Math.min(...dsTimes)} ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">média</p>
                    <p className="font-mono text-indigo-400 font-bold text-base">
                      {Math.round(dsTimes.reduce((a, b) => a + b, 0) / dsTimes.length)} ms
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">máx</p>
                    <p className="font-mono text-amber-400 font-bold text-base">{Math.max(...dsTimes)} ms</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-600 mt-2">{dsTimes.length} amostras · auto-refresh 2 s</p>
            </div>
          </div>
        )}

        {!dsConnected && !dsData && (
          <div className="text-center py-8 text-slate-600 text-sm">
            <p className="text-3xl mb-2">🔗</p>
            <p>Insira o token IDS e clique em <span className="text-indigo-400">Conectar</span></p>
            <p className="text-xs mt-1">O token é emitido após a negociação do contrato no dataspace</p>
          </div>
        )}

      </div>

    </main>
  )
}
