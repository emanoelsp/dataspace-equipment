# Dataspace Equipment — simuladores de CPS

Simuladores de **Sistemas Ciberfísicos (CPS)** da planta `plant1`, para os testes
e as medições de desempenho do Dataspace intraorganizacional. Cada CPS é uma app
Next.js autônoma que expõe:
- `GET /api/data` — telemetria em tempo real
- `GET /api/aas` — Asset Administration Shell (IDTA-01001-3-0 + ECLASS/IRDI)

Autenticação: `Authorization: Bearer demo`.

## Os 10 CPS (uma linha de estampagem → usinagem → solda → acabamento)

| id | equipamento | porta | id | equipamento | porta |
|----|-------------|-------|----|-------------|-------|
| cnc | Centro de usinagem | 3001 | agv | AGV de movimentação | 3006 |
| press | Prensa hidráulica | 3002 | paint | Cabine de pintura | 3007 |
| robot | Robô de solda | 3003 | quality | Inspeção dimensional | 3008 |
| oven | Forno de tratamento | 3004 | compressor | Compressor de ar | 3009 |
| conveyor | Esteira central | 3005 | warehouse | Armazém (AS/RS) | 3010 |

## Dois modos de uso

### 1. Um CPS por máquina (medição de desempenho na rede real)
Em **cada computador** da rede, clone o repo e rode **um** CPS:
```bash
git clone https://github.com/emanoelsp/dataspace-equipment.git
cd dataspace-equipment/oven      # ou cnc, press, robot, ...
npm install
npm run dev                      # sobe na porta do equipamento (ex.: oven → 3004)
```
O `baseUrl` a registrar no Dataspace é `http://<IP-da-máquina>:<porta>`.
Assim as trocas passam pela rede física e os tempos medidos são reais.

### 2. Frota num processo só (escada de escalabilidade)
Para os testes de escala (5 → 20 → 50 → 100 → 500 CPS), a `fleet` roda N CPS
num único processo, sem dependências:
```bash
node fleet/server.mjs --port 3050            # os 7 CPS da frota
node fleet/server.mjs --port 3050 --scale 3  # replica cada template (21 CPS)
curl localhost:3050/eq/oven/api/data -H "Authorization: Bearer demo"
```

## Regenerar / adicionar CPS

As apps são geradas de `fleet/fleet-config.mjs` pelo gerador:
```bash
node generate-cps-apps.mjs      # regenera oven, conveyor, agv, paint, quality, compressor, warehouse
```
Para um novo equipamento: adicione-o em `fleet/fleet-config.mjs`, dê uma porta em
`generate-cps-apps.mjs` (mapa `PORTS`) e rode o gerador.

## Relação com os outros repositórios
- **Control plane (nuvem):** `dataspace_v2` → `dataspaceapp`.
- **Sidecar PEP (borda):** `dataspace-sidecar`.
