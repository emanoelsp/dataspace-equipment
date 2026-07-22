// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "oven",
  "name": "Heat Treatment Furnace",
  "urn": "urn:dataspace:plant1:equipment:oven:heattreat:001",
  "equipmentType": "Furnace",
  "eclassClass": "27-01-07-05",
  "eclassIrdi": "0173-1#01-AGE412#001",
  "nameplate": {
    "manufacturerName": "Aichelin Group",
    "productDesignation": "Continuous Hardening Furnace CHF-650",
    "serialNumber": "AIC-2023-0871",
    "yearOfConstruction": "2023",
    "orderCode": "CHF650-C2",
    "countryOfOrigin": "AT"
  },
  "technical": [
    [
      "FurnaceData",
      [
        [
          "FurnaceType",
          "xs:string",
          "Continuous belt, protective atmosphere"
        ],
        [
          "MaxTemperature_C",
          "xs:float",
          950,
          "0173-1#02-AAB211#001"
        ],
        [
          "Zones",
          "xs:int",
          2
        ],
        [
          "BeltWidth_mm",
          "xs:int",
          600
        ],
        [
          "AtmosphereType",
          "xs:string",
          "Endothermic gas"
        ]
      ]
    ]
  ],
  "states": [
    [
      "soak",
      0.4
    ],
    [
      "heating",
      0.15
    ],
    [
      "idle",
      0.03
    ],
    [
      "error",
      0
    ]
  ],
  "runningStates": [
    "soak",
    "heating"
  ],
  "metrics": [
    {
      "key": "zone1Temp_C",
      "gen": {
        "kind": "sine",
        "base": 642,
        "amp": 12,
        "period": 180000,
        "noise": 1.5
      },
      "decimals": 1
    },
    {
      "key": "zone2Temp_C",
      "gen": {
        "kind": "sine",
        "base": 655,
        "amp": 9,
        "period": 210000,
        "phase": 1.2,
        "noise": 1.5
      },
      "decimals": 1
    },
    {
      "key": "setpoint_C",
      "gen": {
        "kind": "noise",
        "base": 650,
        "noise": 0
      },
      "decimals": 0
    },
    {
      "key": "atmosphereCO_pct",
      "gen": {
        "kind": "noise",
        "base": 20.4,
        "noise": 0.4,
        "min": 18,
        "max": 23
      },
      "decimals": 2
    },
    {
      "key": "beltSpeed_mm_min",
      "gen": {
        "kind": "noise",
        "base": 320,
        "noise": 8,
        "min": 0,
        "max": 500
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "energy_kWh",
      "gen": {
        "kind": "counter",
        "period": 9000
      },
      "decimals": 0
    },
    {
      "key": "currentBatch",
      "gen": {
        "kind": "batch",
        "prefix": "HT",
        "period": 1800000
      }
    }
  ]
}
