import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../../core/services/telemetry.service';
import { AlertItem } from '../../core/models/shipment.model';
import { IconComponent } from '../../shared/icon.component';
import { RevealDirective } from '../../shared/reveal.directive';

type Filter = 'OPEN' | 'CRITICAL' | 'RESOLVED';

const TITLES: Record<AlertItem['type'], string> = {
  TEMP_BREACH: 'Desvío térmico',
  LID_OPEN: 'Tapa abierta',
  UNAUTHORIZED_ACCESS: 'Apertura no autorizada',
  LOW_BATTERY: 'Batería baja'
};

const ICONS: Record<AlertItem['type'], string> = {
  TEMP_BREACH: 'thermometer',
  LID_OPEN: 'unlock',
  UNAUTHORIZED_ACCESS: 'shield',
  LOW_BATTERY: 'battery'
};

/** Resume el mensaje del backend en pocas palabras. */
const shortDetail = (a: AlertItem): string => {
  if (a.type === 'TEMP_BREACH' && a.temperature !== undefined && a.minTemp !== undefined && a.maxTemp !== undefined) {
    const low = a.temperature < a.minTemp;
    return `${a.temperature}° · ${low ? 'mín.' : 'máx.'} ${low ? a.minTemp : a.maxTemp}°`;
  }
  if (a.type === 'TEMP_BREACH') {
    const nums = [...a.message.matchAll(/(-?\d+(?:\.\d+)?)°C/g)].map(m => m[1]);
    if (nums.length >= 2) return `${nums[0]}° · ${a.message.includes('inferior') ? 'mín.' : 'máx.'} ${nums[1]}°`;
  }
  if (a.type === 'LOW_BATTERY') {
    const m = a.message.match(/(\d+)%/);
    if (m) return `${m[1]}% de carga`;
  }
  if (a.type === 'LID_OPEN') return 'Sin OTP válido';
  if (a.type === 'UNAUTHORIZED_ACCESS') return a.message.toLowerCase().includes('forzada') ? 'Apertura forzada' : 'Sin OTP · paquete ausente';
  return a.message;
};

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, IconComponent, RevealDirective],
  template: `
    <div class="page">
      <!-- Resumen al estilo de la referencia: cifra grande + indicadores en fila -->
      <section class="summary card" appReveal>
        <div class="big">
          <span class="big-num">{{ open().length }}</span>
          <span class="big-label">alertas abiertas</span>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Críticas</span>
            <span class="stat-val"><i class="d crit"></i>{{ critical().length }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Advertencias</span>
            <span class="stat-val"><i class="d warn"></i>{{ open().length - critical().length }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Atendidas</span>
            <span class="stat-val"><i class="d done"></i>{{ resolved().length }}</span>
          </div>
        </div>
      </section>

      <section class="card list" [appReveal]="1">
        <div class="list-head">
          <h3>Alertas</h3>
          <div class="seg" role="tablist" aria-label="Filtrar alertas">
            <button type="button" role="tab" [class.on]="filter() === 'OPEN'" (click)="setFilter('OPEN')">Abiertas</button>
            <button type="button" role="tab" [class.on]="filter() === 'CRITICAL'" (click)="setFilter('CRITICAL')">Críticas</button>
            <button type="button" role="tab" [class.on]="filter() === 'RESOLVED'" (click)="setFilter('RESOLVED')">Atendidas</button>
          </div>
        </div>

        <div *ngFor="let a of page(); let i = index; trackBy: trackAlert" class="row" [class.done]="a.resolved" [appReveal]="i">
          <span class="ico" [class.crit]="a.severity === 'CRITICAL' && !a.resolved">
            <app-icon [name]="icon(a)" [size]="19" />
          </span>
          <div class="main">
            <span class="title">{{ title(a) }}</span>
            <span class="meta">{{ a.shipmentId !== '—' ? a.shipmentId + ' · ' : '' }}{{ a.smartBoxId }}</span>
          </div>
          <span class="detail">{{ detail(a) }}</span>
          <span class="time">{{ a.timestamp }}</span>
          <span class="act">
            <button *ngIf="!a.resolved" type="button" class="btn btn-secondary btn-xs" (click)="resolve(a.id)">Atender</button>
            <span *ngIf="a.resolved" class="ok"><app-icon name="check" [size]="15" /> Atendida</span>
          </span>
        </div>

        <button *ngIf="visible().length > shown()" type="button" class="more" (click)="shown.set(shown() + PAGE)">
          Mostrar más ({{ visible().length - shown() }})
        </button>

        <div *ngIf="!visible().length" class="empty">
          <app-icon name="shield" [size]="26" />
          <p>{{ filter() === 'RESOLVED' ? 'Aún no hay alertas atendidas.' : 'Todo en orden. No hay alertas.' }}</p>
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
    .stat-val { display: inline-flex; align-items: center; gap: 10px; font-size: 28px; font-weight: 500; font-variant-numeric: tabular-nums; }
    .d { width: 8px; height: 8px; border-radius: 50%; }
    .d.crit { background: var(--danger); }
    .d.warn { background: var(--hot); }
    .d.done { background: var(--cold); }

    .list { padding: 6px 0; }
    .list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 22px 12px; border-bottom: 1px solid var(--line); }
    h3 { font-size: 17px; font-weight: 600; }
    .seg { display: inline-flex; gap: 4px; padding: 4px; background: var(--bg-alt); border-radius: 999px; }
    .seg button { border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 13px; font-weight: 500; height: 34px; padding: 0 14px; border-radius: 999px; }
    .seg button.on { background: var(--white); color: var(--ink); box-shadow: var(--shadow-sm); }

    .row {
      display: grid;
      grid-template-columns: 40px minmax(160px, 1.4fr) 1fr 90px 110px;
      align-items: center;
      gap: 14px;
      padding: 14px 22px;
      border-bottom: 1px solid var(--line);
    }
    .row:last-of-type { border-bottom: 0; }
    .row.done { opacity: .55; }
    .ico { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-alt); color: var(--ink-2); display: inline-flex; align-items: center; justify-content: center; }
    .ico.crit { background: var(--danger-bg); color: var(--danger-strong); }
    .main { display: flex; flex-direction: column; min-width: 0; }
    .title { font-weight: 600; font-size: 14px; color: var(--ink); }
    .meta { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
    .detail { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
    .time { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
    .act { justify-self: end; }
    .btn-xs { height: 34px; padding: 0 14px; font-size: 13px; }
    .ok { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .more { display: block; margin: 12px auto 8px; border: 1px solid var(--line); background: var(--white); border-radius: 999px; height: 36px; padding: 0 18px; font: inherit; font-size: 13px; color: var(--ink-2); }
    .more:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; color: var(--muted); font-size: 14px; }

    @media (max-width: 760px) {
      .summary { grid-template-columns: 1fr; gap: 18px; padding: 20px; }
      .big-num { font-size: 52px; }
      .stat { padding: 2px 14px; }
      .stat:first-child { border-left: 0; padding-left: 0; }
      .stat-val { font-size: 22px; }
      .list-head { padding: 12px 16px; }
      .row {
        grid-template-columns: 40px 1fr auto;
        grid-template-areas: 'ico main time' 'ico detail act';
        row-gap: 6px; padding: 14px 16px;
      }
      .ico { grid-area: ico; align-self: start; }
      .main { grid-area: main; }
      .detail { grid-area: detail; }
      .time { grid-area: time; justify-self: end; }
      .act { grid-area: act; }
    }
  `]
})
export class AlertsComponent {
  private telemetryService = inject(TelemetryService);

  readonly PAGE = 25;
  filter = signal<Filter>('OPEN');
  shown = signal(this.PAGE);
  setFilter(f: Filter) {
    this.filter.set(f);
    this.shown.set(this.PAGE);
  }
  private all = this.telemetryService.alerts;
  open = computed(() => this.all().filter(a => !a.resolved));
  critical = computed(() => this.open().filter(a => a.severity === 'CRITICAL'));
  resolved = computed(() => this.all().filter(a => a.resolved));
  visible = computed(() => {
    const f = this.filter();
    return f === 'OPEN' ? this.open() : f === 'CRITICAL' ? this.critical() : this.resolved();
  });

  page = computed(() => this.visible().slice(0, this.shown()));

  title = (a: AlertItem) => TITLES[a.type] ?? a.type;
  icon = (a: AlertItem) => ICONS[a.type] ?? 'alert';
  detail = shortDetail;
  trackAlert = (_: number, a: { id: string }) => a.id;

  resolve(id: string) {
    this.telemetryService.resolveAlert(id);
  }
}
