// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "agv",
  "name": "AGV Material Handler",
  "urn": "urn:dataspace:plant1:equipment:agv:handler:001",
  "equipmentType": "AGV",
  "eclassClass": "27-01-06-05",
  "eclassIrdi": "0173-1#01-AFN891#001",
  "nameplate": {
    "manufacturerName": "KION Group / Dematic",
    "productDesignation": "AGV FlexLoad 1200",
    "serialNumber": "DEM-2024-1156",
    "yearOfConstruction": "2024",
    "orderCode": "FL1200-LI",
    "countryOfOrigin": "DE"
  },
  "technical": [
    [
      "VehicleData",
      [
        [
          "NavigationType",
          "xs:string",
          "Natural feature SLAM + QR"
        ],
        [
          "PayloadMax_kg",
          "xs:float",
          1200,
          "0173-1#02-AAV212#001"
        ],
        [
          "MaxSpeed_m_s",
          "xs:float",
          1.8
        ],
        [
          "BatteryType",
          "xs:string",
          "LiFePO4 48V"
        ]
      ]
    ]
  ],
  "states": [
    [
      "mission",
      0.38
    ],
    [
      "charging",
      0.12
    ],
    [
      "idle",
      0.04
    ],
    [
      "error",
      0
    ]
  ],
  "runningStates": [
    "mission"
  ],
  "metrics": [
    {
      "key": "battery_pct",
      "gen": {
        "kind": "sine",
        "base": 68,
        "amp": 24,
        "period": 3600000,
        "noise": 0.5,
        "min": 5,
        "max": 100
      },
      "decimals": 0
    },
    {
      "key": "posX_m",
      "gen": {
        "kind": "sine",
        "base": 60,
        "amp": 45,
        "period": 240000,
        "noise": 0.5,
        "min": 0,
        "max": 120
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "posY_m",
      "gen": {
        "kind": "sine",
        "base": 25,
        "amp": 18,
        "period": 300000,
        "phase": 1.4,
        "noise": 0.5,
        "min": 0,
        "max": 50
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "speed_m_s",
      "gen": {
        "kind": "noise",
        "base": 1.2,
        "noise": 0.3,
        "min": 0,
        "max": 1.8
      },
      "decimals": 2,
      "onlyRunning": true
    },
    {
      "key": "payload_kg",
      "gen": {
        "kind": "noise",
        "base": 640,
        "noise": 180,
        "min": 0,
        "max": 1200
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "missionsCompleted",
      "gen": {
        "kind": "counter",
        "period": 420000
      },
      "decimals": 0
    }
  ]
}
