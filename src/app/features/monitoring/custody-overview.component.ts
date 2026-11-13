import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { IconComponent } from '../../shared/icon.component';
import { RevealDirective } from '../../shared/reveal.directive';

interface Tile {
  label: string;
  value: string;
  hint: string;
  badge: string;
  tone: 'cold' | 'hot' | 'danger' | 'ok' | 'neutral';
  link: string;
}

const SEGMENTS = 12;

/** Panel principal: saludo, medidor de integridad térmica de la flota y mini‑tarjetas de indicadores. */
@Component({
  selector: 'app-custody-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, RevealDirective],
  template: `
    <section class="hero card" appReveal>
      <h2 class="hero-title">Hola, {{ firstName() }}</h2>
      <p class="hello">Integridad térmica de tus envíos</p>

      <div class="gauge-wrap">
        <svg viewBox="0 0 240 140" class="gauge" role="img" [attr.aria-label]="'Integridad térmica ' + scoreLabel()">
          <path
            *ngFor="let seg of segments(); let i = index; trackBy: trackIndex"
            [attr.d]="seg.d"
            [attr.stroke]="seg.on ? seg.color : 'var(--line)'"
            stroke-width="18"
            stroke-linecap="butt"
            fill="none"
          />
        </svg>
        <div class="gauge-center">
          <span class="tag"><i [ngClass]="'t-' + scoreTone()"></i>{{ scoreBadge() }}</span>
          <span class="score">{{ scoreLabel() }}</span>
          <span class="score-sub">en rango</span>
        </div>
        <span class="g-min">0%</span>
        <span class="g-max">100%</span>
      </div>

      <button type="button" class="btn btn-dark hero-btn" (click)="newShipment.emit()">
        <app-icon name="plus" [size]="18" /> Crear nuevo envío
      </button>
    </section>

    <div class="tiles">
      <a *ngFor="let tile of tiles(); let i = index; trackBy: trackTile" class="tile card" [routerLink]="tile.link" [appReveal]="i + 1">
        <div class="tile-head">
          <span class="tile-label">{{ tile.label }}</span>
          <span class="tile-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="tile-row">
          <span class="tile-value">{{ tile.value }}</span>
          <span class="tag"><i [ngClass]="'t-' + tile.tone"></i>{{ tile.badge }}</span>
        </div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 16px; }
    .hero { padding: 26px 24px 24px; text-align: center; }
    .hello { font-size: 15px; color: var(--muted); font-weight: 500; }
    .hero-title { font-size: 26px; font-weight: 600; line-height: 1.2; }
    .gauge-wrap { position: relative; width: 260px; max-width: 100%; margin: 18px auto 6px; }
    .gauge { width: 100%; display: block; }
    .gauge path { transition: stroke 0.4s ease; }
    .gauge-center { position: absolute; left: 0; right: 0; bottom: 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .score { font-size: 48px; font-weight: 500; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .score-sub { font-size: 12px; color: var(--muted); }
    .g-min, .g-max { position: absolute; bottom: -18px; font-size: 11px; color: var(--muted); }
    .g-min { left: 10px; }
    .g-max { right: 4px; }
    .hero-btn { margin-top: 30px; width: 100%; }

    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .tile { padding: 16px; display: flex; flex-direction: column; gap: 10px; text-decoration: none; color: inherit; border-radius: 18px; }
    .tile:hover { transform: translateY(-2px); }
    .tile-head { display: flex; justify-content: space-between; align-items: center; }
    .tile-label { font-size: 13px; font-weight: 500; color: var(--muted); }
    .tile-arrow { width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: var(--muted); transition: background .2s, color .2s; }
    .tile:hover .tile-arrow { background: var(--ink); color: #fff; border-color: var(--ink); }
    .tile-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .tile-value { font-size: 32px; font-weight: 500; font-weight: 700; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
    .tile-hint { font-size: 11.5px; color: var(--muted); line-height: 1.4; }

    .tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); white-space: nowrap; }
    .tag i { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
    .tag i.t-cold { background: var(--cold); }
    .tag i.t-hot { background: var(--hot); }
    .tag i.t-danger { background: var(--danger); }
    .tag i.t-ok { background: var(--ok); }
    .tag i.t-neutral { background: #CBD5E1; }
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .b-cold { background: var(--cold-bg); color: var(--cold-strong); }
    .b-hot { background: var(--hot-bg); color: var(--hot-strong); }
    .b-danger { background: var(--danger-bg); color: var(--danger-strong); }
    .b-ok { background: var(--ok-bg); color: var(--ok-strong); }
    .b-neutral { background: var(--bg-alt); color: var(--muted); }
  `]
})
export class CustodyOverviewComponent {
  private auth = inject(AuthService);
  private telemetry = inject(TelemetryService);

  readonly newShipment = output<void>();

  trackIndex = (i: number) => i;
  trackTile = (_: number, t: Tile) => t.label;

  firstName = computed(() => (this.auth.currentUser()?.name || 'equipo').split(' ')[0]);

  private withReadings = computed(() => this.telemetry.shipments().filter(s => s.currentTemp !== null));

  /** Porcentaje de envíos activos con lectura dentro de su rango; null si no hay lecturas. */
  score = computed<number | null>(() => {
    const list = this.withReadings();
    if (!list.length) return null;
    return Math.round((list.filter(s => s.thermalStatus === 'OPTIMAL').length / list.length) * 100);
  });
  scoreLabel = computed(() => (this.score() === null ? '—' : this.score() + '%'));
  scoreTone = computed(() => {
    const s = this.score();
    if (s === null) return 'neutral';
    return s >= 90 ? 'cold' : s >= 60 ? 'hot' : 'danger';
  });
  scoreBadge = computed(() => {
    const s = this.score();
    if (s === null) return 'Sin lecturas';
    return s >= 90 ? 'Óptimo' : s >= 60 ? 'Atención' : 'Crítico';
  });

  segments = computed(() => {
    const filled = this.score() === null ? 0 : Math.round((this.score()! / 100) * SEGMENTS);
    const cx = 120, cy = 124, r = 100, gap = 4.5;
    const span = (180 - gap * (SEGMENTS - 1)) / SEGMENTS;
    return Array.from({ length: SEGMENTS }, (_, i) => {
      const a0 = 180 - i * (span + gap);
      const a1 = a0 - span;
      const p = (deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
      const [x0, y0] = p(a0);
      const [x1, y1] = p(a1);
      // Colores sólidos del logo: tramo bajo en naranja, tramo alto en celeste
      const color = i < 3 ? 'var(--danger)' : i < 7 ? 'var(--hot)' : 'var(--cold)';
      return { d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`, on: i < filled, color };
    });
  });

  tiles = computed<Tile[]>(() => {
    const shipments = this.telemetry.shipments();
    const boxes = this.telemetry.smartBoxes();
    const alerts = this.telemetry.alerts().filter(a => !a.resolved);
    const critical = alerts.filter(a => a.severity === 'CRITICAL').length;
    const available = boxes.filter(b => b.status === 'AVAILABLE').length;
    const inUse = boxes.filter(b => b.status === 'IN_TRANSIT');
    const avgBattery = inUse.length ? Math.round(inUse.reduce((a, b) => a + b.batteryLevel, 0) / inUse.length) : null;
    const unlocked = shipments.filter(s => s.lockStatus === 'UNLOCKED').length;
    const breaches = shipments.reduce((n, s) => n + s.history.filter(h => h.temperature < s.targetMinTemp || h.temperature > s.targetMaxTemp).length, 0);

    return [
      { label: 'En ruta', value: String(shipments.length), hint: 'Despachos en ruta con SmartBox asignada.', badge: shipments.length ? 'Activos' : 'Ninguno', tone: shipments.length ? 'cold' : 'neutral', link: '/dashboard/monitoring' },
      { label: 'Alertas', value: String(critical), hint: 'Desvíos térmicos o aperturas no autorizadas.', badge: critical ? 'Críticas' : 'Ninguna', tone: critical ? 'danger' : 'ok', link: '/dashboard/alerts' },
      { label: 'Cajas libres', value: String(available), hint: 'Listas para asignar a un nuevo envío.', badge: available ? 'Disponibles' : 'Agotadas', tone: available ? 'cold' : 'hot', link: '/dashboard/smartboxes' },
      { label: 'Batería', value: avgBattery === null ? '—' : avgBattery + '%', hint: 'Promedio de las cajas que están en ruta.', badge: avgBattery === null ? 'Sin datos' : avgBattery >= 30 ? 'Estable' : 'Baja', tone: avgBattery === null ? 'neutral' : avgBattery >= 30 ? 'ok' : 'hot', link: '/dashboard/smartboxes' },
      { label: 'Desvíos', value: String(breaches), hint: 'Lecturas recientes fuera del rango del envío.', badge: breaches ? 'Atención' : 'En rango', tone: breaches ? 'hot' : 'cold', link: '/dashboard/history' },
      { label: 'Cerrojos', value: String(unlocked), hint: 'Cajas desbloqueadas con OTP en este momento.', badge: unlocked ? 'Abiertos' : 'Todos cerrados', tone: unlocked ? 'hot' : 'ok', link: '/dashboard/history' }
    ];
  });
}
