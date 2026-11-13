import { RevealDirective } from '../../shared/reveal.directive';
import { IconComponent } from '../../shared/icon.component';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditReport } from '../../core/models/shipment.model';
import { ApiOrder } from '../../core/services/telemetry.service';
import { TelemetryService } from '../../core/services/telemetry.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RevealDirective, IconComponent],
  template: `
    <div class="page">
      <section class="summary card" appReveal>
        <div class="big">
          <span class="big-num">{{ total() }}</span>
          <span class="big-label">envíos registrados</span>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Custodia íntegra (mes)</span>
            <span class="stat-val">{{ integrity() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Con desvíos (mes)</span>
            <span class="stat-val">{{ withBreaches() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Entregados (mes)</span>
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

        <div *ngFor="let r of page(); let i = index; trackBy: trackReport" class="row" [appReveal]="i">
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
          <span class="c-state" [class.bad]="!ok(r)">{{ ok(r) ? 'Íntegra' : (r.thermal.breaches ? r.thermal.breaches + (r.thermal.breaches === 1 ? ' desvío' : ' desvíos') : 'Con alertas') }}</span>
          <span class="c-status">{{ r.status === 'DELIVERED' ? 'Entregado' : r.status === 'IN_TRANSIT' ? 'En ruta' : 'Cancelado' }}</span>
          <span class="acts">
            <button class="icon-btn" type="button" [disabled]="!r.evidence" (click)="evidence.set(r)" [attr.aria-label]="'Ver evidencia de ' + r.shipmentId" [title]="r.evidence ? 'Ver foto de entrega' : 'Sin evidencia'">
              <app-icon name="image" [size]="17" />
            </button>
            <button class="icon-btn" type="button" (click)="export(r)" [attr.aria-label]="'Exportar reporte de ' + r.shipmentId" title="Exportar reporte">
              <app-icon name="download" [size]="17" />
            </button>
          </span>
        </div>
        <button *ngIf="total() > reports().length" type="button" class="more" (click)="more()" [disabled]="loadingMore">
          Mostrar más ({{ total() - reports().length }})
        </button>
      </section>
    </div>

    <div *ngIf="evidence() as e" class="lightbox" (click)="evidence.set(null)" role="dialog" aria-label="Evidencia de entrega">
      <figure class="lb-card" (click)="$event.stopPropagation()">
        <figcaption>
          <strong>#{{ e.shipmentId }}</strong>
          <span>{{ e.evidence!.uploadedAt ? (e.evidence!.uploadedAt | date: 'dd/MM/yyyy HH:mm') : '' }}</span>
        </figcaption>
        <img [src]="e.evidence!.photo" alt="Foto de entrega" />
        <div class="lb-actions">
          <a class="btn btn-secondary" [href]="e.evidence!.photo" [download]="'Evidencia-' + e.shipmentId">Descargar foto</a>
          <button type="button" class="btn btn-dark" (click)="evidence.set(null)">Cerrar</button>
        </div>
      </figure>
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
    .more { display: block; margin: 12px auto 8px; border: 1px solid var(--line); background: var(--white); border-radius: 999px; height: 36px; padding: 0 18px; font: inherit; font-size: 13px; color: var(--ink-2); }
    .more:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
    .empty { padding: 28px 22px; color: var(--muted); font-size: 14px; }

    .rows-head, .row { display: grid; grid-template-columns: minmax(170px, 1.6fr) 1.6fr 0.6fr 0.9fr 0.8fr 84px; gap: 14px; align-items: center; padding: 0 22px; }
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
    .acts { display: inline-flex; gap: 8px; justify-content: flex-end; }
    .icon-btn:disabled { opacity: .35; pointer-events: none; }
    .lightbox { position: fixed; inset: 0; z-index: 100; background: rgba(14, 23, 38, .6); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .lb-card { margin: 0; background: var(--white); border-radius: 22px; padding: 20px; max-width: 560px; width: 100%; display: flex; flex-direction: column; gap: 14px; }
    .lb-card figcaption { display: flex; justify-content: space-between; font-size: 14px; color: var(--muted); }
    .lb-card figcaption strong { color: var(--ink); font-weight: 600; }
    .lb-card img { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 14px; background: var(--bg-alt); }
    .lb-actions { display: flex; gap: 10px; justify-content: flex-end; }
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
      .acts { grid-area: act; }
      .c-range { grid-area: range; }
      .c-state { grid-area: state; justify-self: end; }
      .c-num, .c-status { display: none; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  private telemetry = inject(TelemetryService);

  reports = signal<AuditReport[]>([]);
  evidence = signal<AuditReport | null>(null);
  readonly PAGE = 25;
  shown = signal(this.PAGE);
  page = computed(() => this.reports().slice(0, this.shown()));
  delivered = computed(() => this.stats()?.total ?? 0);
  withBreaches = computed(() => (this.stats() ? this.stats()!.total - this.stats()!.perfect : 0));
  integrity = computed(() => (this.stats() && this.stats()!.total ? this.stats()!.percent + '%' : '—'));

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

  private orders: ApiOrder[] = [];
  total = signal(0);
  loadingMore = false;
  stats = signal<{ total: number; perfect: number; percent: number } | null>(null);

  async load() {
    try {
      this.orders = await this.telemetry.historyOrders();
      this.total.set(this.orders.length);
      this.reports.set([]);
      this.shown.set(this.PAGE);
      await this.fetchPage();
      this.telemetry.fleetStats().then(r => this.stats.set({ total: r.fleet.totalDeliveries, perfect: r.fleet.perfectDeliveries, percent: r.fleet.compliancePercent })).catch(() => {});
      this.error = '';
    } catch {
      this.error = 'No se pudo cargar el historial desde el backend.';
    }
    this.loaded = true;
  }

  /** Pide los reportes que faltan para los envíos visibles. */
  private async fetchPage() {
    const have = this.reports().length;
    const next = this.orders.slice(have, this.shown());
    if (!next.length) return;
    this.loadingMore = true;
    try {
      this.reports.set([...this.reports(), ...(await this.telemetry.reportsFor(next))]);
    } finally {
      this.loadingMore = false;
    }
  }

  async more() {
    this.shown.set(this.shown() + this.PAGE);
    await this.fetchPage();
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
Evidencia de entrega: ${r.evidence ? 'foto adjunta (descargable desde el Historial)' : 'pendiente'}
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
