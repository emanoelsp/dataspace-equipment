// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "conveyor",
  "name": "Central Conveyor Line",
  "urn": "urn:dataspace:plant1:equipment:conveyor:mainline:001",
  "equipmentType": "Conveyor",
  "eclassClass": "27-02-01-01",
  "eclassIrdi": "0173-1#01-ADT334#001",
  "nameplate": {
    "manufacturerName": "Interroll Group",
    "productDesignation": "Modular Belt Conveyor MBC-600",
    "serialNumber": "INT-2022-4410",
    "yearOfConstruction": "2022",
    "orderCode": "MBC600-24M",
    "countryOfOrigin": "CH"
  },
  "technical": [
    [
      "ConveyorData",
      [
        [
          "Length_m",
          "xs:float",
          24
        ],
        [
          "BeltWidth_mm",
          "xs:int",
          600
        ],
        [
          "MaxSpeed_m_s",
          "xs:float",
          1.6
        ],
        [
          "MaxLoad_kg_m",
          "xs:float",
          45
        ]
      ]
    ]
  ],
  "states": [
    [
      "running",
      0.35
    ],
    [
      "idle",
      0.06
    ],
    [
      "jam",
      0.015
    ],
    [
      "error",
      0
    ]
  ],
  "runningStates": [
    "running"
  ],
  "metrics": [
    {
      "key": "speed_m_s",
      "gen": {
        "kind": "sine",
        "base": 0.85,
        "amp": 0.15,
        "period": 60000,
        "noise": 0.03,
        "min": 0,
        "max": 1.6
      },
      "decimals": 2,
      "onlyRunning": true
    },
    {
      "key": "motorCurrent_A",
      "gen": {
        "kind": "noise",
        "base": 11.2,
        "noise": 0.8,
        "min": 0,
        "max": 25
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "load_kg",
      "gen": {
        "kind": "sine",
        "base": 240,
        "amp": 90,
        "period": 45000,
        "noise": 15,
        "min": 0
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "itemsPerMin",
      "gen": {
        "kind": "noise",
        "base": 14,
        "noise": 2,
        "min": 0,
        "max": 30
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "beltTension_N",
      "gen": {
        "kind": "noise",
        "base": 1850,
        "noise": 40
      },
      "decimals": 0
    },
    {
      "key": "totalItems",
      "gen": {
        "kind": "counter",
        "period": 4300
      },
      "decimals": 0
    }
  ]
}
