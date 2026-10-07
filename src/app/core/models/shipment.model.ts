export type ThermalMode = 'COLD' | 'HOT';
export type ThermalStatus = 'OPTIMAL' | 'WARNING' | 'BREACH';
export type LockStatus = 'LOCKED' | 'UNLOCKED';
export type ShipmentStatus = 'IN_TRANSIT' | 'PENDING' | 'DELIVERED' | 'CRITICAL';

export interface ThermalReading {
  timestamp: string;
  temperature: number;
}

export interface Shipment {
  id: string; // e.g. #C2H-10482
  customerAddress: string;
  thermalMode: ThermalMode;
  targetMinTemp: number;
  targetMaxTemp: number;
  currentTemp: number;
  thermalStatus: ThermalStatus;
  operatorName: string;
  smartBoxId: string;
  lockStatus: LockStatus;
  batteryLevel: number;
  status: ShipmentStatus;
  otpCode: string;
  lidOpen: boolean;
  history: ThermalReading[];
}

export interface SmartBox {
  id: string; // e.g. SB-014
  serialNumber: string;
  macAddress: string;
  batteryLevel: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE';
  assignedShipmentId?: string;
  lastHeartbeat: string;
}

export interface AlertItem {
  id: string;
  shipmentId: string;
  smartBoxId: string;
  type: 'TEMP_BREACH' | 'LID_OPEN' | 'UNAUTHORIZED_ACCESS' | 'LOW_BATTERY';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
}
