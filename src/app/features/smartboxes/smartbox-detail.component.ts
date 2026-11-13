import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TelemetryService } from '../../core/services/telemetry.service';
import { AlertItem } from '../../core/models/shipment.model';
import { IconComponent } from '../../shared/icon.component';
import { RevealDirective } from '../../shared/reveal.directive';

const ALERT_TITLES: Record<AlertItem['type'], string> = {
  TEMP_BREACH: 'Desvío térmico',
  LID_OPEN: 'Tapa abierta',
  UNAUTHORIZED_ACCESS: 'Apertura no autorizada',
  LOW_BATTERY: 'Batería baja'
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponible',
  IN_TRANSIT: 'En ruta',
  MAINTENANCE: 'Mantenimiento',
  DECOMMISSIONED: 'Baja'
};

/** Detalle de una SmartBox: imagen central y tarjetas de datos alrededor. */
@Component({
  selector: 'app-smartbox-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, RevealDirective],
  template: `
    <div class="page" *ngIf="box() as b; else missing">
      <header class="head">
        <div>
          <a routerLink="/dashboard/smartboxes" class="back">← Cajas</a>
          <h2 class="title">{{ b.id }}</h2>
          <p class="sub"><i class="dot" [class.on]="b.status === 'IN_TRANSIT'"></i>{{ statusLabel() }} · {{ b.serialNumber }}</p>
        </div>
        <a *ngIf="shipment() as s" class="btn btn-dark" routerLink="/dashboard/monitoring">Ver envío {{ s.id }}</a>
      </header>

      <div class="stage">
        <img class="city" src="brand/smartbox-bg.png" alt="" aria-hidden="true" />
        <figure class="hero" appReveal>
          <div class="shadow"></div>
          <img src="brand/smartbox.png" alt="SmartBox Cold2Hot por dentro: ESP32, relés, ventiladores y sensor de temperatura" />
        </figure>

        <section class="card k k-temp" [appReveal]="1">
          <div class="k-head"><span class="k-label">Temperatura</span></div>
          <div class="k-body">
            <span class="k-num">{{ temp() === null ? '—' : (temp()! | number: '1.1-1') + '°' }}</span>
            <svg *ngIf="spark().line" viewBox="0 0 120 50" class="spark" aria-hidden="true">
              <path [attr.d]="spark().area" class="spark-area" />
              <path [attr.d]="spark().line" class="spark-line" />
            </svg>
          </div>
          <span class="k-foot">{{ shipment() ? 'Rango ' + shipment()!.targetMinTemp + '–' + shipment()!.targetMaxTemp + ' °C' : 'Sin envío activo' }}</span>
        </section>

        <section class="card k k-bat" [appReveal]="2">
          <div class="k-head"><span class="k-label">Batería</span></div>
          <div class="k-body">
            <span class="k-num">{{ b.batteryLevel }}%</span>
            <svg viewBox="0 0 80 80" class="ring" aria-hidden="true">
              <circle cx="40" cy="40" r="32" class="ring-bg" />
              <circle cx="40" cy="40" r="32" class="ring-fg" [class.low]="b.batteryLevel < 20"
                [attr.stroke-dasharray]="ringLen * b.batteryLevel / 100 + ' ' + ringLen" transform="rotate(-90 40 40)" />
            </svg>
          </div>
          <span class="k-foot">{{ b.batteryLevel < 20 ? 'Recargar pronto' : b.batteryLevel < 50 ? 'Nivel medio' : 'Nivel bueno' }}</span>
        </section>

        <section class="card k k-lock" [appReveal]="3">
          <div class="k-head"><span class="k-label">Cerrojo</span></div>
          <div class="k-body">
            <span class="k-num sm">{{ lockLabel() }}</span>
            <span class="lock-ico" [class.open]="shipment()?.lockStatus === 'UNLOCKED'">
              <app-icon [name]="shipment()?.lockStatus === 'UNLOCKED' ? 'unlock' : 'lock'" [size]="24" />
            </span>
          </div>
          <span class="k-foot">{{ shipment() ? 'OTP de un solo uso' : 'En espera' }}</span>
        </section>

        <section class="card k k-alert" [appReveal]="4">
          <div class="k-head"><span class="k-label">Alertas</span></div>
          <div class="k-body">
            <span class="k-num">{{ openAlerts().length < 10 ? '0' : '' }}{{ openAlerts().length }}</span>
            <span class="k-tag"><i class="dot" [class.bad]="openAlerts().length > 0"></i>{{ openAlerts().length ? 'Abiertas' : 'Sin alertas' }}</span>
          </div>
          <span class="k-foot">{{ boxAlerts().length }} en total</span>
        </section>
      </div>

      <div class="bottom">
        <section class="card panel" [appReveal]="5">
          <h3>Envío asignado</h3>
          <ng-container *ngIf="shipment() as s; else idle">
            <div class="row-line"><span>Pedido</span><strong>{{ s.id }}</strong></div>
            <div class="row-line"><span>Destino</span><strong class="trunc">{{ s.customerAddress }}</strong></div>
            <div class="row-line"><span>Perfil</span><strong><i class="dot" [class.hot]="s.thermalMode === 'HOT'"></i>{{ s.thermalMode === 'HOT' ? 'Caliente' : 'Frío' }}</strong></div>
            <div class="row-line"><span>Operador</span><strong>{{ s.operatorName }}</strong></div>
          </ng-container>
          <ng-template #idle><p class="muted">La caja está libre.</p></ng-template>
        </section>

        <section class="card panel" [appReveal]="6">
          <h3>Últimas lecturas</h3>
          <div class="strip" *ngIf="bars().length; else noreads" aria-hidden="true">
            <span *ngFor="let h of bars(); trackBy: trackIndex" class="bar" [style.height.%]="h.h" [class.bad]="h.bad"></span>
          </div>
          <ng-template #noreads><p class="muted">Aún no hay lecturas.</p></ng-template>
          <div class="row-line"><span>MAC</span><strong class="mono">{{ b.macAddress }}</strong></div>
          <div class="row-line"><span>Latido</span><strong>{{ b.lastHeartbeat }}</strong></div>
        </section>

        <section class="card panel" [appReveal]="7">
          <h3>Últimas alertas</h3>
          <p *ngIf="!boxAlerts().length" class="muted">Todo en orden.</p>
          <div *ngFor="let a of boxAlerts().slice(0, 3); trackBy: trackAlert" class="al" [class.done]="a.resolved">
            <span class="al-ico"><app-icon [name]="a.type === 'LOW_BATTERY' ? 'battery' : a.type === 'TEMP_BREACH' ? 'thermometer' : 'unlock'" [size]="17" /></span>
            <span class="al-main"><strong>{{ title(a) }}</strong><small>{{ a.timestamp }}</small></span>
            <span class="al-state">{{ a.resolved ? 'Atendida' : 'Abierta' }}</span>
          </div>
        </section>
      </div>
    </div>

    <ng-template #missing>
      <div class="card empty">
        <p>No encontramos esta caja.</p>
        <a routerLink="/dashboard/smartboxes" class="btn btn-secondary">Volver a Cajas</a>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .back { font-size: 13px; color: var(--muted); text-decoration: none; }
    .back:hover { color: var(--ink); }
    .title { font-size: 44px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin-top: 6px; }
    .sub { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); margin-top: 6px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1; margin-right: 0; }
    .sub .dot.on { background: var(--cold); }
    .dot.hot { background: var(--hot); margin-right: 8px; }
    .dot.bad { background: var(--danger); }

    .stage {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr);
      grid-template-areas: 'temp hero lock' 'bat hero alert';
      gap: 16px;
      align-items: stretch;
      position: relative;
    }
    .city { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; z-index: 0; }
    .stage > :not(.city) { position: relative; z-index: 1; }
    .k-temp { grid-area: temp; } .k-bat { grid-area: bat; } .k-lock { grid-area: lock; } .k-alert { grid-area: alert; }
    .hero { grid-area: hero; margin: 0; position: relative; display: flex; align-items: center; justify-content: center; min-height: 320px; }
    .hero img { position: relative; width: 100%; max-width: 420px; height: auto; display: block; }
    .shadow { position: absolute; bottom: 8%; left: 18%; right: 18%; height: 26px; border-radius: 50%; background: rgba(14, 23, 38, .12); filter: blur(14px); }

    .k { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; border-radius: 22px; }
    .k-head { display: flex; justify-content: space-between; align-items: center; }
    .k-label { font-size: 15px; font-weight: 500; color: var(--ink-2); }
    .k-body { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; }
    .k-num { font-size: 44px; font-weight: 500; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
    .k-num.sm { font-size: 32px; }
    .k-foot { font-size: 12px; color: var(--muted); }
    .k-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }

    .spark { width: 110px; height: 46px; flex: none; }
    .spark-line { fill: none; stroke: var(--hot); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .spark-area { fill: var(--hot); opacity: .1; }
    .ring { width: 72px; height: 72px; flex: none; }
    .ring circle { fill: none; stroke-width: 6; }
    .ring-bg { stroke: var(--bg-alt); }
    .ring-fg { stroke: var(--cold); stroke-linecap: round; transition: stroke-dasharray .6s ease; }
    .ring-fg.low { stroke: var(--hot); }
    .lock-ico { width: 52px; height: 52px; border-radius: 50%; background: var(--bg-alt); color: var(--ink-2); display: inline-flex; align-items: center; justify-content: center; }
    .lock-ico.open { background: var(--hot-bg); color: var(--hot-strong); }

    .bottom { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .panel { padding: 18px 20px; border-radius: 22px; display: flex; flex-direction: column; gap: 12px; }
    h3 { font-size: 17px; font-weight: 500; }
    .row-line { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--muted); }
    .row-line strong { color: var(--ink); font-weight: 500; text-align: right; min-width: 0; }
    .trunc { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
    .muted { font-size: 13px; color: var(--muted); }
    .strip { display: flex; align-items: flex-end; gap: 4px; height: 54px; }
    .bar { flex: 1; background: var(--cold); border-radius: 3px; min-height: 6px; }
    .bar.bad { background: var(--hot); }

    .al { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 14px; }
    .al.done { opacity: .55; }
    .al-ico { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-alt); display: inline-flex; align-items: center; justify-content: center; color: var(--ink-2); flex: none; }
    .al-main { display: flex; flex-direction: column; min-width: 0; flex: 1; font-size: 13px; }
    .al-main strong { font-weight: 500; }
    .al-main small { font-size: 11px; color: var(--muted); }
    .al-state { font-size: 12px; color: var(--muted); }
    .empty { padding: 40px; text-align: center; display: flex; flex-direction: column; gap: 16px; align-items: center; }

    @media (max-width: 1100px) {
      .stage { grid-template-columns: 1fr 1fr; grid-template-areas: 'hero hero' 'temp lock' 'bat alert'; }
      .hero { min-height: 240px; }
      .hero img { max-width: 340px; }
      .bottom { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .title { font-size: 34px; }
      .stage { gap: 12px; }
      .k { padding: 14px; }
      .k-num { font-size: 32px; }
      .k-num.sm { font-size: 24px; }
      .spark, .ring { width: 54px; height: 54px; }
      .lock-ico { width: 42px; height: 42px; }
    }
  `]
})
export class SmartBoxDetailComponent {
  private telemetry = inject(TelemetryService);
  private route = inject(ActivatedRoute);

  readonly ringLen = 2 * Math.PI * 32;
  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))), { initialValue: this.route.snapshot.paramMap.get('id') });

  box = computed(() => this.telemetry.smartBoxes().find(b => b.id === this.id()) ?? null);
  shipment = computed(() => this.telemetry.shipments().find(s => s.smartBoxId === this.id()) ?? null);
  temp = computed(() => this.shipment()?.currentTemp ?? null);
  statusLabel = computed(() => STATUS_LABEL[this.box()?.status ?? ''] ?? '');
  lockLabel = computed(() => {
    const s = this.shipment();
    return !s ? '—' : s.lockStatus === 'LOCKED' ? 'Cerrado' : 'Abierto';
  });
  boxAlerts = computed(() => this.telemetry.alerts().filter(a => a.smartBoxId === this.id()));
  openAlerts = computed(() => this.boxAlerts().filter(a => !a.resolved));

  private temps = computed(() => (this.shipment()?.history ?? []).map(h => h.temperature));

  spark = computed(() => {
    const t = this.temps();
    if (t.length < 2) return { line: '', area: '' };
    const min = Math.min(...t), max = Math.max(...t), span = max - min || 1;
    const pts = t.map((v, i) => [(i / (t.length - 1)) * 120, 44 - ((v - min) / span) * 38] as const);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return { line, area: `${line} L120 50 L0 50 Z` };
  });

  bars = computed(() => {
    const s = this.shipment();
    const t = this.temps().slice(-14);
    if (!s || !t.length) return [];
    const min = Math.min(...t, s.targetMinTemp), max = Math.max(...t, s.targetMaxTemp), span = max - min || 1;
    return t.map(v => ({ h: 15 + ((v - min) / span) * 85, bad: v < s.targetMinTemp || v > s.targetMaxTemp }));
  });

  title = (a: AlertItem) => ALERT_TITLES[a.type] ?? a.type;
  trackIndex = (i: number) => i;
  trackAlert = (_: number, a: { id: string }) => a.id;
}
