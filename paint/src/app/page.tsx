"use client"

// Painel de telemetria do CPS — visual local do equipamento nesta máquina.
import { useCallback, useEffect, useState } from "react"

type Data = {
  equipmentId: string; equipmentType: string; eclassIrdi: string; eclassClass: string
  timestamp: string; state: string; metrics: Record<string, number | string>
}

const STATE_COLORS: Record<string, string> = {
  error: "bg-red-500", jam: "bg-red-500", idle: "bg-yellow-400",
  charging: "bg-blue-400", maintenance: "bg-yellow-400",
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { headers: { Authorization: "Bearer demo" } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed")
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 2000)
    return () => clearInterval(id)
  }, [load])

  const stateColor = data ? STATE_COLORS[data.state] ?? "bg-emerald-500" : "bg-gray-400"

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Paint Booth Line</h1>
          <p className="text-slate-400 text-sm mt-1">urn:dataspace:plant1:equipment:paint:booth:001</p>
          <p className="text-slate-500 text-xs mt-1">ECLASS 27-01-08-02 · IRDI 0173-1#01-AHB227#001 · porta 3007</p>
        </header>

        <div className="flex items-center gap-3">
          <span className={`inline-block w-3 h-3 rounded-full ${stateColor} animate-pulse`} />
          <span className="uppercase tracking-widest text-sm">{data?.state ?? "connecting..."}</span>
          <span className="text-slate-500 text-xs ml-auto">{data?.timestamp}</span>
        </div>

        {error ? <p className="text-red-400 text-sm">{error}</p> : null}

        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {data ? Object.entries(data.metrics).map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 text-slate-400">{k}</td>
                <td className="py-1.5 text-right text-emerald-300">{String(v)}</td>
              </tr>
            )) : null}
          </tbody>
        </table>

        <footer className="text-xs text-slate-500 border-t border-slate-800 pt-4 space-y-1">
          <p>Endpoints deste CPS (consumidos pelo Sidecar PEP):</p>
          <p>GET /api/data — telemetria em tempo real (Bearer demo)</p>
          <p>GET /api/aas — Asset Administration Shell (?submodel=Nameplate|TechnicalData|OperationalData)</p>
        </footer>
      </div>
    </main>
  )
}
