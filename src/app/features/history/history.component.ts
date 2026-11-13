import { RevealDirective } from '../../shared/reveal.directive';
import { IconComponent } from '../../shared/icon.component';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditReport } from '../../core/models/shipment.model';
import { TelemetryService } from '../../core/services/telemetry.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RevealDirective, IconComponent],
  template: `
    <div class="page">
      <section class="summary card" appReveal>
        <div class="big">
          <span class="big-num">{{ reports().length }}</span>
          <span class="big-label">envíos registrados</span>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Custodia íntegra</span>
            <span class="stat-val">{{ integrity() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Con desvíos</span>
            <span class="stat-val">{{ withBreaches() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Entregados</span>
            <span class="stat-val">{{ delivered() }}</span>
          </div>
        </div>
      </section>

      <section class="card list" [appReveal]="1">
        <div class="list-head">
          <h3>Historial de entregas</h3>
          <button class="btn btn-secondary btn-xs" (click)="load()">Actualizar</button>
        </div>

        <p *ngIf="error" class="empty">{{ error }}</p>
        <p *ngIf="!error && loaded && reports().length === 0" class="empty">Todavía no hay envíos registrados.</p>

        <div class="rows-head" *ngIf="reports().length" aria-hidden="true">
          <span>Pedido</span><span>Temperatura registrada</span><span>Lecturas</span><span>Custodia</span><span>Estado</span><span></span>
        </div>

        <div *ngFor="let r of reports(); let i = index; trackBy: trackReport" class="row" [appReveal]="i">
          <span class="c-id">
            <span class="id"><i class="dot" [class.hot]="r.thermalMode === 'HOT'"></i>#{{ r.shipmentId }}</span>
            <span class="addr">{{ r.customerAddress }}</span>
          </span>
          <span class="c-range">
            <span class="range-bar" [attr.title]="'Rango permitido ' + r.minTemp + '–' + r.maxTemp + '°C'">
              <span class="allowed" [style.left.%]="pos(r.minTemp)" [style.width.%]="pos(r.maxTemp) - pos(r.minTemp)"></span>
              <span *ngIf="r.thermal.min !== null" class="seen" [class.bad]="!ok(r)" [style.left.%]="pos(r.thermal.min!)" [style.width.%]="max(1, pos(r.thermal.max!) - pos(r.thermal.min!))"></span>
            </span>
            <small>{{ r.thermal.min === null ? 'Sin lecturas' : r.thermal.min + '° – ' + r.thermal.max + '°' }}</small>
          </span>
          <span class="c-num">{{ r.thermal.readings }}</span>
          <span class="c-state" [class.bad]="!ok(r)">{{ ok(r) ? 'Íntegra' : r.thermal.breaches + ' desvíos' }}</span>
          <span class="c-status">{{ r.status === 'DELIVERED' ? 'Entregado' : r.status === 'IN_TRANSIT' ? 'En ruta' : 'Cancelado' }}</span>
          <button class="icon-btn" type="button" (click)="export(r)" [attr.aria-label]="'Exportar reporte de ' + r.shipmentId" title="Exportar reporte">
            <app-icon name="download" [size]="17" />
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 18px; }
    .summary { display: grid; grid-template-columns: auto 1fr; gap: 40px; align-items: center; padding: 24px 28px; }
    .big { display: flex; flex-direction: column; }
    .big-num { font-size: 64px; font-weight: 500; line-height: .95; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    .big-label { font-size: 13px; color: var(--muted); margin-top: 6px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); }
    .stat { display: flex; flex-direction: column; gap: 6px; padding: 4px 24px; border-left: 1px solid var(--line); }
    .stat-label { font-size: 13px; color: var(--muted); }
    .stat-val { font-size: 28px; font-weight: 500; font-variant-numeric: tabular-nums; }

    .list { padding: 6px 0; }
    .list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px 12px; }
    h3 { font-size: 17px; font-weight: 600; }
    .btn-xs { height: 34px; padding: 0 14px; font-size: 13px; }
    .empty { padding: 28px 22px; color: var(--muted); font-size: 14px; }

    .rows-head, .row { display: grid; grid-template-columns: minmax(170px, 1.6fr) 1.6fr 0.6fr 0.9fr 0.8fr 40px; gap: 14px; align-items: center; padding: 0 22px; }
    .rows-head { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
    .row { min-height: 66px; border-bottom: 1px solid var(--line); font-size: 13px; color: var(--ink-2); }
    .row:last-of-type { border-bottom: 0; }
    .c-id { display: flex; flex-direction: column; min-width: 0; }
    .id { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: var(--ink); }
    .addr { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 16px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cold); }
    .dot.hot { background: var(--hot); }
    .c-range { display: flex; flex-direction: column; gap: 6px; }
    .c-range small { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
    .range-bar { position: relative; height: 8px; border-radius: 4px; background: var(--bg-alt); max-width: 220px; }
    .allowed { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: #D9E2EC; }
    .seen { position: absolute; top: 1px; bottom: 1px; border-radius: 4px; background: var(--cold); }
    .seen.bad { background: var(--hot); }
    .c-num { font-variant-numeric: tabular-nums; }
    .c-state { color: var(--muted); }
    .c-state.bad { color: var(--hot-strong); font-weight: 600; }
    .icon-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--white); color: var(--ink-2); display: inline-flex; align-items: center; justify-content: center; transition: all .2s ease; }
    .icon-btn:hover { background: var(--ink); color: #fff; border-color: var(--ink); }

    @media (max-width: 760px) {
      .summary { grid-template-columns: 1fr; gap: 18px; padding: 20px; }
      .big-num { font-size: 52px; }
      .stat { padding: 2px 14px; }
      .stat:first-child { border-left: 0; padding-left: 0; }
      .stat-val { font-size: 22px; }
      .rows-head { display: none; }
      .list-head { padding: 12px 16px; }
      .row { grid-template-columns: 1fr auto; grid-template-areas: 'id act' 'range state'; row-gap: 8px; padding: 14px 16px; }
      .c-id { grid-area: id; }
      .icon-btn { grid-area: act; }
      .c-range { grid-area: range; }
      .c-state { grid-area: state; justify-self: end; }
      .c-num, .c-status { display: none; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  private telemetry = inject(TelemetryService);

  reports = signal<AuditReport[]>([]);
  delivered = computed(() => this.reports().filter(r => r.status === 'DELIVERED').length);
  withBreaches = computed(() => this.reports().filter(r => !this.ok(r)).length);
  integrity = computed(() => {
    const withData = this.reports().filter(r => r.thermal.readings > 0);
    return withData.length ? Math.round((withData.filter(r => this.ok(r)).length / withData.length) * 100) + '%' : '—';
  });

  /** Escala común 0–90 °C para comparar rangos. */
  pos = (t: number) => Math.min(100, Math.max(0, (t / 90) * 100));
  max = Math.max;
  ok = (r: AuditReport) => r.thermal.compliant && !r.thermalAlerts.length;
  trackReport = (_: number, r: AuditReport) => r.shipmentId;
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
