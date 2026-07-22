# Fleet — Frota de CPS simulados da plant1

Um único processo Node **sem dependências** servindo 7 CPS (expansível por
`--scale`), no mesmo contrato dos simuladores originais (`/api/data` e
`/api/aas`, AAS IDTA-01001-3-0 + ECLASS/IRDI, `Bearer demo`).

## A planta completa (10 CPS)

Linha de produção de componentes metálicos estampados-usinados-soldados:

| # | id | Equipamento | Papel no fluxo físico |
|---|----|-------------|----------------------|
| 1 | `warehouse` | Armazém automático (AS/RS) | libera blanks e recebe peças acabadas |
| 2 | `conveyor` | Esteira transportadora central | liga as estações |
| 3 | `agv` | AGV de movimentação | transporte entre células |
| 4 | `press`* | Prensa hidráulica | estampagem dos blanks |
| 5 | `oven` | Forno de tratamento térmico | tratamento do lote estampado |
| 6 | `cnc`* | Centro de usinagem CNC | usinagem de precisão |
| 7 | `robot`* | Robô de solda a ponto | solda das submontagens |
| 8 | `paint` | Cabine de pintura | acabamento |
| 9 | `quality` | Estação de inspeção dimensional (CMM) | inspeção e liberação |
| 10 | `compressor` | Compressor de ar central | utilidade da planta |

\* simuladores originais (apps Next.js próprias).

## ⚠️ Dois modos de execução

**1. Cenário real multi-máquina (o principal)** — cada CPS é uma **app Next.js
autônoma** em `api-equipment/<id>` (geradas por `../generate-cps-apps.mjs`),
para rodar **um CPS por computador da rede** e medir tempos de comunicação
reais. Portas: cnc 3001 · press 3002 · robot 3003 · oven 3004 · conveyor 3005 ·
agv 3006 · paint 3007 · quality 3008 · compressor 3009 · warehouse 3010.

```bash
# em cada computador:
cd api-equipment/<id> && npm install && npm run dev
# baseUrl a registrar no Dataspace/sidecar: http://<IP-da-máquina>:<porta>
```

**2. Escada de escalabilidade (este servidor)** — a fleet roda N CPS em um
processo só, para os testes 5 → 20 → 50 → 100 → 500 (inviáveis com 1 máquina
por CPS):

```bash
node server.mjs                          # porta 3050
node server.mjs --port 3050 --scale 3    # replica cada template (frota 21)
curl -s localhost:3050/eq/oven/api/data -H "Authorization: Bearer demo" | jq

# registrar no sidecar (atalho de dev)
node register-fleet.mjs --sidecar http://localhost:3100 --base http://<IP-LAN>:3050
```

---

## 📋 CENÁRIO PENSADO (não implementado — será montado após as melhorias #4-#6)

**História**: na plant1, um equipamento da linha **precisa de dados de outros
equipamentos para prosseguir sua atividade**. Toda a negociação acontece pelo
Dataspace (exposição no catálogo → busca → adesão à federação → assinatura de
contrato → token) e o consumo acontece **via Sidecar PEP, dentro da fábrica**
(Ethernet cabeada).

### As 5 trocas de dados simultâneas (Cenário 2 das métricas)

| # | Consumidor ← Provedor | Dado consumido | Por que ele precisa | Federação |
|---|----------------------|----------------|--------------------|-----------|
| 1 | `cnc` ← `oven` | temperatura/curva do lote tratado (`zone1Temp_C`, `currentBatch`) | compensação térmica dos parâmetros de corte antes de iniciar a usinagem | **Privada** (dado de processo sensível: solicitação + aprovação) |
| 2 | `cnc` ← `press` | lote estampado e desvios (`batch`, métricas de prensagem) | ajuste de fixação/offsets para o lote específico | **Consórcio** da célula de conformação (entrada por convite) |
| 3 | `robot` ← `quality` | resultado dimensional (`dimDeviation_mm`, `lastResult`, `cpk`) | libera/ajusta o programa de solda conforme a qualidade das peças usinadas | **Privada** |
| 4 | `paint` ← `compressor` | pressão e ponto de orvalho (`dischargePressure_bar`, `dewPoint_C`) | bloqueia a pintura se o ar comprimido estiver fora de faixa | **Aberta** (utilidade da planta: assina o contrato e consome) |
| 5 | `agv` ← `warehouse` | fila de ordens e estoque (`openOrders`, `stockBlanks_units`) | decide a próxima missão de transporte | **Aberta** |

O desenho exercita de propósito **os três tipos de federação** (aberta,
consórcio e privada) e produz 5 fluxos P2P concorrentes através do sidecar —
a carga do Cenário 2 de métricas (10 CPS, 5 trocas simultâneas, Ethernet).

### Caso condutor para a dissertação

> O **CNC** não inicia a usinagem do lote sem (1) os dados térmicos do **forno**
> e (2) a identificação/desvios do lote vindos da **prensa**. Esses dados são
> descobertos no catálogo federado, negociados por contrato com políticas de
> governança herdadas e consumidos por P2P auditado na borda — demonstrando
> soberania, rastreabilidade e baixa latência no cenário intraorganizacional.

### Checklist quando formos implementar (depois das tarefas #4, #5 e #6)

- [ ] Registrar os 7 CPS da fleet como ativos no Dataspace (federações conforme a tabela)
- [ ] Criar as 3 federações: `plant1-utilities` (aberta), `plant1-forming-cell` (consórcio), `plant1-process-data` (privada)
- [ ] Executar os 3 fluxos de adesão distintos (contrato direto / convite / solicitação+aprovação)
- [ ] Tokens das 5 trocas ativos no sidecar
- [ ] Rodar carga com 5 consumos concorrentes (JMeter) + registrar métricas
- [ ] Escada de escalabilidade com `--scale`
