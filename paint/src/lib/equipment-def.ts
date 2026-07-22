// Definição do equipamento — gerada por generate-cps-apps.mjs a partir de fleet-config.mjs
import type { EquipmentDef } from "./simulator"

export const EQUIPMENT: EquipmentDef = {
  "id": "paint",
  "name": "Paint Booth Line",
  "urn": "urn:dataspace:plant1:equipment:paint:booth:001",
  "equipmentType": "PaintBooth",
  "eclassClass": "27-01-08-02",
  "eclassIrdi": "0173-1#01-AHB227#001",
  "nameplate": {
    "manufacturerName": "Dürr Systems AG",
    "productDesignation": "EcoRP Compact Booth",
    "serialNumber": "DUR-2021-3302",
    "yearOfConstruction": "2021",
    "orderCode": "ERP-CB-04",
    "countryOfOrigin": "DE"
  },
  "technical": [
    [
      "BoothData",
      [
        [
          "ApplicationType",
          "xs:string",
          "Electrostatic spray, solvent-based"
        ],
        [
          "AirflowNominal_m3_h",
          "xs:int",
          24000
        ],
        [
          "TempWindow_C",
          "xs:string",
          "22–26"
        ],
        [
          "HumidityWindow_pct",
          "xs:string",
          "55–70"
        ]
      ]
    ]
  ],
  "states": [
    [
      "spraying",
      0.36
    ],
    [
      "flash-off",
      0.14
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
    "spraying",
    "flash-off"
  ],
  "metrics": [
    {
      "key": "boothTemp_C",
      "gen": {
        "kind": "sine",
        "base": 24.2,
        "amp": 1.2,
        "period": 300000,
        "noise": 0.2,
        "min": 18,
        "max": 30
      },
      "decimals": 1
    },
    {
      "key": "humidity_pct",
      "gen": {
        "kind": "sine",
        "base": 61,
        "amp": 5,
        "period": 420000,
        "phase": 0.9,
        "noise": 1,
        "min": 40,
        "max": 80
      },
      "decimals": 0
    },
    {
      "key": "airflow_m3_h",
      "gen": {
        "kind": "noise",
        "base": 23600,
        "noise": 350,
        "min": 0
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "paintFlow_ml_min",
      "gen": {
        "kind": "noise",
        "base": 410,
        "noise": 25,
        "min": 0
      },
      "decimals": 0,
      "onlyRunning": true
    },
    {
      "key": "viscosity_s",
      "gen": {
        "kind": "noise",
        "base": 22.5,
        "noise": 0.6,
        "min": 18,
        "max": 28
      },
      "decimals": 1
    },
    {
      "key": "filterSaturation_pct",
      "gen": {
        "kind": "sine",
        "base": 55,
        "amp": 30,
        "period": 7200000,
        "noise": 1,
        "min": 0,
        "max": 100
      },
      "decimals": 0
    },
    {
      "key": "partsCoated",
      "gen": {
        "kind": "counter",
        "period": 95000
      },
      "decimals": 0
    }
  ]
}
