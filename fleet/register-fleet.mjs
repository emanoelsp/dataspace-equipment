#!/usr/bin/env node
/**
 * Registra a frota no Sidecar PEP (conveniência para desenvolvimento/testes).
 *
 * No fluxo normal, o registro acontece pelo Dataspace na criação do ativo
 * (/api/sidecar/register-equipment). Este script atalha esse caminho para
 * cenários de teste e para a escada de escalabilidade.
 *
 * Uso:
 *   node register-fleet.mjs --sidecar http://localhost:3100 \
 *     --base http://192.168.0.10:3010 --secret admin --scale 1
 */

import { FLEET } from "./fleet-config.mjs"

const args = process.argv.slice(2)
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const SIDECAR = argValue("--sidecar", process.env.SIDECAR_URL ?? "http://localhost:3100")
const BASE = argValue("--base", `http://localhost:${process.env.FLEET_PORT ?? "3050"}`)
const SECRET = argValue("--secret", process.env.SIDECAR_ADMIN_SECRET ?? "admin")
const SCALE = Math.max(1, Number(argValue("--scale", "1")))

const instances = []
for (const tpl of FLEET) {
  for (let k = 1; k <= SCALE; k++) {
    const id = k === 1 ? tpl.id : `${tpl.id}-${k}`
    instances.push({
      id,
      name: k === 1 ? tpl.name : `${tpl.name} #${k}`,
      baseUrl: `${BASE.replace(/\/+$/, "")}/eq/${id}`,
      eclassIrdi: tpl.eclassClass,
      dataOwnerName: "fleet (dev script)",
    })
  }
}

console.log(`[register-fleet] ${instances.length} CPS → ${SIDECAR}/api/equipment`)
let ok = 0
for (const eq of instances) {
  try {
    const res = await fetch(`${SIDECAR}/api/equipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify(eq),
    })
    if (res.ok) {
      ok++
      console.log(`  ✓ ${eq.id.padEnd(16)} → ${eq.baseUrl}`)
    } else {
      console.log(`  ✗ ${eq.id.padEnd(16)} HTTP ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.log(`  ✗ ${eq.id.padEnd(16)} ${err.message}`)
  }
}
console.log(`[register-fleet] concluído: ${ok}/${instances.length}`)
