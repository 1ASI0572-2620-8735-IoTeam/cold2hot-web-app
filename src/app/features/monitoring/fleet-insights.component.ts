import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../../core/services/telemetry.service';
import { RevealDirective } from '../../shared/reveal.directive';

const DOTS = 14;
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

/** Matriz de lecturas por envío y dona de uso de la flota de SmartBoxes. */
@Component({
  selector: 'app-fleet-insights',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  template: `
    <section class="card matrix" appReveal>
      <div class="head">
        <div>
          <h3>Historial de lecturas</h3>
          <p class="sub">Últimas {{ dots }} lecturas por envío activo</p>
        </div>
        <div class="legend">
          <span><i class="d in"></i> En rango</span>
          <span><i class="d out"></i> Fuera de rango</span>
        </div>
      </div>

      <p *ngIf="!rows().length" class="empty">Aún no hay lecturas de envíos activos.</p>

      <div class="grid" *ngIf="rows().length">
        <ng-container *ngFor="let row of rows(); trackBy: trackRow">
          <span class="row-label">{{ row.id }}</span>
          <div class="row-dots">
            <span
              *ngFor="let d of row.cells; let i = index; trackBy: trackIndex"
              class="d"
              [class.in]="d === 'in'"
              [class.out]="d === 'out'"
              [class.none]="d === 'none'"
              [attr.title]="d === 'none' ? 'Sin lectura' : d === 'in' ? 'En rango' : 'Fuera de rango'"
            ></span>
          </div>
        </ng-container>
      </div>
    </section>

    <section class="card donut-card" [appReveal]="1">
      <h3>Uso de la flota</h3>
      <p class="sub">Estado de las cajas SmartBox</p>
      <div class="donut-body">
        <div class="donut">
          <svg viewBox="0 0 128 128" role="img" [attr.aria-label]="usage() + '% de cajas en ruta'">
            <circle cx="64" cy="64" [attr.r]="radius" fill="none" stroke="var(--bg-alt)" stroke-width="14" />
            <circle
              *ngFor="let s of slices(); trackBy: trackSlice"
              cx="64"
              cy="64"
              [attr.r]="radius"
              fill="none"
              [attr.stroke]="s.color"
              stroke-width="14"
              [attr.stroke-dasharray]="s.dash"
              [attr.stroke-dashoffset]="s.offset"
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div class="donut-center">
            <strong>{{ usage() }}%</strong>
            <span>en ruta</span>
          </div>
        </div>
        <ul class="donut-legend">
          <li *ngFor="let s of slices(); trackBy: trackSlice"><i [style.background]="s.color"></i>{{ s.label }} <b>{{ s.count }}</b></li>
        </ul>
      </div>
    </section>
  `,
  styles: [`
    :host { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; }
    @media (max-width: 900px) { :host { grid-template-columns: 1fr; } }
    .card { padding: 20px 22px; }
    h3 { font-size: 16px; font-weight: 600; }
    .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .empty { font-size: 13px; color: var(--muted); padding: 12px 0; }
    .grid { display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; align-items: center; }
    .row-label { font-size: 12px; font-weight: 600; color: var(--ink-2); font-variant-numeric: tabular-nums; }
    .row-dots { display: grid; grid-template-columns: repeat(14, 1fr); gap: 6px; }
    .d { display: inline-block; width: 100%; max-width: 20px; aspect-ratio: 1; border-radius: 50%; }
    .legend .d { width: 10px; }
    .d.in { background: var(--cold); }
    .d.out { background: var(--hot); }
    .d.none { background: var(--bg-alt); }

    .donut-body { display: flex; align-items: center; gap: 20px; margin-top: 14px; flex-wrap: wrap; }
    .donut { position: relative; width: 132px; height: 132px; flex: none; }
    .donut svg { width: 100%; height: 100%; }
    .donut circle { transition: stroke-dasharray .5s ease, stroke-dashoffset .5s ease; }
    .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-center strong { font-size: 24px; font-weight: 700; line-height: 1; }
    .donut-center span { font-size: 11px; color: var(--muted); }
    .donut-legend { list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--ink-2); }
    .donut-legend li { display: flex; align-items: center; gap: 8px; }
    .donut-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .donut-legend b { margin-left: auto; padding-left: 12px; font-variant-numeric: tabular-nums; }
  `]
})
export class FleetInsightsComponent {
  private telemetry = inject(TelemetryService);
  readonly dots = DOTS;
  readonly radius = RADIUS;

  trackRow = (_: number, r: { id: string }) => r.id;
  trackIndex = (i: number) => i;
  trackSlice = (_: number, s: { label: string }) => s.label;

  rows = computed(() =>
    this.telemetry
      .shipments()
      .slice(0, 6)
      .map(s => {
        const last = s.history.slice(-DOTS);
        const cells: ('in' | 'out' | 'none')[] = last.map(h =>
          h.temperature < s.targetMinTemp || h.temperature > s.targetMaxTemp ? 'out' : 'in'
        );
        while (cells.length < DOTS) cells.unshift('none');
        return { id: s.id, cells };
      })
  );

  private counts = computed(() => {
    const boxes = this.telemetry.smartBoxes();
    return {
      total: boxes.length,
      transit: boxes.filter(b => b.status === 'IN_TRANSIT').length,
      available: boxes.filter(b => b.status === 'AVAILABLE').length,
      other: boxes.filter(b => b.status !== 'IN_TRANSIT' && b.status !== 'AVAILABLE').length
    };
  });

  usage = computed(() => {
    const c = this.counts();
    return c.total ? Math.round((c.transit / c.total) * 100) : 0;
  });

  slices = computed(() => {
    const c = this.counts();
    const parts = [
      { label: 'En ruta', count: c.transit, color: 'var(--hot)' },
      { label: 'Disponibles', count: c.available, color: 'var(--cold)' },
      { label: 'Mantenimiento', count: c.other, color: '#94A3B8' }
    ];
    let acc = 0;
    return parts.map(p => {
      const len = c.total ? (p.count / c.total) * CIRC : 0;
      const slice = { ...p, dash: `${len} ${CIRC - len}`, offset: -acc };
      acc += len;
      return slice;
    });
  });
}
