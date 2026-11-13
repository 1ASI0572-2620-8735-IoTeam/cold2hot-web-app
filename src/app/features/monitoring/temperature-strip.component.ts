import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../../core/services/telemetry.service';
import { RevealDirective } from '../../shared/reveal.directive';

/** Escala común de temperatura: de frío (izquierda, celeste) a caliente (derecha, naranja). */
const SCALE_MIN = 0;
const SCALE_MAX = 90;
const STRIPES = 48;

/** Interpolación por pasos (colores sólidos) entre celeste #38BDF8 y naranja #FD5701. */
const stepColor = (t: number) => {
  const a = [0x38, 0xbd, 0xf8];
  const b = [0xfd, 0x57, 0x01];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

const pct = (temp: number) => Math.min(100, Math.max(0, ((temp - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

@Component({
  selector: 'app-temperature-strip',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  template: `
    <section class="strip card" appReveal>
      <div class="big">
        <span class="big-num">{{ temp() === null ? '—' : (temp()! | number: '1.1-1') + '°' }}</span>
        <span class="big-label">{{ current() ? current()!.id : 'Sin envíos activos' }}</span>
      </div>

      <div class="bar-area">
        <div class="bar-top">
          <p class="status" [class.bad]="breach()">
            <strong>{{ statusWord() }}</strong>
            <span *ngIf="current()">rango {{ current()!.targetMinTemp }}–{{ current()!.targetMaxTemp }} °C</span>
          </p>
          <div class="pills" *ngIf="shipments().length > 1" role="tablist" aria-label="Envío">
            <button
              *ngFor="let s of shipments(); trackBy: trackId"
              type="button"
              role="tab"
              [attr.aria-selected]="s.id === current()?.id"
              [class.on]="s.id === current()?.id"
              (click)="selectedId.set(s.id)"
            >{{ s.id.replace('#C2H-', '') }}</button>
          </div>
        </div>

        <div class="bar" aria-hidden="true">
          <span
            *ngFor="let st of stripes(); let i = index; trackBy: trackIndex"
            class="stripe"
            [style.background]="st.on ? st.color : null"
          ></span>
          <span *ngIf="range()" class="range" [style.left.%]="range()!.from" [style.width.%]="range()!.width"></span>
          <span *ngIf="temp() !== null" class="marker" [style.left.%]="markerPos()"></span>
        </div>
        <div class="axis"><span>{{ min }}°C · frío</span><span>caliente · {{ max }}°C</span></div>
      </div>
    </section>
  `,
  styles: [`
    .strip { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; padding: 22px 26px; }
    .big { display: flex; flex-direction: column; min-width: 120px; }
    .big-num { font-size: 64px; font-weight: 500; line-height: 0.95; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    .big-label { font-size: 13px; color: var(--muted); margin-top: 6px; }
    .bar-area { min-width: 0; }
    .bar-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .status { font-size: 13px; color: var(--muted); display: flex; gap: 8px; align-items: baseline; }
    .status strong { font-size: 15px; font-weight: 600; color: var(--cold-strong); }
    .status.bad strong { color: var(--hot-strong); }
    .pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pills button { border: 1px solid var(--line); background: var(--white); color: var(--ink-2); border-radius: 999px; padding: 0 12px; height: 32px; font: inherit; font-size: 12px; font-weight: 500; }
    .pills button.on { background: var(--ink); color: #fff; border-color: var(--ink); }
    .bar { position: relative; display: flex; gap: 2px; height: 44px; padding: 0; }
    .stripe { flex: 1; border-radius: 3px; background: var(--bg-alt); transition: background-color .4s ease; }
    .range { position: absolute; bottom: -8px; height: 3px; border-radius: 2px; background: var(--ink); opacity: .55; }
    .marker { position: absolute; top: -6px; bottom: -6px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--ink); transition: left .5s ease; }
    .axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 14px; }
    @media (max-width: 640px) {
      .strip { grid-template-columns: 1fr; gap: 16px; padding: 18px; }
      .big-num { font-size: 48px; }
      .bar { height: 34px; gap: 1px; }
    }
  `]
})
export class TemperatureStripComponent {
  private telemetry = inject(TelemetryService);
  readonly min = SCALE_MIN;
  readonly max = SCALE_MAX;

  shipments = this.telemetry.shipments;
  selectedId = signal<string | null>(null);

  current = computed(() => {
    const list = this.shipments();
    // Por defecto, el envío fuera de rango (el que necesita atención) o el primero
    return list.find(s => s.id === this.selectedId()) ?? list.find(s => s.thermalStatus === 'BREACH') ?? list[0] ?? null;
  });
  temp = computed(() => this.current()?.currentTemp ?? null);
  breach = computed(() => this.current()?.thermalStatus === 'BREACH');
  statusWord = computed(() => {
    const s = this.current();
    if (!s) return 'Sin datos';
    if (s.currentTemp === null) return 'Esperando lectura';
    if (!this.breach()) return 'En rango';
    return s.currentTemp < s.targetMinTemp ? 'Por debajo' : 'Por encima';
  });
  markerPos = computed(() => (this.temp() === null ? 0 : pct(this.temp()!)));
  range = computed(() => {
    const s = this.current();
    if (!s) return null;
    const from = pct(s.targetMinTemp);
    return { from, width: Math.max(1, pct(s.targetMaxTemp) - from) };
  });
  stripes = computed(() => {
    const filled = this.temp() === null ? 0 : (this.markerPos() / 100) * STRIPES;
    return Array.from({ length: STRIPES }, (_, i) => ({ on: i < filled, color: stepColor(i / (STRIPES - 1)) }));
  });

  trackId = (_: number, s: { id: string }) => s.id;
  trackIndex = (i: number) => i;
}
