/**
 * Frota de CPS simulados — plant1 (linha de componentes metálicos).
 *
 * Completa a planta dos 3 CPS existentes (press → estampagem, cnc → usinagem,
 * robot → solda a ponto) com 7 equipamentos do mesmo fluxo produtivo:
 * armazém → transporte → estampagem → tratamento térmico → usinagem →
 * solda → pintura → inspeção.
 *
 * Cada metric.gen: { kind: "sine"|"noise"|"counter", base, amp, period(ms),
 * phase, noise, min, max } — mesmo estilo dos simuladores originais.
 * onlyRunning: métrica zera fora do estado produtivo.
 */

export const FLEET = [
  {
    id: "oven",
    name: "Heat Treatment Furnace",
    urn: "urn:dataspace:plant1:equipment:oven:heattreat:001",
    equipmentType: "Furnace",
    eclassClass: "27-01-07-05",
    eclassIrdi: "0173-1#01-AGE412#001",
    nameplate: { manufacturerName: "Aichelin Group", productDesignation: "Continuous Hardening Furnace CHF-650", serialNumber: "AIC-2023-0871", yearOfConstruction: "2023", orderCode: "CHF650-C2", countryOfOrigin: "AT" },
    technical: [
      ["FurnaceData", [
        ["FurnaceType", "xs:string", "Continuous belt, protective atmosphere"],
        ["MaxTemperature_C", "xs:float", 950, "0173-1#02-AAB211#001"],
        ["Zones", "xs:int", 2],
        ["BeltWidth_mm", "xs:int", 600],
        ["AtmosphereType", "xs:string", "Endothermic gas"],
      ]],
    ],
    states: [["soak", 0.4], ["heating", 0.15], ["idle", 0.03], ["error", 0]],
    runningStates: ["soak", "heating"],
    metrics: [
      { key: "zone1Temp_C", gen: { kind: "sine", base: 642, amp: 12, period: 180000, noise: 1.5 }, decimals: 1 },
      { key: "zone2Temp_C", gen: { kind: "sine", base: 655, amp: 9, period: 210000, phase: 1.2, noise: 1.5 }, decimals: 1 },
      { key: "setpoint_C", gen: { kind: "noise", base: 650, noise: 0 }, decimals: 0 },
      { key: "atmosphereCO_pct", gen: { kind: "noise", base: 20.4, noise: 0.4, min: 18, max: 23 }, decimals: 2 },
      { key: "beltSpeed_mm_min", gen: { kind: "noise", base: 320, noise: 8, min: 0, max: 500 }, decimals: 0, onlyRunning: true },
      { key: "energy_kWh", gen: { kind: "counter", period: 9000 }, decimals: 0 },
      { key: "currentBatch", gen: { kind: "batch", prefix: "HT", period: 1800000 } },
    ],
  },
  {
    id: "conveyor",
    name: "Central Conveyor Line",
    urn: "urn:dataspace:plant1:equipment:conveyor:mainline:001",
    equipmentType: "Conveyor",
    eclassClass: "27-02-01-01",
    eclassIrdi: "0173-1#01-ADT334#001",
    nameplate: { manufacturerName: "Interroll Group", productDesignation: "Modular Belt Conveyor MBC-600", serialNumber: "INT-2022-4410", yearOfConstruction: "2022", orderCode: "MBC600-24M", countryOfOrigin: "CH" },
    technical: [
      ["ConveyorData", [
        ["Length_m", "xs:float", 24.0],
        ["BeltWidth_mm", "xs:int", 600],
        ["MaxSpeed_m_s", "xs:float", 1.6],
        ["MaxLoad_kg_m", "xs:float", 45.0],
      ]],
    ],
    states: [["running", 0.35], ["idle", 0.06], ["jam", 0.015], ["error", 0]],
    runningStates: ["running"],
    metrics: [
      { key: "speed_m_s", gen: { kind: "sine", base: 0.85, amp: 0.15, period: 60000, noise: 0.03, min: 0, max: 1.6 }, decimals: 2, onlyRunning: true },
      { key: "motorCurrent_A", gen: { kind: "noise", base: 11.2, noise: 0.8, min: 0, max: 25 }, decimals: 1, onlyRunning: true },
      { key: "load_kg", gen: { kind: "sine", base: 240, amp: 90, period: 45000, noise: 15, min: 0 }, decimals: 0, onlyRunning: true },
      { key: "itemsPerMin", gen: { kind: "noise", base: 14, noise: 2, min: 0, max: 30 }, decimals: 0, onlyRunning: true },
      { key: "beltTension_N", gen: { kind: "noise", base: 1850, noise: 40 }, decimals: 0 },
      { key: "totalItems", gen: { kind: "counter", period: 4300 }, decimals: 0 },
    ],
  },
  {
    id: "agv",
    name: "AGV Material Handler",
    urn: "urn:dataspace:plant1:equipment:agv:handler:001",
    equipmentType: "AGV",
    eclassClass: "27-01-06-05",
    eclassIrdi: "0173-1#01-AFN891#001",
    nameplate: { manufacturerName: "KION Group / Dematic", productDesignation: "AGV FlexLoad 1200", serialNumber: "DEM-2024-1156", yearOfConstruction: "2024", orderCode: "FL1200-LI", countryOfOrigin: "DE" },
    technical: [
      ["VehicleData", [
        ["NavigationType", "xs:string", "Natural feature SLAM + QR"],
        ["PayloadMax_kg", "xs:float", 1200, "0173-1#02-AAV212#001"],
        ["MaxSpeed_m_s", "xs:float", 1.8],
        ["BatteryType", "xs:string", "LiFePO4 48V"],
      ]],
    ],
    states: [["mission", 0.38], ["charging", 0.12], ["idle", 0.04], ["error", 0]],
    runningStates: ["mission"],
    metrics: [
      { key: "battery_pct", gen: { kind: "sine", base: 68, amp: 24, period: 3600000, noise: 0.5, min: 5, max: 100 }, decimals: 0 },
      { key: "posX_m", gen: { kind: "sine", base: 60, amp: 45, period: 240000, noise: 0.5, min: 0, max: 120 }, decimals: 1, onlyRunning: true },
      { key: "posY_m", gen: { kind: "sine", base: 25, amp: 18, period: 300000, phase: 1.4, noise: 0.5, min: 0, max: 50 }, decimals: 1, onlyRunning: true },
      { key: "speed_m_s", gen: { kind: "noise", base: 1.2, noise: 0.3, min: 0, max: 1.8 }, decimals: 2, onlyRunning: true },
      { key: "payload_kg", gen: { kind: "noise", base: 640, noise: 180, min: 0, max: 1200 }, decimals: 0, onlyRunning: true },
      { key: "missionsCompleted", gen: { kind: "counter", period: 420000 }, decimals: 0 },
    ],
  },
  {
    id: "paint",
    name: "Paint Booth Line",
    urn: "urn:dataspace:plant1:equipment:paint:booth:001",
    equipmentType: "PaintBooth",
    eclassClass: "27-01-08-02",
    eclassIrdi: "0173-1#01-AHB227#001",
    nameplate: { manufacturerName: "Dürr Systems AG", productDesignation: "EcoRP Compact Booth", serialNumber: "DUR-2021-3302", yearOfConstruction: "2021", orderCode: "ERP-CB-04", countryOfOrigin: "DE" },
    technical: [
      ["BoothData", [
        ["ApplicationType", "xs:string", "Electrostatic spray, solvent-based"],
        ["AirflowNominal_m3_h", "xs:int", 24000],
        ["TempWindow_C", "xs:string", "22–26"],
        ["HumidityWindow_pct", "xs:string", "55–70"],
      ]],
    ],
    states: [["spraying", 0.36], ["flash-off", 0.14], ["idle", 0.04], ["error", 0]],
    runningStates: ["spraying", "flash-off"],
    metrics: [
      { key: "boothTemp_C", gen: { kind: "sine", base: 24.2, amp: 1.2, period: 300000, noise: 0.2, min: 18, max: 30 }, decimals: 1 },
      { key: "humidity_pct", gen: { kind: "sine", base: 61, amp: 5, period: 420000, phase: 0.9, noise: 1, min: 40, max: 80 }, decimals: 0 },
      { key: "airflow_m3_h", gen: { kind: "noise", base: 23600, noise: 350, min: 0 }, decimals: 0, onlyRunning: true },
      { key: "paintFlow_ml_min", gen: { kind: "noise", base: 410, noise: 25, min: 0 }, decimals: 0, onlyRunning: true },
      { key: "viscosity_s", gen: { kind: "noise", base: 22.5, noise: 0.6, min: 18, max: 28 }, decimals: 1 },
      { key: "filterSaturation_pct", gen: { kind: "sine", base: 55, amp: 30, period: 7200000, noise: 1, min: 0, max: 100 }, decimals: 0 },
      { key: "partsCoated", gen: { kind: "counter", period: 95000 }, decimals: 0 },
    ],
  },
  {
    id: "quality",
    name: "Dimensional Inspection Station",
    urn: "urn:dataspace:plant1:equipment:quality:inspection:001",
    equipmentType: "InspectionStation",
    eclassClass: "27-31-02-01",
    eclassIrdi: "0173-1#01-AQC518#001",
    nameplate: { manufacturerName: "Carl Zeiss IQS", productDesignation: "Inline CMM DuraMax RT", serialNumber: "ZEI-2023-0918", yearOfConstruction: "2023", orderCode: "DMX-RT-2", countryOfOrigin: "DE" },
    technical: [
      ["InspectionData", [
        ["MeasurementPrinciple", "xs:string", "Tactile CMM + 3D vision"],
        ["MPE_um", "xs:float", 2.4],
        ["MeasurementRange_mm", "xs:string", "500 x 500 x 500"],
        ["CycleTimeNominal_s", "xs:float", 42.0],
      ]],
    ],
    states: [["measuring", 0.4], ["loading", 0.12], ["idle", 0.04], ["error", 0]],
    runningStates: ["measuring"],
    metrics: [
      { key: "partsInspected", gen: { kind: "counter", period: 52000 }, decimals: 0 },
      { key: "defectRate_pct", gen: { kind: "noise", base: 1.6, noise: 0.5, min: 0, max: 8 }, decimals: 2 },
      { key: "dimDeviation_mm", gen: { kind: "noise", base: 0.004, noise: 0.018 }, decimals: 3 },
      { key: "cpk", gen: { kind: "sine", base: 1.48, amp: 0.12, period: 900000, noise: 0.02, min: 0.8, max: 2.2 }, decimals: 2 },
      { key: "cycleTime_s", gen: { kind: "noise", base: 43, noise: 3, min: 30, max: 70 }, decimals: 1, onlyRunning: true },
      { key: "lastResult", gen: { kind: "enum", values: ["pass", "pass", "pass", "pass", "fail"], period: 52000 } },
    ],
  },
  {
    id: "compressor",
    name: "Central Air Compressor",
    urn: "urn:dataspace:plant1:equipment:compressor:central:001",
    equipmentType: "Compressor",
    eclassClass: "27-30-02-01",
    eclassIrdi: "0173-1#01-AKD119#001",
    nameplate: { manufacturerName: "Atlas Copco", productDesignation: "GA 90 VSD+ FF", serialNumber: "ATC-2020-7745", yearOfConstruction: "2020", orderCode: "GA90-VSD-FF", countryOfOrigin: "BE" },
    technical: [
      ["CompressorData", [
        ["CompressorType", "xs:string", "Oil-injected rotary screw, VSD"],
        ["NominalPower_kW", "xs:float", 90, "0173-1#02-AAD316#004"],
        ["MaxPressure_bar", "xs:float", 10.0, "0173-1#02-AAI095#001"],
        ["FreeAirDelivery_m3_min", "xs:float", 16.4],
        ["IntegratedDryer", "xs:boolean", true],
      ]],
    ],
    states: [["loaded", 0.42], ["unloaded", 0.1], ["idle", 0.02], ["error", 0]],
    runningStates: ["loaded"],
    metrics: [
      { key: "dischargePressure_bar", gen: { kind: "sine", base: 7.2, amp: 0.25, period: 90000, noise: 0.05, min: 0, max: 10 }, decimals: 2 },
      { key: "flow_m3_min", gen: { kind: "noise", base: 13.8, noise: 1.1, min: 0, max: 16.4 }, decimals: 1, onlyRunning: true },
      { key: "dewPoint_C", gen: { kind: "sine", base: 3.2, amp: 1.0, period: 600000, noise: 0.3, min: -5, max: 12 }, decimals: 1 },
      { key: "oilTemp_C", gen: { kind: "sine", base: 78, amp: 6, period: 240000, noise: 1, min: 30, max: 110 }, decimals: 1 },
      { key: "vibration_mm_s", gen: { kind: "noise", base: 2.4, noise: 0.4, min: 0, max: 12 }, decimals: 2 },
      { key: "motorPower_kW", gen: { kind: "noise", base: 74, noise: 6, min: 0, max: 95 }, decimals: 0, onlyRunning: true },
      { key: "runningHours", gen: { kind: "counter", period: 3600000, offset: 31240 }, decimals: 0 },
    ],
  },
  {
    id: "warehouse",
    name: "Automated Storage (AS/RS)",
    urn: "urn:dataspace:plant1:equipment:warehouse:asrs:001",
    equipmentType: "ASRS",
    eclassClass: "27-05-01-01",
    eclassIrdi: "0173-1#01-ARW663#001",
    nameplate: { manufacturerName: "SSI Schäfer", productDesignation: "Miniload SMC-1", serialNumber: "SSI-2019-5521", yearOfConstruction: "2019", orderCode: "SMC1-18K", countryOfOrigin: "DE" },
    technical: [
      ["StorageData", [
        ["StorageLocations", "xs:int", 18000],
        ["CraneCount", "xs:int", 2],
        ["MaxThroughput_picks_h", "xs:int", 240],
        ["RackHeight_m", "xs:float", 14.5],
      ]],
    ],
    states: [["operating", 0.4], ["idle", 0.08], ["maintenance", 0.02], ["error", 0]],
    runningStates: ["operating"],
    metrics: [
      { key: "stockBlanks_units", gen: { kind: "sine", base: 5200, amp: 900, period: 14400000, noise: 20, min: 0 }, decimals: 0 },
      { key: "stockFinished_units", gen: { kind: "sine", base: 3100, amp: 700, period: 10800000, phase: 2.1, noise: 20, min: 0 }, decimals: 0 },
      { key: "picksPerHour", gen: { kind: "noise", base: 185, noise: 20, min: 0, max: 240 }, decimals: 0, onlyRunning: true },
      { key: "openOrders", gen: { kind: "sine", base: 34, amp: 18, period: 1800000, noise: 3, min: 0 }, decimals: 0 },
      { key: "cranePos_m", gen: { kind: "sine", base: 40, amp: 35, period: 50000, noise: 1, min: 0, max: 80 }, decimals: 1, onlyRunning: true },
      { key: "occupancy_pct", gen: { kind: "sine", base: 62, amp: 9, period: 14400000, noise: 0.5, min: 0, max: 100 }, decimals: 1 },
    ],
  },
]
