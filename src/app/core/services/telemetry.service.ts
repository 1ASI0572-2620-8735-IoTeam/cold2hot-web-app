import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { AlertItem, AuditReport, Shipment, SmartBox, ThermalReading } from '../models/shipment.model';
import { AuthService, errorMessage } from './auth.service';

export interface ApiOrder {
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  smartBoxId: string;
  operatorId: string;
  operatorName: string;
  thermalProfile: { type: 'COLD' | 'HOT'; minTemperature: number; maxTemperature: number };
  status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  incidents: string[];
  createdAt: string;
  deliveredAt: string | null;
}
interface ApiAudit {
  custodyStatus: 'VERIFIED' | 'THERMAL_BREACH' | 'UNAUTHORIZED_ACCESS';
  thermalHistory: ApiReading[];
  accessAttempts: { action: string; result: string; timestamp: string }[];
  openingEvents: { lidOpen: boolean; authorized: boolean | null; forced: boolean; timestamp: string }[];
  evidence?: { photoUrl?: string | null; photoBase64?: string | null; uploadedAt?: string } | null;
  securityAlerts: { type: string; message: string; severity: string; timestamp: string; resolved: boolean }[];
}
interface ApiReading {
  temperature: number;
  timestamp: string;
  lidOpen: boolean;
  inRange?: boolean | null;
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
  type: AlertItem['type'] | 'THERMAL_BREACH';
  severity: AlertItem['severity'];
  message?: string;
  temperature?: number;
  minTemperature?: number;
  maxTemperature?: number;
  shipmentId?: string;
  orderId?: string | null;
  smartBoxId?: string;
  boxId?: string;
  batteryLevel?: number;
  resolved: boolean;
  timestamp: string;
}

const POLL_MS = 4000;
/** Lecturas por envío que se piden al backend (suficiente para gráficas); evita descargar toda la serie. */
const HISTORY_LIMIT = 30;
const ALERTS_LIMIT = 200;

/** Mantiene la referencia anterior si el contenido no cambió, para no volver a renderizar. */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
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
    this.timer = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) this.refresh();
    }, POLL_MS);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible);
  }

  /** Al volver a la pestaña se actualiza al instante (en segundo plano no se consulta). */
  private onVisible = () => {
    if (!document.hidden && this.timer) this.refresh();
  };
  private inFlight = false;

  /** Asigna el signal solo si los datos cambiaron. */
  private update<T>(sig: { (): T; set(v: T): void }, next: T) {
    if (!same(sig(), next)) sig.set(next);
  }

  private stopPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
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
    if (this.inFlight) return; // no solapar consultas si el backend responde lento
    this.inFlight = true;
    try {
      await this.load();
    } finally {
      this.inFlight = false;
    }
  }

  private async load() {
    const get = <T>(url: string) => firstValueFrom(this.http.get<T>(url));
    const [ships, boxes, telAlerts, secAlerts, boxAlerts] = await Promise.all([
      this.safe(get<ApiOrder[]>(`${API.orders}?status=IN_TRANSIT`), [] as ApiOrder[]),
      this.safe(get<ApiBox[]>(`${API.containers}/smartboxes`), [] as ApiBox[]),
      this.safe(get<ApiAlert[]>(`${API.telemetry}/alerts?limit=${ALERTS_LIMIT}`), [] as ApiAlert[]),
      this.safe(get<ApiAlert[]>(`${API.security}/alerts`), [] as ApiAlert[]),
      this.safe(get<ApiAlert[]>(`${API.containers}/alerts`), [] as ApiAlert[])
    ]);

    if (!ships.ok && !boxes.ok) {
      this.errorSignal.set('No se pudo conectar con el backend. Verifica que el API Gateway esté en ejecución.');
      return;
    }
    if (this.errorSignal() !== null) this.errorSignal.set(null);

    // SmartBoxes
    const active = ships.data;
    this.update(this.smartBoxesSignal,
      boxes.data.map(b => {
        const assigned = active.find(s => s.smartBoxId === b.boxId);
        return {
          id: b.boxId,
          serialNumber: b.serialNumber,
          macAddress: b.macAddress,
          batteryLevel: b.batteryLevel,
          status: b.status,
          assignedShipmentId: assigned ? '#' + assigned.orderId : undefined,
          lastHeartbeat: relative(b.lastHeartbeat)
        };
      })
    );

    // Alertas unificadas (telemetría, seguridad, contenedores)
    const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const toAlert = (a: ApiAlert, source: AlertItem['source']) => {
      const ref = (a.shipmentId || a.orderId || '').replace('#', '');
      const type = a.type === 'THERMAL_BREACH' ? 'TEMP_BREACH' : a.type;
      return {
        alert: {
          id: a.alertId,
          source,
          shipmentId: ref ? '#' + ref : '—',
          smartBoxId: a.smartBoxId || a.boxId || '—',
          type,
          severity: a.severity,
          message: a.message || `Batería baja: SmartBox ${a.boxId} con ${a.batteryLevel}% de carga restante.`,
          timestamp: time(a.timestamp),
          resolved: a.resolved,
          temperature: a.temperature,
          minTemp: a.minTemperature,
          maxTemp: a.maxTemperature
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
    this.update(this.alertsSignal, merged.map(m => m.alert).slice(0, ALERTS_LIMIT));

    // Detalle por envío: serie térmica y estado del cerrojo
    const details = await Promise.all(
      ships.data.map(async s => {
        const [hist, lock] = await Promise.all([
          this.safe(get<{ history: ApiReading[] }>(`${API.telemetry}/boxes/${s.smartBoxId}/history?orderId=${s.orderId}&limit=${HISTORY_LIMIT}`), { history: [] as ApiReading[] }),
          this.safe(get<{ lockState: 'LOCKED' | 'UNLOCKED' }>(`${API.security}/locks/${s.smartBoxId}`), { lockState: 'LOCKED' as const })
        ]);
        return { s, readings: hist.data.history ?? [], lock: lock.data.lockState };
      })
    );

    const boxById = new Map(boxes.data.map(b => [b.boxId, b]));
    this.update(this.shipmentsSignal,
      details.map(({ s, readings, lock }) => {
        const last = readings[readings.length - 1];
        const temp = last ? last.temperature : null;
        const { minTemperature: lo, maxTemperature: hi } = s.thermalProfile;
        const breach = temp !== null && (temp < lo || temp > hi);
        const history: ThermalReading[] = readings.map(r => ({ timestamp: time(r.timestamp), temperature: r.temperature }));
        return {
          id: '#' + s.orderId,
          customerAddress: s.deliveryAddress,
          thermalMode: s.thermalProfile.type,
          targetMinTemp: lo,
          targetMaxTemp: hi,
          currentTemp: temp,
          thermalStatus: breach ? 'BREACH' : 'OPTIMAL',
          operatorName: s.operatorName,
          smartBoxId: s.smartBoxId,
          lockStatus: lock,
          batteryLevel: boxById.get(s.smartBoxId)?.batteryLevel ?? 0,
          status: breach ? 'CRITICAL' : 'IN_TRANSIT',
          otpCode: '',
          lidOpen: !!last?.lidOpen,
          history
        } as Shipment;
      })
    );
  }

  async createShipment(data: {
    customerName: string;
    address: string;
    thermalMode: 'COLD' | 'HOT';
    minTemp: number;
    maxTemp: number;
    smartBoxId: string;
    operatorId: string;
    operatorName: string;
  }): Promise<{ ok: boolean; otpCode?: string; shipmentId?: string; error?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiOrder & { otp: { code: string } | null }>(`${API.orders}`, {
          customerName: data.customerName,
          deliveryAddress: data.address,
          smartBoxId: data.smartBoxId,
          operatorId: data.operatorId,
          operatorName: data.operatorName,
          thermalProfile: { type: data.thermalMode, minTemperature: data.minTemp, maxTemperature: data.maxTemp }
        })
      );
      this.refresh();
      return { ok: true, otpCode: res.otp?.code, shipmentId: res.orderId };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  /** Confirma la entrega adjuntando la foto de evidencia (data URL en base64). */
  async completeShipment(displayId: string, photoBase64: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(this.http.post(`${API.orders}/${displayId.replace('#', '')}/evidence`, { photoBase64 }));
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

  /** OTP vigente del envío, para dar soporte al cliente. */
  async otpFor(displayId: string): Promise<{ code: string; state: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' } | null> {
    try {
      return await firstValueFrom(this.http.get<{ code: string; state: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' }>(`${API.security}/otp?orderId=${displayId.replace('#', '')}`));
    } catch {
      return null;
    }
  }

  /** Todos los envíos (más recientes primero); los reportes se piden por páginas. */
  historyOrders(): Promise<ApiOrder[]> {
    return firstValueFrom(this.http.get<ApiOrder[]>(`${API.orders}`));
  }

  /** Cumplimiento de custodia del mes, calculado por el backend. */
  fleetStats() {
    return firstValueFrom(this.http.get<{ fleet: { totalDeliveries: number; perfectDeliveries: number; compliancePercent: number } }>(`${API.orders}/analytics/operators`));
  }

  /** Reportes de auditoría de los envíos indicados. */
  reportsFor(orders: ApiOrder[]): Promise<AuditReport[]> {
    return Promise.all(
      orders.map(async o => {
        const a = await firstValueFrom(this.http.get<ApiAudit>(`${API.orders}/audits/${o.orderId}`));
        const logs = a.thermalHistory ?? [];
        const temps = logs.map(l => l.temperature);
        const breaches = logs.filter(l => l.inRange === false).length;
        return {
          shipmentId: o.orderId,
          customerAddress: o.deliveryAddress,
          thermalMode: o.thermalProfile.type,
          minTemp: o.thermalProfile.minTemperature,
          maxTemp: o.thermalProfile.maxTemperature,
          smartBoxId: o.smartBoxId,
          operatorName: o.operatorName,
          status: o.status === 'DELIVERED' ? 'DELIVERED' : o.status === 'CANCELLED' ? 'CANCELLED' : 'IN_TRANSIT',
          otpCode: '',
          createdAt: o.createdAt,
          deliveredAt: o.deliveredAt,
          thermal: {
            readings: temps.length,
            min: temps.length ? Math.min(...temps) : null,
            max: temps.length ? Math.max(...temps) : null,
            average: temps.length ? Math.round((temps.reduce((x, y) => x + y, 0) / temps.length) * 10) / 10 : null,
            breaches,
            compliant: a.custodyStatus === 'VERIFIED' && breaches === 0
          },
          accessAttempts: a.accessAttempts ?? [],
          tamperEvents: a.openingEvents ?? [],
          evidence: a.evidence && (a.evidence.photoBase64 || a.evidence.photoUrl) ? { photo: (a.evidence.photoBase64 || a.evidence.photoUrl)!, uploadedAt: a.evidence.uploadedAt ?? '' } : null,
          thermalAlerts: (a.securityAlerts ?? []).filter(x => x.type === 'THERMAL_BREACH')
        } as AuditReport;
      })
    );
  }
}
