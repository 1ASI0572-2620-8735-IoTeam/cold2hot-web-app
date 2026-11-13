import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { API, API_BASE } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { PreferencesService, ThermalDefaults } from '../../core/services/preferences.service';
import { Language, TranslationService } from '../../core/services/translation.service';
import { RevealDirective } from '../../shared/reveal.directive';

interface ServiceStatus {
  name: string;
  url: string;
  up: boolean | null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RevealDirective],
  template: `
    <div class="settings">
      <div appReveal>
        <h2 class="section-title">Configuración</h2>
        <p class="section-sub">Cuenta, idioma, parámetros térmicos y estado de la plataforma</p>
      </div>

      <div class="settings-grid">
        <!-- Cuenta -->
        <section class="card panel" [appReveal]="1">
          <h3 class="panel-title">Cuenta</h3>
          <dl class="kv" *ngIf="user() as u">
            <dt>Nombre</dt><dd>{{ u.name }}</dd>
            <dt>Correo</dt><dd>{{ u.email }}</dd>
            <dt>Restaurante</dt><dd>{{ u.restaurantName }}</dd>
            <dt>Rol</dt><dd>{{ u.role === 'ADMINISTRATOR' ? 'Administrador' : 'Operador' }}</dd>
          </dl>
          <button class="btn btn-secondary" type="button" (click)="logout()">Cerrar sesión</button>
        </section>

        <!-- Idioma -->
        <section class="card panel" [appReveal]="2">
          <h3 class="panel-title">Idioma de la interfaz</h3>
          <div class="seg" role="radiogroup" aria-label="Idioma">
            <button type="button" role="radio" [attr.aria-checked]="lang() === 'es'" [class.on]="lang() === 'es'" (click)="setLang('es')">Español</button>
            <button type="button" role="radio" [attr.aria-checked]="lang() === 'en'" [class.on]="lang() === 'en'" (click)="setLang('en')">English</button>
          </div>
          <p class="hint">Se guarda en este navegador.</p>
        </section>

        <!-- Rangos térmicos -->
        <section class="card panel wide" [appReveal]="3">
          <h3 class="panel-title">Rangos térmicos por defecto</h3>
          <p class="hint">Se precargan al crear un nuevo despacho; puedes ajustarlos en cada envío.</p>
          <form class="thermal" (ngSubmit)="saveThermal()">
            <fieldset>
              <legend class="hot-label">Caliente (°C)</legend>
              <label>Mínimo <input type="number" step="0.5" name="hotMin" [(ngModel)]="draft.hotMin" required /></label>
              <label>Máximo <input type="number" step="0.5" name="hotMax" [(ngModel)]="draft.hotMax" required /></label>
            </fieldset>
            <fieldset>
              <legend class="cold-label">Frío (°C)</legend>
              <label>Mínimo <input type="number" step="0.5" name="coldMin" [(ngModel)]="draft.coldMin" required /></label>
              <label>Máximo <input type="number" step="0.5" name="coldMax" [(ngModel)]="draft.coldMax" required /></label>
            </fieldset>
            <div class="actions">
              <button class="btn btn-primary" type="submit">Guardar</button>
              <button class="btn btn-ghost" type="button" (click)="resetThermal()">Restablecer valores</button>
              <span *ngIf="thermalMsg" class="msg" [class.err]="thermalErr" role="status">{{ thermalMsg }}</span>
            </div>
          </form>
        </section>

        <!-- Estado de la plataforma -->
        <section class="card panel wide" [appReveal]="4">
          <div class="panel-head">
            <h3 class="panel-title">Estado de la plataforma</h3>
            <button class="btn btn-ghost" type="button" (click)="checkServices()">Verificar</button>
          </div>
          <p class="hint">API Gateway: <code>{{ apiBase }}</code></p>
          <ul class="services">
            <li *ngFor="let s of services()">
              <span class="dot" [class.up]="s.up === true" [class.down]="s.up === false"></span>
              <span class="svc-name">{{ s.name }}</span>
              <span class="svc-state">{{ s.up === null ? 'verificando…' : s.up ? 'operativo' : 'sin respuesta' }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .settings { display: flex; flex-direction: column; gap: 24px; max-width: 980px; }
    .section-title { font-family: var(--font-display); font-size: 22px; }
    .section-sub { color: var(--muted); font-size: 14px; margin-top: 4px; }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .wide { grid-column: 1 / -1; }
    .panel { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
    .panel-head { display: flex; justify-content: space-between; align-items: center; }
    .panel-title { font-size: 16px; }
    .hint { color: var(--muted); font-size: 13px; }
    code { background: var(--bg-alt); padding: 2px 6px; border-radius: 6px; font-size: 12px; }
    .kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; font-size: 14px; }
    .kv dt { color: var(--muted); }
    .kv dd { font-weight: 500; word-break: break-all; }
    .seg { display: inline-flex; background: var(--bg-alt); border-radius: var(--radius-pill); padding: 4px; width: fit-content; }
    .seg button { border: 0; background: transparent; padding: 8px 18px; border-radius: var(--radius-pill); font-weight: 600; font-size: 14px; color: var(--muted); cursor: pointer; transition: background .2s, color .2s; min-height: 40px; }
    .seg button.on { background: var(--white); color: var(--ink); box-shadow: var(--shadow-sm); }
    .thermal { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; }
    fieldset { border: 1px solid var(--line); border-radius: var(--radius-input); padding: 12px 16px 16px; display: flex; gap: 12px; }
    legend { padding: 0 6px; font-weight: 600; font-size: 13px; }
    .hot-label { color: var(--hot-strong); }
    .cold-label { color: var(--cold-strong); }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
    input[type=number] { width: 96px; padding: 9px 10px; border: 1px solid var(--line); border-radius: var(--radius-input); font-family: var(--font-body); font-size: 14px; }
    .actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .msg { font-size: 13px; color: var(--ok-strong); }
    .msg.err { color: var(--danger-strong); }
    .services { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
    .services li { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-input); font-size: 14px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--line); flex: none; }
    .dot.up { background: var(--ok); box-shadow: 0 0 0 4px var(--ok-bg); }
    .dot.down { background: var(--danger); box-shadow: 0 0 0 4px var(--danger-bg); }
    .svc-name { font-weight: 500; flex: 1; }
    .svc-state { color: var(--muted); font-size: 12px; }
  `]
})
export class SettingsComponent implements OnInit {
  private auth = inject(AuthService);
  private prefs = inject(PreferencesService);
  private translation = inject(TranslationService);
  private http = inject(HttpClient);

  readonly apiBase = API_BASE;
  user = this.auth.currentUser;
  lang = this.translation.currentLang;

  draft: ThermalDefaults = { ...this.prefs.thermalDefaults() };
  thermalMsg = '';
  thermalErr = false;

  services = signal<ServiceStatus[]>([
    { name: 'IAM (identidad)', url: `${API.iam}/health`, up: null },
    { name: 'Telemetría', url: `${API.telemetry}/health`, up: null },
    { name: 'Contenedores', url: `${API.containers}/health`, up: null },
    { name: 'Seguridad y acceso', url: `${API.security}/health`, up: null },
    { name: 'Órdenes y auditoría', url: `${API.orders}/health`, up: null }
  ]);

  ngOnInit() {
    this.checkServices();
  }

  setLang(l: Language) {
    this.translation.setLanguage(l);
  }

  saveThermal() {
    const d = this.draft;
    const valid = [d.hotMin, d.hotMax, d.coldMin, d.coldMax].every(Number.isFinite) && d.hotMin < d.hotMax && d.coldMin < d.coldMax;
    this.thermalErr = !valid;
    if (!valid) {
      this.thermalMsg = 'En cada rango el mínimo debe ser menor que el máximo.';
      return;
    }
    this.prefs.saveThermalDefaults({ ...d });
    this.thermalMsg = 'Rangos guardados.';
  }

  resetThermal() {
    this.prefs.resetThermalDefaults();
    this.draft = { ...this.prefs.thermalDefaults() };
    this.thermalErr = false;
    this.thermalMsg = 'Valores de fábrica restaurados.';
  }

  async checkServices() {
    this.services.update(list => list.map(s => ({ ...s, up: null })));
    const results = await Promise.all(
      this.services().map(async s => {
        try {
          await firstValueFrom(this.http.get(s.url));
          return { ...s, up: true };
        } catch {
          return { ...s, up: false };
        }
      })
    );
    this.services.set(results);
  }

  logout() {
    this.auth.logout();
  }
}
