// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "quality",
  "name": "Dimensional Inspection Station",
  "urn": "urn:dataspace:plant1:equipment:quality:inspection:001",
  "equipmentType": "InspectionStation",
  "eclassClass": "27-31-02-01",
  "eclassIrdi": "0173-1#01-AQC518#001",
  "nameplate": {
    "manufacturerName": "Carl Zeiss IQS",
    "productDesignation": "Inline CMM DuraMax RT",
    "serialNumber": "ZEI-2023-0918",
    "yearOfConstruction": "2023",
    "orderCode": "DMX-RT-2",
    "countryOfOrigin": "DE"
  },
  "technical": [
    [
      "InspectionData",
      [
        [
          "MeasurementPrinciple",
          "xs:string",
          "Tactile CMM + 3D vision"
        ],
        [
          "MPE_um",
          "xs:float",
          2.4
        ],
        [
          "MeasurementRange_mm",
          "xs:string",
          "500 x 500 x 500"
        ],
        [
          "CycleTimeNominal_s",
          "xs:float",
          42
        ]
      ]
    ]
  ],
  "states": [
    [
      "measuring",
      0.4
    ],
    [
      "loading",
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
    "measuring"
  ],
  "metrics": [
    {
      "key": "partsInspected",
      "gen": {
        "kind": "counter",
        "period": 52000
      },
      "decimals": 0
    },
    {
      "key": "defectRate_pct",
      "gen": {
        "kind": "noise",
        "base": 1.6,
        "noise": 0.5,
        "min": 0,
        "max": 8
      },
      "decimals": 2
    },
    {
      "key": "dimDeviation_mm",
      "gen": {
        "kind": "noise",
        "base": 0.004,
        "noise": 0.018
      },
      "decimals": 3
    },
    {
      "key": "cpk",
      "gen": {
        "kind": "sine",
        "base": 1.48,
        "amp": 0.12,
        "period": 900000,
        "noise": 0.02,
        "min": 0.8,
        "max": 2.2
      },
      "decimals": 2
    },
    {
      "key": "cycleTime_s",
      "gen": {
        "kind": "noise",
        "base": 43,
        "noise": 3,
        "min": 30,
        "max": 70
      },
      "decimals": 1,
      "onlyRunning": true
    },
    {
      "key": "lastResult",
      "gen": {
        "kind": "enum",
        "values": [
          "pass",
          "pass",
          "pass",
          "pass",
          "fail"
        ],
        "period": 52000
      }
    }
  ]
}
