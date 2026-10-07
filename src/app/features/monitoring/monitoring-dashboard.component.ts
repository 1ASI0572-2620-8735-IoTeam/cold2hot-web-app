import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { Shipment } from '../../core/models/shipment.model';
import { NewShipmentModalComponent } from './new-shipment-modal.component';

@Component({
  selector: 'app-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule, NewShipmentModalComponent],
  template: `
    <div class="monitoring-container">
      
      <!-- 1. TARJETAS DE MÉTRICAS KPI (Figma W04) -->
      <section class="kpi-grid" aria-label="Resumen operativo">
        <!-- KPI: Total Envíos -->
        <div class="card kpi-card">
          <div class="kpi-meta">
            <span class="kpi-label">{{ t('kpi_total_active') }}</span>
            <span class="kpi-value">{{ totalActive() }}</span>
          </div>
          <div class="kpi-icon-box bg-blue">📦</div>
        </div>

        <!-- KPI: En Ruta -->
        <div class="card kpi-card">
          <div class="kpi-meta">
            <span class="kpi-label">{{ t('kpi_in_transit') }}</span>
            <span class="kpi-value">{{ inTransit() }}</span>
          </div>
          <div class="kpi-icon-box bg-orange">🛵</div>
        </div>

        <!-- KPI: Alertas Críticas -->
        <div class="card kpi-card" [class.alert-glow]="criticalAlerts() > 0">
          <div class="kpi-meta">
            <span class="kpi-label">{{ t('kpi_critical_alerts') }}</span>
            <span class="kpi-value text-danger">{{ criticalAlerts() }}</span>
          </div>
          <div class="kpi-icon-box bg-red">⚠️</div>
        </div>

        <!-- KPI: Cajas Disponibles -->
        <div class="card kpi-card">
          <div class="kpi-meta">
            <span class="kpi-label">{{ t('kpi_boxes_available') }}</span>
            <span class="kpi-value text-ok">{{ availableBoxes() }}</span>
          </div>
          <div class="kpi-icon-box bg-green">🔋</div>
        </div>
      </section>

      <!-- 2. BARRA DE HERRAMIENTAS Y FILTROS -->
      <section class="toolbar-section">
        <div class="filter-pills" role="tablist">
          <button
            type="button"
            class="filter-pill"
            [class.active]="activeFilter() === 'ALL'"
            (click)="setFilter('ALL')"
          >
            {{ t('filter_all') }} ({{ shipments().length }})
          </button>
          
          <button
            type="button"
            class="filter-pill"
            [class.active]="activeFilter() === 'HOT'"
            (click)="setFilter('HOT')"
          >
            🔥 {{ t('filter_hot') }}
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeFilter() === 'COLD'"
            (click)="setFilter('COLD')"
          >
            ❄️ {{ t('filter_cold') }}
          </button>

          <button
            type="button"
            class="filter-pill filter-alert-pill"
            [class.active]="activeFilter() === 'BREACH'"
            (click)="setFilter('BREACH')"
          >
            ⚠️ {{ t('filter_alerts_only') }}
          </button>
        </div>

        <button
          type="button"
          class="btn btn-primary"
          (click)="showNewShipmentModal = true"
        >
          {{ t('btn_new_shipment') }}
        </button>
      </section>

      <!-- 3. TABLA DE MONITOREO EN TIEMPO REAL (Figma W04) -->
      <section class="table-container card">
        <div class="table-responsive">
          <table class="monitoring-table" aria-label="Tabla de monitoreo térmico en vivo">
            <thead>
              <tr>
                <th>{{ t('col_order_id') }}</th>
                <th>{{ t('col_mode') }}</th>
                <th>{{ t('col_temperature') }}</th>
                <th>{{ t('col_operator') }}</th>
                <th>{{ t('col_smartbox') }}</th>
                <th>{{ t('col_lock') }}</th>
                <th>{{ t('col_battery') }}</th>
                <th>{{ t('col_status') }}</th>
                <th class="text-right">{{ t('col_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of filteredShipments()" [class.row-alert]="s.thermalStatus === 'BREACH'">
                <!-- Pedido -->
                <td>
                  <div class="order-id-cell">
                    <span class="order-id">{{ s.id }}</span>
                    <span class="order-address">{{ s.customerAddress }}</span>
                  </div>
                </td>

                <!-- Modo Térmico -->
                <td>
                  <span
                    class="status-chip"
                    [ngClass]="s.thermalMode === 'HOT' ? 'chip-hot' : 'chip-cold'"
                  >
                    <span class="chip-dot"></span>
                    {{ s.thermalMode === 'HOT' ? t('filter_hot') : t('filter_cold') }}
                  </span>
                </td>

                <!-- Temperatura Actual vs Rango -->
                <td>
                  <div class="temp-cell">
                    <div class="temp-header">
                      <span class="temp-num font-display" [class.text-danger]="s.thermalStatus === 'BREACH'">
                        {{ s.currentTemp }}°C
                      </span>
                      <span
                        class="status-chip"
                        [ngClass]="s.thermalStatus === 'OPTIMAL' ? 'chip-ok' : 'chip-danger'"
                      >
                        {{ s.thermalStatus === 'OPTIMAL' ? t('status_in_range') : t('status_out_of_range') }}
                      </span>
                    </div>
                    <span class="temp-range">
                      Objetivo: {{ s.targetMinTemp }}°C – {{ s.targetMaxTemp }}°C
                    </span>
                  </div>
                </td>

                <!-- Repartidor -->
                <td>
                  <div class="operator-cell">
                    <span class="operator-avatar">{{ s.operatorName.slice(0, 2) }}</span>
                    <span class="operator-name">{{ s.operatorName }}</span>
                  </div>
                </td>

                <!-- SmartBox -->
                <td>
                  <span class="box-badge">{{ s.smartBoxId }}</span>
                </td>

                <!-- Cerrojo -->
                <td>
                  <div class="lock-cell">
                    <span class="lock-icon">{{ s.lockStatus === 'LOCKED' ? '🔒' : '🔓' }}</span>
                    <span class="lock-text">
                      {{ s.lockStatus === 'LOCKED' ? t('status_locked') : t('status_unlocked') }}
                    </span>
                  </div>
                </td>

                <!-- Batería -->
                <td>
                  <div class="battery-cell">
                    <div class="battery-bar-bg">
                      <div
                        class="battery-bar-fill"
                        [style.width.%]="s.batteryLevel"
                        [ngClass]="s.batteryLevel < 20 ? 'bg-danger' : s.batteryLevel < 50 ? 'bg-warn' : 'bg-ok'"
                      ></div>
                    </div>
                    <span class="battery-text">{{ s.batteryLevel }}%</span>
                  </div>
                </td>

                <!-- Estado -->
                <td>
                  <span
                    class="status-chip"
                    [ngClass]="s.status === 'CRITICAL' ? 'chip-danger' : 'chip-neutral'"
                  >
                    <span class="chip-dot"></span>
                    {{ s.status === 'CRITICAL' ? t('status_critical') : t('status_in_transit') }}
                  </span>
                </td>

                <!-- Acción Ver Trayecto -->
                <td class="text-right">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="selectShipmentForDetail(s)"
                  >
                    {{ t('btn_view_track') }} ›
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 4. MODAL / DETALLE DE TRAYECTO TÉRMICO (Figma W05) -->
      <div *ngIf="selectedShipment" class="drawer-backdrop" (click)="selectedShipment = null">
        <aside class="detail-drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <div class="drawer-tag">Detalle en tiempo real</div>
              <h2 class="drawer-title">{{ selectedShipment.id }}</h2>
              <p class="drawer-sub">{{ selectedShipment.customerAddress }}</p>
            </div>
            <button class="drawer-close-btn" (click)="selectedShipment = null">✕</button>
          </div>

          <div class="drawer-body">
            <!-- Tarjeta con lectura actual destacada -->
            <div class="current-reading-card">
              <div class="reading-meta">
                <span class="reading-label">Temperatura actual del sensor DS18B20</span>
                <div class="reading-value font-display" [class.text-danger]="selectedShipment.thermalStatus === 'BREACH'">
                  {{ selectedShipment.currentTemp }}°C
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
                <span class="live-dot-text"><span class="pulse-dot"></span> Muestreo cada 4s</span>
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

    /* 1. KPI GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -8px rgba(14, 23, 38, 0.12);
      }

      &.alert-glow {
        border-color: var(--danger);
        background-color: #FFF5F5;
      }
    }

    .kpi-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
    }

    .kpi-value {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1;

      &.text-danger { color: var(--danger); }
      &.text-ok { color: var(--ok); }
    }

    .kpi-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;

      &.bg-blue { background-color: var(--cold-bg); }
      &.bg-orange { background-color: var(--hot-bg); }
      &.bg-red { background-color: var(--danger-bg); }
      &.bg-green { background-color: var(--ok-bg); }
    }

    /* 2. TOOLBAR */
    .toolbar-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      background-color: var(--bg-alt);
      padding: 4px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line);
    }

    .filter-pill {
      background: none;
      border: none;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      padding: 8px 18px;
      border-radius: var(--radius-pill);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.active) {
        color: var(--ink);
      }

      &.active {
        background-color: var(--white);
        color: var(--ink);
        box-shadow: 0 2px 6px rgba(14, 23, 38, 0.08);
      }

      &.filter-alert-pill.active {
        color: var(--danger);
      }
    }

    /* 3. TABLA */
    .table-container {
      padding: 0;
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .monitoring-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;

      thead th {
        background-color: #F8FAFC;
        padding: 16px 20px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--muted);
        border-bottom: 1px solid var(--line);
      }

      tbody tr {
        border-bottom: 1px solid var(--line);
        transition: background-color 0.15s ease;

        &:hover {
          background-color: #F8FAFC;
        }

        &.row-alert {
          background-color: #FFF8F8;
        }
      }

      tbody td {
        padding: 16px 20px;
        vertical-align: middle;
      }
    }

    .text-right { text-align: right; }

    .order-id-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .order-id {
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--ink);
      font-size: 15px;
    }

    .order-address {
      font-size: 12px;
      color: var(--muted);
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .temp-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .temp-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .temp-num {
      font-size: 17px;
      font-weight: 700;
      color: var(--ink);

      &.text-danger { color: var(--danger); }
    }

    .temp-range {
      font-size: 11px;
      color: var(--muted);
    }

    .operator-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .operator-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--bg-alt);
      color: var(--ink-2);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
    }

    .operator-name {
      font-weight: 500;
      color: var(--ink);
    }

    .box-badge {
      display: inline-block;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 12px;
      color: var(--ink-2);
      background-color: var(--bg-alt);
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--line);
    }

    .lock-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .battery-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .battery-bar-bg {
      width: 44px;
      height: 8px;
      background-color: var(--bg-alt);
      border-radius: 4px;
      overflow: hidden;
    }

    .battery-bar-fill {
      height: 100%;
      border-radius: 4px;

      &.bg-ok { background-color: var(--ok); }
      &.bg-warn { background-color: var(--warn); }
      &.bg-danger { background-color: var(--danger); }
    }

    .battery-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
    }

    .btn-sm {
      height: 34px;
      padding: 0 16px;
      font-size: 12px;
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
  selectedShipment: Shipment | null = null;
  showNewShipmentModal = false;

  filteredShipments = computed(() => {
    const filter = this.activeFilter();
    const list = this.shipments();
    if (filter === 'ALL') return list;
    if (filter === 'HOT') return list.filter(s => s.thermalMode === 'HOT');
    if (filter === 'COLD') return list.filter(s => s.thermalMode === 'COLD');
    if (filter === 'BREACH') return list.filter(s => s.thermalStatus === 'BREACH');
    return list;
  });

  t(key: string): string {
    return this.translationService.translate(key);
  }

  setFilter(filter: 'ALL' | 'HOT' | 'COLD' | 'BREACH') {
    this.activeFilter.set(filter);
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
}
