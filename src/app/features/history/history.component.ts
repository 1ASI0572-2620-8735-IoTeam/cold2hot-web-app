import { RevealDirective } from '../../shared/reveal.directive';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditReport } from '../../core/models/shipment.model';
import { TelemetryService } from '../../core/services/telemetry.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  template: `
    <div class="hist-container">
      <div class="hist-header">
        <div>
          <h2 class="section-title">Historial de entregas</h2>
          <p class="section-sub">Trazabilidad térmica y de accesos por envío (auditoría)</p>
        </div>
        <button class="btn btn-secondary" (click)="load()">↻ Actualizar</button>
      </div>

      <p *ngIf="error" class="hist-error">{{ error }}</p>
      <p *ngIf="!error && loaded && reports().length === 0" class="hist-empty card">Todavía no hay envíos registrados.</p>

      <div *ngIf="reports().length" class="card hist-card">
        <table class="hist-table">
          <thead>
            <tr>
              <th>Envío</th><th>Destino</th><th>Caja</th><th>Rango</th><th>Lecturas</th><th>Mín / Máx</th>
              <th>Custodia</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of reports(); let i = index" [appReveal]="i">
              <td class="mono">#{{ r.shipmentId }}</td>
              <td>{{ r.customerAddress }}</td>
              <td>{{ r.smartBoxId }}</td>
              <td>{{ r.minTemp }}–{{ r.maxTemp }}°C</td>
              <td>{{ r.thermal.readings }}</td>
              <td>{{ r.thermal.min ?? '--' }} / {{ r.thermal.max ?? '--' }}</td>
              <td>
                <span class="status-chip" [ngClass]="r.thermal.compliant && !r.thermalAlerts.length ? 'chip-ok' : 'chip-danger'">
                  {{ r.thermal.compliant && !r.thermalAlerts.length ? 'Íntegra' : r.thermal.breaches + ' desvíos' }}
                </span>
              </td>
              <td>{{ r.status === 'DELIVERED' ? 'Entregado' : r.status === 'IN_TRANSIT' ? 'En ruta' : 'Cancelado' }}</td>
              <td class="right"><button class="btn btn-ghost" (click)="export(r)">📄 Exportar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .hist-container { display: flex; flex-direction: column; gap: 20px; }
    .hist-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .section-title { margin: 0; font-family: var(--font-display); font-size: 22px; }
    .section-sub { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
    .hist-card { padding: 0; overflow-x: auto; }
    .hist-table { width: 100%; border-collapse: collapse; min-width: 860px; }
    .hist-table th, .hist-table td { text-align: left; padding: 14px 16px; border-bottom: 1px solid var(--line); font-size: 14px; }
    .hist-table th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .mono { font-family: var(--font-display); font-weight: 600; }
    .right { text-align: right !important; }
    .hist-empty { padding: 24px; color: var(--muted); }
    .hist-error { color: var(--danger-strong); }
  `]
})
export class HistoryComponent implements OnInit {
  private telemetry = inject(TelemetryService);

  reports = signal<AuditReport[]>([]);
  loaded = false;
  error = '';

  ngOnInit() {
    this.load();
  }

  async load() {
    try {
      this.reports.set(await this.telemetry.auditReports());
      this.error = '';
    } catch {
      this.error = 'No se pudo cargar el historial desde el backend.';
    }
    this.loaded = true;
  }

  export(r: AuditReport) {
    const fmt = (iso: string) => new Date(iso).toLocaleString();
    const text = `======================================================
REPORTE DE CUSTODIA TÉRMICA Y AUDITORÍA - COLD2HOT IOT
======================================================
ID del Pedido: #${r.shipmentId}
Dirección de Entrega: ${r.customerAddress}
Caja SmartBox: ${r.smartBoxId}
Operador Asignado: ${r.operatorName}
Modo Térmico: ${r.thermalMode} (Rango admisible: ${r.minTemp}°C - ${r.maxTemp}°C)
Estado: ${r.status}
Creado: ${fmt(r.createdAt)}${r.deliveredAt ? '\nEntregado: ' + fmt(r.deliveredAt) : ''}

RESUMEN TÉRMICO
Lecturas: ${r.thermal.readings} | Mínima: ${r.thermal.min ?? 'n/d'}°C | Máxima: ${r.thermal.max ?? 'n/d'}°C | Promedio: ${r.thermal.average ?? 'n/d'}°C
Lecturas fuera de rango: ${r.thermal.breaches}
Estado de Custodia: ${r.thermal.compliant && !r.thermalAlerts.length ? 'INTEGRIDAD VERIFICADA' : 'DESVÍO TÉRMICO DETECTADO'}

ALERTAS TÉRMICAS
${r.thermalAlerts.map(a => `[${fmt(a.timestamp)}] ${a.severity}: ${a.message}`).join('\n') || 'Sin alertas'}

INTENTOS DE ACCESO (OTP)
${r.accessAttempts.map(a => `[${fmt(a.timestamp)}] ${a.action} -> ${a.result}`).join('\n') || 'Sin intentos'}

EVENTOS DE TAPA
${r.tamperEvents.map(e => `[${fmt(e.timestamp)}] ${e.lidOpen ? 'ABIERTA' : 'CERRADA'}${e.lidOpen ? (e.authorized ? ' (autorizada)' : ' (NO autorizada)') : ''}`).join('\n') || 'Sin eventos'}
======================================================
Certificado digitalmente por Cold2Hot Platform.
Fecha de Emisión: ${new Date().toLocaleString()}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte-Custodia-${r.shipmentId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
