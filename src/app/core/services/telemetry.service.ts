import { Injectable, signal, computed } from '@angular/core';
import { Shipment, SmartBox, AlertItem } from '../models/shipment.model';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private shipmentsSignal = signal<Shipment[]>([
    {
      id: '#C2H-10482',
      customerAddress: 'Av. Arequipa 1450, Miraflores',
      thermalMode: 'HOT',
      targetMinTemp: 65,
      targetMaxTemp: 80,
      currentTemp: 68.4,
      thermalStatus: 'OPTIMAL',
      operatorName: 'Diego R.',
      smartBoxId: 'SB-014',
      lockStatus: 'LOCKED',
      batteryLevel: 87,
      status: 'IN_TRANSIT',
      otpCode: '482 71',
      lidOpen: false,
      history: [
        { timestamp: '14:10', temperature: 75.0 },
        { timestamp: '14:15', temperature: 72.8 },
        { timestamp: '14:20', temperature: 70.5 },
        { timestamp: '14:25', temperature: 69.1 },
        { timestamp: '14:30', temperature: 68.4 }
      ]
    },
    {
      id: '#C2H-10483',
      customerAddress: 'Jr. Cusco 320, Magdalena',
      thermalMode: 'COLD',
      targetMinTemp: 2,
      targetMaxTemp: 8,
      currentTemp: 4.2,
      thermalStatus: 'OPTIMAL',
      operatorName: 'Ana C.',
      smartBoxId: 'SB-022',
      lockStatus: 'LOCKED',
      batteryLevel: 62,
      status: 'IN_TRANSIT',
      otpCode: '195 44',
      lidOpen: false,
      history: [
        { timestamp: '14:12', temperature: 3.8 },
        { timestamp: '14:18', temperature: 4.0 },
        { timestamp: '14:24', temperature: 4.2 }
      ]
    },
    {
      id: '#C2H-10484',
      customerAddress: 'Calle Los Pinos 88, San Isidro',
      thermalMode: 'HOT',
      targetMinTemp: 65,
      targetMaxTemp: 80,
      currentTemp: 58.2,
      thermalStatus: 'BREACH',
      operatorName: 'Luis M.',
      smartBoxId: 'SB-007',
      lockStatus: 'LOCKED',
      batteryLevel: 14,
      status: 'CRITICAL',
      otpCode: '839 20',
      lidOpen: false,
      history: [
        { timestamp: '14:05', temperature: 66.0 },
        { timestamp: '14:15', temperature: 62.4 },
        { timestamp: '14:25', temperature: 58.2 }
      ]
    },
    {
      id: '#C2H-10485',
      customerAddress: 'Av. Javier Prado 2450, San Borja',
      thermalMode: 'COLD',
      targetMinTemp: 2,
      targetMaxTemp: 8,
      currentTemp: 5.6,
      thermalStatus: 'OPTIMAL',
      operatorName: 'Rosa P.',
      smartBoxId: 'SB-031',
      lockStatus: 'LOCKED',
      batteryLevel: 91,
      status: 'IN_TRANSIT',
      otpCode: '312 88',
      lidOpen: false,
      history: [
        { timestamp: '14:20', temperature: 5.0 },
        { timestamp: '14:26', temperature: 5.6 }
      ]
    },
    {
      id: '#C2H-10486',
      customerAddress: 'Av. Larco 812, Miraflores',
      thermalMode: 'HOT',
      targetMinTemp: 65,
      targetMaxTemp: 80,
      currentTemp: 73.1,
      thermalStatus: 'OPTIMAL',
      operatorName: 'Jorge T.',
      smartBoxId: 'SB-019',
      lockStatus: 'LOCKED',
      batteryLevel: 45,
      status: 'IN_TRANSIT',
      otpCode: '774 12',
      lidOpen: false,
      history: [
        { timestamp: '14:15', temperature: 76.0 },
        { timestamp: '14:28', temperature: 73.1 }
      ]
    }
  ]);

  private smartBoxesSignal = signal<SmartBox[]>([
    { id: 'SB-014', serialNumber: 'C2H-SN-9982', macAddress: 'C8:F0:9E:44:A1:12', batteryLevel: 87, status: 'IN_TRANSIT', assignedShipmentId: '#C2H-10482', lastHeartbeat: 'hace 1 min' },
    { id: 'SB-022', serialNumber: 'C2H-SN-9983', macAddress: 'C8:F0:9E:44:A1:25', batteryLevel: 62, status: 'IN_TRANSIT', assignedShipmentId: '#C2H-10483', lastHeartbeat: 'hace 2 min' },
    { id: 'SB-007', serialNumber: 'C2H-SN-9978', macAddress: 'C8:F0:9E:44:A0:99', batteryLevel: 14, status: 'IN_TRANSIT', assignedShipmentId: '#C2H-10484', lastHeartbeat: 'hace 1 min' },
    { id: 'SB-031', serialNumber: 'C2H-SN-9990', macAddress: 'C8:F0:9E:44:A2:04', batteryLevel: 91, status: 'IN_TRANSIT', assignedShipmentId: '#C2H-10485', lastHeartbeat: 'hace 3 min' },
    { id: 'SB-019', serialNumber: 'C2H-SN-9986', macAddress: 'C8:F0:9E:44:A1:77', batteryLevel: 45, status: 'IN_TRANSIT', assignedShipmentId: '#C2H-10486', lastHeartbeat: 'hace 1 min' },
    { id: 'SB-002', serialNumber: 'C2H-SN-9972', macAddress: 'C8:F0:9E:44:A0:15', batteryLevel: 100, status: 'AVAILABLE', lastHeartbeat: 'hace 5 min' },
    { id: 'SB-005', serialNumber: 'C2H-SN-9975', macAddress: 'C8:F0:9E:44:A0:52', batteryLevel: 96, status: 'AVAILABLE', lastHeartbeat: 'hace 4 min' },
    { id: 'SB-011', serialNumber: 'C2H-SN-9980', macAddress: 'C8:F0:9E:44:A1:03', batteryLevel: 88, status: 'AVAILABLE', lastHeartbeat: 'hace 8 min' }
  ]);

  private alertsSignal = signal<AlertItem[]>([
    {
      id: 'ALT-01',
      shipmentId: '#C2H-10484',
      smartBoxId: 'SB-007',
      type: 'TEMP_BREACH',
      severity: 'CRITICAL',
      message: 'Desvío térmico: Temperatura actual (58.2°C) inferior al límite mínimo permitido (65.0°C).',
      timestamp: '14:25:12',
      resolved: false
    },
    {
      id: 'ALT-02',
      shipmentId: '#C2H-10484',
      smartBoxId: 'SB-007',
      type: 'LOW_BATTERY',
      severity: 'WARNING',
      message: 'Batería crítica: SmartBox SB-007 con 14% de carga restante.',
      timestamp: '14:18:00',
      resolved: false
    }
  ]);

  readonly shipments = this.shipmentsSignal.asReadonly();
  readonly smartBoxes = this.smartBoxesSignal.asReadonly();
  readonly alerts = this.alertsSignal.asReadonly();

  readonly totalActive = computed(() => this.shipmentsSignal().length);
  readonly inTransitCount = computed(() => this.shipmentsSignal().filter(s => s.status === 'IN_TRANSIT').length);
  readonly criticalAlertsCount = computed(() => this.alertsSignal().filter(a => !a.resolved && a.severity === 'CRITICAL').length);
  readonly availableBoxesCount = computed(() => this.smartBoxesSignal().filter(b => b.status === 'AVAILABLE').length);

  constructor() {
    this.startTelemetryStream();
  }

  private startTelemetryStream() {
    // Simula telemetría periódica del ESP32 NodeMCU
    setInterval(() => {
      this.shipmentsSignal.update(list => 
        list.map(s => {
          if (s.status === 'DELIVERED') return s;
          // Pequeña fluctuación térmica realista ±0.2°C
          const delta = (Math.random() - 0.5) * 0.4;
          const newTemp = Math.round((s.currentTemp + delta) * 10) / 10;
          
          let thermalStatus = s.thermalStatus;
          if (newTemp < s.targetMinTemp || newTemp > s.targetMaxTemp) {
            thermalStatus = 'BREACH';
          } else {
            thermalStatus = 'OPTIMAL';
          }

          return {
            ...s,
            currentTemp: newTemp,
            thermalStatus,
            history: [
              ...s.history.slice(-10),
              { timestamp: new Date().toLocaleTimeString().slice(0, 5), temperature: newTemp }
            ]
          };
        })
      );
    }, 4000);
  }

  createShipment(shipmentData: {
    address: string;
    thermalMode: 'COLD' | 'HOT';
    minTemp: number;
    maxTemp: number;
    smartBoxId: string;
  }): { shipment: Shipment; otpCode: string } {
    const id = '#C2H-' + Math.floor(10000 + Math.random() * 90000);
    const otp = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(10 + Math.random() * 90)}`;
    const initialTemp = shipmentData.thermalMode === 'HOT' ? 74.5 : 4.5;

    const newShipment: Shipment = {
      id,
      customerAddress: shipmentData.address,
      thermalMode: shipmentData.thermalMode,
      targetMinTemp: shipmentData.minTemp,
      targetMaxTemp: shipmentData.maxTemp,
      currentTemp: initialTemp,
      thermalStatus: 'OPTIMAL',
      operatorName: 'Carlos M.',
      smartBoxId: shipmentData.smartBoxId,
      lockStatus: 'LOCKED',
      batteryLevel: 98,
      status: 'IN_TRANSIT',
      otpCode: otp,
      lidOpen: false,
      history: [{ timestamp: new Date().toLocaleTimeString().slice(0, 5), temperature: initialTemp }]
    };

    this.shipmentsSignal.update(prev => [newShipment, ...prev]);

    // Marcar la caja como en tránsito
    this.smartBoxesSignal.update(boxes =>
      boxes.map(b => b.id === shipmentData.smartBoxId ? { ...b, status: 'IN_TRANSIT', assignedShipmentId: id } : b)
    );

    return { shipment: newShipment, otpCode: otp };
  }

  resolveAlert(alertId: string) {
    this.alertsSignal.update(alerts =>
      alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a)
    );
  }
}
