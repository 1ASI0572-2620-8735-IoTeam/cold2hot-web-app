import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { AlertItem, AuditReport, Shipment, SmartBox, ThermalReading } from '../models/shipment.model';
import { AuthService, errorMessage } from './auth.service';

interface ApiShipment {
  shipmentId: string;
  customerAddress: string;
  thermalMode: 'COLD' | 'HOT';
  minTemp: number;
  maxTemp: number;
  smartBoxId: string;
  operatorName: string;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  otpCode: string;
}
interface ApiReading {
  temperature: number;
  timestamp: string;
  lidOpen: boolean;
}
interface ApiBox {
  boxId: string;
  serialNumber: string;
  macAddress: string;
  status: SmartBox['status'];
  batteryLevel: number;
  lastHeartbeat: string | null;
}
interface ApiAlert {
  alertId: string;
  type: AlertItem['type'];
  severity: AlertItem['severity'];
  message?: string;
  shipmentId?: string;
  orderId?: string | null;
  smartBoxId?: string;
  boxId?: string;
  batteryLevel?: number;
  resolved: boolean;
  timestamp: string;
}

const POLL_MS = 4000;
const time = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour12: false });

const relative = (iso: string | null): string => {
  if (!iso) return 'sin señal';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace instantes';
  return min < 60 ? `hace ${min} min` : `hace ${Math.floor(min / 60)} h`;
};

/**
 * Estado de la plataforma obtenido del backend (a través del API Gateway) mediante polling.
 * Expone los signals que consumen las vistas.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private timer: ReturnType<typeof setInterval> | null = null;

  private shipmentsSignal = signal<Shipment[]>([]);
  private smartBoxesSignal = signal<SmartBox[]>([]);
  private alertsSignal = signal<AlertItem[]>([]);
  private errorSignal = signal<string | null>(null);

  readonly shipments = this.shipmentsSignal.asReadonly();
  readonly smartBoxes = this.smartBoxesSignal.asReadonly();
  readonly alerts = this.alertsSignal.asReadonly();
  /** Texto de la búsqueda global de la barra superior (filtra envíos). */
  readonly searchTerm = signal('');
  /** Mensaje de error de conexión con el backend (null si todo está bien). */
  readonly connectionError = this.errorSignal.asReadonly();

  readonly totalActive = computed(() => this.shipmentsSignal().length);
  readonly inTransitCount = computed(() => this.shipmentsSignal().filter(s => s.status === 'IN_TRANSIT').length);
  readonly criticalAlertsCount = computed(() => this.alertsSignal().filter(a => !a.resolved && a.severity === 'CRITICAL').length);
  readonly availableBoxesCount = computed(() => this.smartBoxesSignal().filter(b => b.status === 'AVAILABLE').length);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  private startPolling() {
    if (this.timer) return;
    this.refresh();
    this.timer = setInterval(() => this.refresh(), POLL_MS);
  }

  private stopPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.shipmentsSignal.set([]);
    this.smartBoxesSignal.set([]);
    this.alertsSignal.set([]);
  }

  private async safe<T>(req: Promise<T>, fallback: T): Promise<{ data: T; ok: boolean }> {
    try {
      return { data: await req, ok: true };
    } catch {
      return { data: fallback, ok: false };
    }
  }

  async refresh() {
    const get = <T>(url: string) => firstValueFrom(this.http.get<T>(url));
    const [ships, boxes, telAlerts, secAlerts, boxAlerts] = await Promise.all([
      this.safe(get<ApiShipment[]>(`${API.orders}/shipments`), [] as ApiShipment[]),
      this.safe(get<ApiBox[]>(`${API.containers}/smartboxes`), [] as ApiBox[]),
      this.safe(get<ApiAlert[]>(`${API.telemetry}/alerts`), [] as ApiAlert[]),
      this.safe(get<ApiAlert[]>(`${API.security}/alerts`), [] as ApiAlert[]),
      this.safe(get<ApiAlert[]>(`${API.containers}/alerts`), [] as ApiAlert[])
    ]);

    if (!ships.ok && !boxes.ok) {
      this.errorSignal.set('No se pudo conectar con el backend. Verifica que el API Gateway esté en ejecución.');
      return;
    }
    this.errorSignal.set(null);

    // SmartBoxes
    const active = ships.data.filter(s => s.status === 'IN_TRANSIT');
    this.smartBoxesSignal.set(
      boxes.data.map(b => {
        const assigned = active.find(s => s.smartBoxId === b.boxId);
        return {
          id: b.boxId,
          serialNumber: b.serialNumber,
          macAddress: b.macAddress,
          batteryLevel: b.batteryLevel,
          status: b.status,
          assignedShipmentId: assigned ? '#' + assigned.shipmentId : undefined,
          lastHeartbeat: relative(b.lastHeartbeat)
        };
      })
    );

    // Alertas unificadas (telemetría, seguridad, contenedores)
    const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const toAlert = (a: ApiAlert, source: AlertItem['source']) => {
      const ref = a.shipmentId || a.orderId;
      return {
        alert: {
          id: a.alertId,
          source,
          shipmentId: ref ? '#' + ref : '—',
          smartBoxId: a.smartBoxId || a.boxId || '—',
          type: a.type,
          severity: a.severity,
          message: a.message || `Batería baja: SmartBox ${a.boxId} con ${a.batteryLevel}% de carga restante.`,
          timestamp: time(a.timestamp),
          resolved: a.resolved
        } as AlertItem,
        at: new Date(a.timestamp).getTime()
      };
    };
    const merged = [
      ...telAlerts.data.map(a => toAlert(a, 'telemetry')),
      ...secAlerts.data.map(a => toAlert(a, 'security')),
      ...boxAlerts.data.map(a => toAlert(a, 'containers'))
    ].sort(
      (x, y) =>
        Number(x.alert.resolved) - Number(y.alert.resolved) ||
        rank[x.alert.severity] - rank[y.alert.severity] ||
        y.at - x.at
    );
    this.alertsSignal.set(merged.map(m => m.alert));

    // Detalle por envío: serie térmica y estado del cerrojo
    const details = await Promise.all(
      ships.data
        .filter(s => s.status !== 'DELIVERED')
        .map(async s => {
          const [hist, lock] = await Promise.all([
            this.safe(get<ApiReading[]>(`${API.telemetry}/shipments/${s.shipmentId}/history`), [] as ApiReading[]),
            this.safe(get<{ lockState: 'LOCKED' | 'UNLOCKED' }>(`${API.security}/locks/${s.smartBoxId}`), { lockState: 'LOCKED' as const })
          ]);
          return { s, readings: hist.data, lock: lock.data.lockState };
        })
    );

    const boxById = new Map(boxes.data.map(b => [b.boxId, b]));
    this.shipmentsSignal.set(
      details.map(({ s, readings, lock }) => {
        const last = readings[readings.length - 1];
        const temp = last ? last.temperature : null;
        const breach = temp !== null && (temp < s.minTemp || temp > s.maxTemp);
        const history: ThermalReading[] = readings.slice(-30).map(r => ({ timestamp: time(r.timestamp), temperature: r.temperature }));
        return {
          id: '#' + s.shipmentId,
          customerAddress: s.customerAddress,
          thermalMode: s.thermalMode,
          targetMinTemp: s.minTemp,
          targetMaxTemp: s.maxTemp,
          currentTemp: temp,
          thermalStatus: breach ? 'BREACH' : 'OPTIMAL',
          operatorName: s.operatorName,
          smartBoxId: s.smartBoxId,
          lockStatus: lock,
          batteryLevel: boxById.get(s.smartBoxId)?.batteryLevel ?? 0,
          status: breach ? 'CRITICAL' : s.status,
          otpCode: s.otpCode,
          lidOpen: !!last?.lidOpen,
          history
        } as Shipment;
      })
    );
  }

  async createShipment(data: {
    address: string;
    thermalMode: 'COLD' | 'HOT';
    minTemp: number;
    maxTemp: number;
    smartBoxId: string;
  }): Promise<{ ok: boolean; otpCode?: string; shipmentId?: string; error?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiShipment>(`${API.orders}/shipments`, {
          customerAddress: data.address,
          thermalMode: data.thermalMode,
          minTemp: data.minTemp,
          maxTemp: data.maxTemp,
          smartBoxId: data.smartBoxId,
          operatorName: this.auth.currentUser()?.name
        })
      );
      this.refresh();
      return { ok: true, otpCode: res.otpCode, shipmentId: res.shipmentId };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  async completeShipment(displayId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(this.http.patch(`${API.orders}/shipments/${displayId.replace('#', '')}/complete`, {}));
      this.refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  async resolveAlert(alertId: string) {
    const alert = this.alertsSignal().find(a => a.id === alertId);
    if (!alert) return;
    const base = alert.source === 'telemetry' ? API.telemetry : alert.source === 'security' ? API.security : API.containers;
    try {
      await firstValueFrom(this.http.patch(`${base}/alerts/${alertId}/resolve`, {}));
    } finally {
      this.refresh();
    }
  }

  async registerSmartBox(data: { serialNumber: string; macAddress: string; maxWeightKg: number }): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(this.http.post(`${API.containers}/smartboxes`, data));
      this.refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  auditReports(): Promise<AuditReport[]> {
    return firstValueFrom(this.http.get<AuditReport[]>(`${API.orders}/audit/reports`));
  }
}
