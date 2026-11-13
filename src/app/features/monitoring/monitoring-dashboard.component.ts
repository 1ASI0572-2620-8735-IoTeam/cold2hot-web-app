import { RevealDirective } from '../../shared/reveal.directive';
import { IconComponent } from '../../shared/icon.component';
import { TemperatureStripComponent } from './temperature-strip.component';
import { CustodyOverviewComponent } from './custody-overview.component';
import { FleetInsightsComponent } from './fleet-insights.component';
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { Shipment } from '../../core/models/shipment.model';
import { NewShipmentModalComponent } from './new-shipment-modal.component';

@Component({
  selector: 'app-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule, NewShipmentModalComponent, RevealDirective, IconComponent, CustodyOverviewComponent, FleetInsightsComponent, TemperatureStripComponent],
  template: `
    <div class="monitoring-container">
      
      <div class="dash-grid">
      <div class="dash-main">

      <app-temperature-strip />

      <section class="list card" aria-label="Envíos en ruta">
        <div class="list-head">
          <h3 class="list-title">Envíos en ruta</h3>
          <div class="seg" role="tablist" aria-label="Filtro">
            <button type="button" role="tab" [class.on]="activeFilter() === 'ALL'" (click)="setFilter('ALL')">Todos <b>{{ shipments().length }}</b></button>
            <button type="button" role="tab" [class.on]="activeFilter() === 'HOT'" (click)="setFilter('HOT')">Caliente</button>
            <button type="button" role="tab" [class.on]="activeFilter() === 'COLD'" (click)="setFilter('COLD')">Frío</button>
            <button type="button" role="tab" [class.on]="activeFilter() === 'BREACH'" (click)="setFilter('BREACH')">Fuera de rango</button>
          </div>
          <button type="button" class="btn btn-dark btn-new" (click)="showNewShipmentModal = true">
            <app-icon name="plus" [size]="17" /> Nuevo envío
          </button>
        </div>

        <div class="rows-head" aria-hidden="true">
          <span>Pedido</span><span>Perfil</span><span>Temperatura</span><span>Caja</span><span>Cerrojo</span><span>Estado</span><span></span>
        </div>

        <button
          type="button"
          class="row"
          *ngFor="let s of pageShipments(); let i = index; trackBy: trackShipment"
          [appReveal]="i"
          (click)="selectShipmentForDetail(s)"
          [attr.aria-label]="'Ver detalle de ' + s.id"
        >
          <span class="c-id">
            <span class="id">{{ s.id }}</span>
            <span class="addr">{{ s.customerAddress }}</span>
          </span>
          <span class="c-mode"><i class="dot" [class.hot]="s.thermalMode === 'HOT'"></i>{{ s.thermalMode === 'HOT' ? 'Caliente' : 'Frío' }}</span>
          <span class="c-temp">
            <strong [class.bad]="s.thermalStatus === 'BREACH'">{{ s.currentTemp === null ? '—' : s.currentTemp + '°' }}</strong>
            <small>{{ s.targetMinTemp }}–{{ s.targetMaxTemp }}°</small>
          </span>
          <span class="c-box">{{ s.smartBoxId }}</span>
          <span class="c-lock"><app-icon [name]="s.lockStatus === 'LOCKED' ? 'lock' : 'unlock'" [size]="15" />{{ s.lockStatus === 'LOCKED' ? 'Cerrado' : 'Abierto' }}</span>
          <span class="c-state" [class.bad]="s.thermalStatus === 'BREACH'">{{ s.currentTemp === null ? 'Sin lectura' : s.thermalStatus === 'BREACH' ? 'Fuera de rango' : 'En rango' }}</span>
          <span class="c-go" aria-hidden="true">↗</span>
        </button>

        <button *ngIf="filteredShipments().length > shown()" type="button" class="more" (click)="shown.set(shown() + 25)">
          Mostrar más ({{ filteredShipments().length - shown() }})
        </button>

        <p *ngIf="!filteredShipments().length" class="empty">No hay envíos para mostrar.</p>
      </section>

      <app-fleet-insights />
      </div>

      <aside class="dash-side" aria-label="Resumen operativo">
        <app-custody-overview />
      </aside>
      </div>

      <!-- 4. MODAL / DETALLE DE TRAYECTO TÉRMICO (Figma W05) -->
      <div *ngIf="selectedShipment" class="drawer-backdrop" (click)="selectedShipment = null">
        <aside class="detail-drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <div class="drawer-tag">Detalle en tiempo real</div>
              <h2 class="drawer-title">{{ selectedShipment.id }}</h2>
              <p class="drawer-sub">{{ selectedShipment.customerAddress }}</p>
            </div>
            <button class="drawer-close-btn" (click)="selectedShipment = null" aria-label="Cerrar detalle"><app-icon name="x" [size]="18" /></button>
          </div>

          <div class="drawer-body">
            <!-- Tarjeta con lectura actual destacada -->
            <div class="current-reading-card">
              <div class="reading-meta">
                <span class="reading-label">Temperatura actual del sensor DS18B20</span>
                <div class="reading-value font-display" [class.text-danger]="selectedShipment.thermalStatus === 'BREACH'">
                  {{ selectedShipment.currentTemp ?? '--' }}°C
                </div>
              </div>
              <div class="reading-badges">
                <span
                  class="status-chip"
                  [ngClass]="selectedShipment.thermalStatus === 'OPTIMAL' ? 'chip-ok' : 'chip-danger'"
                >
                  {{ selectedShipment.thermalStatus === 'OPTIMAL' ? t('status_in_range') : t('status_out_of_range') }}
                </span>
                <span class="status-chip chip-neutral">
                  OTP: {{ selectedShipment.otpCode }}
                </span>
              </div>
            </div>

            <!-- Gráfico de Telemetría (Curva SVG interactiva) -->
            <div class="chart-section card">
              <h3 class="chart-title">{{ t('track_title') }}</h3>
              <div class="svg-chart-container">
                <svg viewBox="0 0 400 160" class="thermal-svg-chart">
                  <!-- Líneas guía -->
                  <line x1="20" y1="30" x2="380" y2="30" stroke="#E3E8EF" stroke-dasharray="4" />
                  <line x1="20" y1="80" x2="380" y2="80" stroke="#E3E8EF" stroke-dasharray="4" />
                  <line x1="20" y1="130" x2="380" y2="130" stroke="#E3E8EF" stroke-dasharray="4" />

                  <!-- Curva de temperatura -->
                  <polyline
                    fill="none"
                    [attr.stroke]="selectedShipment.thermalMode === 'HOT' ? 'var(--hot)' : 'var(--cold)'"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [attr.points]="generateChartPoints(selectedShipment)"
                  />

                  <!-- Puntos de lectura -->
                  <circle
                    *ngFor="let pt of getPointCoordinates(selectedShipment)"
                    [attr.cx]="pt.x"
                    [attr.cy]="pt.y"
                    r="4"
                    [attr.fill]="selectedShipment.thermalMode === 'HOT' ? 'var(--hot)' : 'var(--cold)'"
                  />
                </svg>
              </div>

              <div class="chart-legend">
                <span>Rango permitido: {{ selectedShipment.targetMinTemp }}°C - {{ selectedShipment.targetMaxTemp }}°C</span>
                <span class="live-dot-text"><span class="pulse-dot"></span> Actualización cada 4s</span>
              </div>
            </div>

            <!-- Tabla de bitácora reciente -->
            <div class="logs-section">
              <h4 class="logs-title">Últimas lecturas recibidas</h4>
              <div class="log-items-list">
                <div *ngFor="let log of selectedShipment.history.slice(-5)" class="log-row">
                  <span class="log-time">{{ log.timestamp }}</span>
                  <span class="log-temp font-display">{{ log.temperature }}°C</span>
                  <span class="log-status font-ok">Transmitido vía 4G/Edge</span>
                </div>
              </div>
            </div>

            <!-- Botón de Exportar Reporte de Auditoría -->
            <button
              type="button"
              class="btn btn-primary"
              style="width: 100%; margin-top: 10px;"
              (click)="exportAuditReport(selectedShipment)"
            >
              <app-icon name="download" [size]="18" /> Descargar reporte de custodia
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              style="width: 100%; margin-top: 10px;"
              (click)="completeShipment(selectedShipment)"
            >
              <app-icon name="check" [size]="18" /> Marcar como entregado
            </button>
          </div>
        </aside>
      </div>

      <!-- 5. MODAL NUEVO ENVÍO (W06 / W07) -->
      <app-new-shipment-modal
        *ngIf="showNewShipmentModal"
        (closed)="showNewShipmentModal = false"
      ></app-new-shipment-modal>

    </div>
  `,
  styles: [`
    .monitoring-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .dash-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; align-items: start; }
    .dash-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .dash-side { position: sticky; top: 92px; }
    @media (max-width: 1180px) {
      .dash-grid { grid-template-columns: 1fr; }
      .dash-side { position: static; order: -1; }
    }

    /* Lista de envíos limpia y responsiva */
    .list { padding: 6px 0 8px; }
    .list-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 22px 12px; }
    .list-title { font-size: 17px; font-weight: 600; margin-right: auto; }
    .seg { display: inline-flex; gap: 4px; padding: 4px; background: var(--bg-alt); border-radius: 999px; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
    .seg button { border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 13px; font-weight: 500; height: 34px; padding: 0 14px; border-radius: 999px; white-space: nowrap; transition: background .2s, color .2s; }
    .seg button b { font-weight: 600; margin-left: 4px; }
    .seg button.on { background: var(--white); color: var(--ink); box-shadow: var(--shadow-sm); }
    .btn-new { height: 40px; padding: 0 18px; }

    .rows-head, .row {
      display: grid;
      grid-template-columns: minmax(170px, 2.2fr) 1fr 1.1fr 0.9fr 1fr 1.2fr 32px;
      align-items: center;
      gap: 12px;
      padding: 0 22px;
    }
    .rows-head { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding-top: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
    .row {
      width: 100%; min-height: 68px; border: 0; border-bottom: 1px solid var(--line); background: transparent;
      font: inherit; text-align: left; color: var(--ink-2); font-size: 13px; transition: background-color .18s ease;
    }
    .row:last-of-type { border-bottom: 0; }
    .row:hover { background: #FAFBFC; }
    .row:hover .c-go { background: var(--ink); color: #fff; border-color: var(--ink); }
    .c-id { display: flex; flex-direction: column; min-width: 0; }
    .id { font-weight: 600; color: var(--ink); font-size: 14px; }
    .addr { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .c-mode { display: inline-flex; align-items: center; gap: 8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cold); flex: none; }
    .dot.hot { background: var(--hot); }
    .c-temp { display: flex; align-items: baseline; gap: 6px; }
    .c-temp strong { font-size: 17px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
    .c-temp strong.bad { color: var(--hot-strong); }
    .c-temp small { font-size: 11px; color: var(--muted); }
    .c-box { font-variant-numeric: tabular-nums; }
    .c-lock { display: inline-flex; align-items: center; gap: 6px; }
    .c-state { color: var(--muted); }
    .c-state.bad { color: var(--hot-strong); font-weight: 600; }
    .c-go { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: var(--muted); transition: all .2s ease; }
    .more { display: block; margin: 12px auto 8px; border: 1px solid var(--line); background: var(--white); border-radius: 999px; height: 36px; padding: 0 18px; font: inherit; font-size: 13px; color: var(--ink-2); }
    .more:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
    .empty { padding: 28px 22px; color: var(--muted); font-size: 14px; }

    @media (max-width: 760px) {
      .rows-head { display: none; }
      .list-head { padding: 14px 16px 10px; }
      .btn-new { width: 100%; }
      .row {
        grid-template-columns: 1fr auto;
        grid-template-areas: 'id temp' 'meta state';
        row-gap: 6px; padding: 14px 16px;
      }
      .c-id { grid-area: id; }
      .c-temp { grid-area: temp; justify-self: end; }
      .c-mode { grid-area: meta; }
      .c-state { grid-area: state; justify-self: end; }
      .c-box, .c-lock, .c-go { display: none; }
    }

    /* 4. DRAWER DETALLE (W05) */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(14, 23, 38, 0.4);
      backdrop-filter: blur(2px);
      z-index: 90;
      display: flex;
      justify-content: flex-end;
    }

    .detail-drawer {
      width: 480px;
      max-width: 90vw;
      height: 100vh;
      background-color: var(--white);
      box-shadow: -10px 0 30px rgba(14, 23, 38, 0.15);
      display: flex;
      flex-direction: column;
      animation: drawerSlide 0.25s ease-out;
    }

    @keyframes drawerSlide {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .drawer-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--hot);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .drawer-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--ink);
    }

    .drawer-sub {
      font-size: 13px;
      color: var(--muted);
    }

    .drawer-close-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: var(--muted);
      cursor: pointer;
      &:hover { color: var(--ink); }
    }

    .drawer-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }

    .current-reading-card {
      background-color: var(--bg);
      padding: 20px;
      border-radius: var(--radius-card);
      border: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .reading-label {
      font-size: 12px;
      color: var(--muted);
    }

    .reading-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.1;

      &.text-danger { color: var(--danger); }
    }

    .reading-badges {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
    }

    .chart-section {
      padding: 20px;
    }

    .chart-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 14px;
      color: var(--ink);
    }

    .svg-chart-container {
      width: 100%;
      height: 160px;
    }

    .thermal-svg-chart {
      width: 100%;
      height: 100%;
    }

    .chart-legend {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--muted);
      margin-top: 10px;
    }

    .live-dot-text {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--ok);
      font-weight: 600;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--ok);
    }

    .logs-section {
      margin-top: 8px;
    }

    .logs-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 12px;
    }

    .log-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .log-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background-color: var(--bg);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }

    .log-time {
      color: var(--muted);
    }

    .log-temp {
      font-weight: 700;
      color: var(--ink);
    }

    .font-ok {
      font-size: 11px;
      color: var(--ok);
      font-weight: 600;
    }
  `]
})
export class MonitoringDashboardComponent {
  private telemetryService = inject(TelemetryService);
  private translationService = inject(TranslationService);

  shipments = this.telemetryService.shipments;
  totalActive = this.telemetryService.totalActive;
  inTransit = this.telemetryService.inTransitCount;
  criticalAlerts = this.telemetryService.criticalAlertsCount;
  availableBoxes = this.telemetryService.availableBoxesCount;

  activeFilter = signal<'ALL' | 'HOT' | 'COLD' | 'BREACH'>('ALL');
  private selectedId: string | null = null;
  /** Referencia viva al envío seleccionado: se actualiza con cada ciclo de polling. */
  get selectedShipment(): Shipment | null {
    return this.shipments().find(s => s.id === this.selectedId) ?? null;
  }
  set selectedShipment(s: Shipment | null) {
    this.selectedId = s ? s.id : null;
  }
  showNewShipmentModal = false;

  shown = signal(25);
  pageShipments = computed(() => this.filteredShipments().slice(0, this.shown()));

  filteredShipments = computed(() => {
    const filter = this.activeFilter();
    const q = this.telemetryService.searchTerm().trim().toLowerCase();
    const list = q
      ? this.shipments().filter(s =>
          [s.id, s.customerAddress, s.operatorName, s.smartBoxId].some(v => v.toLowerCase().includes(q))
        )
      : this.shipments();
    if (filter === 'ALL') return list;
    if (filter === 'HOT') return list.filter(s => s.thermalMode === 'HOT');
    if (filter === 'COLD') return list.filter(s => s.thermalMode === 'COLD');
    if (filter === 'BREACH') return list.filter(s => s.thermalStatus === 'BREACH');
    return list;
  });

  t(key: string): string {
    return this.translationService.translate(key);
  }

  trackShipment = (_: number, s: Shipment) => s.id;

  setFilter(filter: 'ALL' | 'HOT' | 'COLD' | 'BREACH') {
    this.activeFilter.set(filter);
  }

  async completeShipment(shipment: Shipment) {
    if (!confirm(`¿Confirmar la entrega del envío ${shipment.id}? La caja ${shipment.smartBoxId} quedará disponible.`)) return;
    const res = await this.telemetryService.completeShipment(shipment.id);
    if (res.ok) this.selectedShipment = null;
    else alert(res.error);
  }

  selectShipmentForDetail(shipment: Shipment) {
    this.selectedShipment = shipment;
  }

  // Genera puntos para la curva SVG interactiva de temperatura
  generateChartPoints(s: Shipment): string {
    const points = this.getPointCoordinates(s);
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  getPointCoordinates(s: Shipment): { x: number; y: number }[] {
    const history = s.history;
    if (!history || history.length === 0) return [];

    const minTemp = s.thermalMode === 'HOT' ? 50 : 0;
    const maxTemp = s.thermalMode === 'HOT' ? 90 : 15;
    const range = maxTemp - minTemp;

    const startX = 30;
    const endX = 370;
    const stepX = (endX - startX) / Math.max(1, history.length - 1);

    return history.map((item, idx) => {
      const x = startX + idx * stepX;
      // Invertir Y (en SVG Y=0 está arriba)
      const normalized = Math.max(0, Math.min(1, (item.temperature - minTemp) / range));
      const y = 140 - normalized * 110;
      return { x, y };
    });
  }

  exportAuditReport(s: Shipment) {
    const reportData = `======================================================
REPORTE DE CUSTODIA TÉRMICA Y AUDITORÍA - COLD2HOT IOT
======================================================
ID del Pedido: ${s.id}
Dirección de Entrega: ${s.customerAddress}
Caja SmartBox: ${s.smartBoxId}
Operador Asignado: ${s.operatorName}
Modo Térmico: ${s.thermalMode} (Rango admisible: ${s.targetMinTemp}°C - ${s.targetMaxTemp}°C)
Temperatura Final Registrada: ${s.currentTemp ?? 'sin lecturas'}°C
Estado de Custodia: ${s.thermalStatus === 'OPTIMAL' ? 'INTEGRIDAD VERIFICADA' : 'DESVÍO TÉRMICO DETECTADO'}
Código OTP Utilizado: ${s.otpCode}
Fecha de Emisión: ${new Date().toLocaleString()}

HISTORIAL DE LECTURAS DS18B20 EN RUTA:
${s.history.map(h => `[${h.timestamp}] ${h.temperature}°C (Transmitido vía Edge Gateway)`).join('\n')}
======================================================
Certificado digitalmente por Cold2Hot Platform.
`;
    const blob = new Blob([reportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte-Custodia-${s.id.replace('#', '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
