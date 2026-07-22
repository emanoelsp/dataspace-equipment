// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "compressor",
  "name": "Central Air Compressor",
  "urn": "urn:dataspace:plant1:equipment:compressor:central:001",
  "equipmentType": "Compressor",
  "eclassClass": "27-30-02-01",
  "eclassIrdi": "0173-1#01-AKD119#001",
  "nameplate": {
    "manufacturerName": "Atlas Copco",
    "productDesignation": "GA 90 VSD+ FF",
    "serialNumber": "ATC-2020-7745",
    "yearOfConstruction": "2020",
    "orderCode": "GA90-VSD-FF",
    "countryOfOrigin": "BE"
  },
  "technical": [
    [
      "CompressorData",
      [
        [
          "CompressorType",
          "xs:string",
          "Oil-injected rotary screw, VSD"
        ],
        [
          "NominalPower_kW",
          "xs:float",
          90,
          "0173-1#02-AAD316#004"
        ],
        [
          "MaxPressure_bar",
          "xs:float",
          10,
          "0173-1#02-AAI095#001"
        ],
        [
          "FreeAirDelivery_m3_min",
          "xs:float",
          16.4
        ],
        [
          "IntegratedDryer",
          "xs:boolean",
          true
        ]
      ]
    ]
  ],
  "states": [
    [
      "loaded",
      0.42
    ],
    [
      "unloaded",
      0.1
    ],
    [
      "idle",
      0.02
    ],
    [
      "error",
      0
    ]
  ],
  "runningStates": [
    "loaded"
  ],
  "metrics": [
    {
      "key": "dischargePressure_bar",
      "gen": {
        "kind": "sine",
        "base": 7.2,
        "amp": 0.25,
        "period": 90000,
        "noise": 0.05,
        "min": 0,
        "max": 10
      },
      "decimals": 2
    },
    {
      "key": "flow_m3_min",
      "gen": {
        "kind": "noise",
        "base": 13.8,
        "noise": 1.1,
        "min": 0,
        "max": 16.4
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "dewPoint_C",
      "gen": {
        "kind": "sine",
        "base": 3.2,
        "amp": 1,
        "period": 600000,
        "noise": 0.3,
        "min": -5,
        "max": 12
      },
      "decimals": 1
    },
    {
      "key": "oilTemp_C",
      "gen": {
        "kind": "sine",
        "base": 78,
        "amp": 6,
        "period": 240000,
        "noise": 1,
        "min": 30,
        "max": 110
      },
      "decimals": 1
    },
    {
      "key": "vibration_mm_s",
      "gen": {
        "kind": "noise",
        "base": 2.4,
        "noise": 0.4,
        "min": 0,
        "max": 12
      },
      "decimals": 2
    },
    {
      "key": "motorPower_kW",
      "gen": {
        "kind": "noise",
        "base": 74,
        "noise": 6,
        "min": 0,
        "max": 95
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "runningHours",
      "gen": {
        "kind": "counter",
        "period": 3600000,
        "offset": 31240
      },
      "decimals": 0
    }
  ]
}
