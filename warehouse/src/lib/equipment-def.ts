// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "warehouse",
  "name": "Automated Storage (AS/RS)",
  "urn": "urn:dataspace:plant1:equipment:warehouse:asrs:001",
  "equipmentType": "ASRS",
  "eclassClass": "27-05-01-01",
  "eclassIrdi": "0173-1#01-ARW663#001",
  "nameplate": {
    "manufacturerName": "SSI Schäfer",
    "productDesignation": "Miniload SMC-1",
    "serialNumber": "SSI-2019-5521",
    "yearOfConstruction": "2019",
    "orderCode": "SMC1-18K",
    "countryOfOrigin": "DE"
  },
  "technical": [
    [
      "StorageData",
      [
        [
          "StorageLocations",
          "xs:int",
          18000
        ],
        [
          "CraneCount",
          "xs:int",
          2
        ],
        [
          "MaxThroughput_picks_h",
          "xs:int",
          240
        ],
        [
          "RackHeight_m",
          "xs:float",
          14.5
        ]
      ]
    ]
  ],
  "states": [
    [
      "operating",
      0.4
    ],
    [
      "idle",
      0.08
    ],
    [
      "maintenance",
      0.02
    ],
    [
      "error",
      0
    ]
  ],
  "runningStates": [
    "operating"
  ],
  "metrics": [
    {
      "key": "stockBlanks_units",
      "gen": {
        "kind": "sine",
        "base": 5200,
        "amp": 900,
        "period": 14400000,
        "noise": 20,
        "min": 0
      },
      "decimals": 0
    },
    {
      "key": "stockFinished_units",
      "gen": {
        "kind": "sine",
        "base": 3100,
        "amp": 700,
        "period": 10800000,
        "phase": 2.1,
        "noise": 20,
        "min": 0
      },
      "decimals": 0
    },
    {
      "key": "picksPerHour",
      "gen": {
        "kind": "noise",
        "base": 185,
        "noise": 20,
        "min": 0,
        "max": 240
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "openOrders",
      "gen": {
        "kind": "sine",
        "base": 34,
        "amp": 18,
        "period": 1800000,
        "noise": 3,
        "min": 0
      },
      "decimals": 0
    },
    {
      "key": "cranePos_m",
      "gen": {
        "kind": "sine",
        "base": 40,
        "amp": 35,
        "period": 50000,
        "noise": 1,
        "min": 0,
        "max": 80
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "occupancy_pct",
      "gen": {
        "kind": "sine",
        "base": 62,
        "amp": 9,
        "period": 14400000,
        "noise": 0.5,
        "min": 0,
        "max": 100
      },
      "decimals": 1
    }
  ]
}
