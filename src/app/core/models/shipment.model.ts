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
  /** Última lectura del sensor; null mientras la SmartBox no haya reportado. */
  currentTemp: number | null;
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
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'DECOMMISSIONED';
  assignedShipmentId?: string;
  lastHeartbeat: string;
}

export type AlertSource = 'telemetry' | 'security' | 'containers';

export interface AlertItem {
  id: string;
  source: AlertSource;
  shipmentId: string;
  smartBoxId: string;
  type: 'TEMP_BREACH' | 'LID_OPEN' | 'UNAUTHORIZED_ACCESS' | 'LOW_BATTERY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
  /** Datos de desvío térmico (solo TEMP_BREACH). */
  temperature?: number;
  minTemp?: number;
  maxTemp?: number;
}

export interface AuditReport {
  shipmentId: string;
  customerAddress: string;
  thermalMode: ThermalMode;
  minTemp: number;
  maxTemp: number;
  smartBoxId: string;
  operatorName: string;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  otpCode: string;
  createdAt: string;
  deliveredAt: string | null;
  thermal: { readings: number; min: number | null; max: number | null; average: number | null; breaches: number; compliant: boolean };
  accessAttempts: { action: string; result: string; timestamp: string }[];
  tamperEvents: { lidOpen: boolean; authorized: boolean | null; forced: boolean; timestamp: string }[];
  /** Foto de entrega (data URL o URL); null si aún no se sincroniza. */
  evidence: { photo: string; uploadedAt: string } | null;
  thermalAlerts: { message: string; severity: string; timestamp: string; resolved: boolean }[];
}

export interface Operator {
  operatorId: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
  completedDeliveries: number;
  custodyRating: number | null;
}
