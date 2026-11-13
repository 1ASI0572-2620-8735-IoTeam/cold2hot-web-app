import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Language, TranslationService } from '../core/services/translation.service';
import { AuthService } from '../core/services/auth.service';
import { TelemetryService } from '../core/services/telemetry.service';
import { IconComponent } from '../shared/icon.component';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="shell">
      <!-- BARRA SUPERIOR -->
      <header class="topbar">
        <div class="topbar-inner">
          <a routerLink="/dashboard/monitoring" class="brand" aria-label="Cold2Hot, ir a Monitoreo">
            <img src="brand/icon.png" alt="" class="brand-icon" width="34" height="34" />
            <span class="brand-word"><span class="w-cold">Cold</span><span class="w-two">2</span><span class="w-hot">Hot</span></span>
          </a>

          <nav class="nav" aria-label="Navegación principal">
            <a
              *ngFor="let l of links"
              [routerLink]="l.path"
              routerLinkActive="active"
              class="nav-link"
            >
              <app-icon [name]="l.icon" [size]="18" />
              <span>{{ t(l.label) }}</span>
              <span *ngIf="l.icon === 'bell' && criticalAlerts() > 0" class="nav-badge">{{ criticalAlerts() }}</span>
            </a>
          </nav>

          <div class="actions">
            <label class="search" [class.focused]="searchFocused()">
              <app-icon name="search" [size]="17" />
              <input
                type="search"
                placeholder="Buscar envío, dirección o caja"
                aria-label="Buscar envíos"
                [value]="searchTerm()"
                (input)="onSearch($any($event.target).value)"
                (focus)="searchFocused.set(true)"
                (blur)="searchFocused.set(false)"
                (keydown.enter)="goToMonitoring()"
              />
            </label>

            <div class="profile">
              <button type="button" class="profile-btn" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-haspopup="menu">
                <span class="avatar">{{ initials() }}</span>
                <span class="profile-meta">
                  <span class="profile-name">{{ currentUser()?.name }}</span>
                  <span class="profile-sub">{{ currentUser()?.restaurantName }}</span>
                </span>
                <app-icon name="chevron" [size]="16" />
              </button>

              <div *ngIf="menuOpen()" class="menu" role="menu">
                <div class="menu-lang" role="group" aria-label="Idioma">
                  <button type="button" [class.on]="currentLang() === 'es'" (click)="setLang('es')">ES</button>
                  <button type="button" [class.on]="currentLang() === 'en'" (click)="setLang('en')">EN</button>
                </div>
                <a role="menuitem" routerLink="/dashboard/settings" (click)="menuOpen.set(false)"><app-icon name="settings" [size]="17" /> {{ t('nav_settings') }}</a>
                <a role="menuitem" [href]="landingPageUrl" target="_blank" rel="noopener"><app-icon name="globe" [size]="17" /> Sitio web</a>
                <button role="menuitem" type="button" class="danger" (click)="logout()"><app-icon name="logout" [size]="17" /> {{ t('logout') }}</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="content">
        <div class="page-head">
          <h1 class="page-title" [class.sr-only]="pageTitleKey() !== 'nav_monitoring'">{{ t(pageTitleKey()) }}</h1>
          <span class="live" *ngIf="!connectionError()"><span class="live-dot"></span> En vivo · actualización cada 4 s</span>
        </div>
        <div *ngIf="connectionError()" class="conn-banner" role="alert">
          <app-icon name="alert" [size]="18" /> {{ connectionError() }}
        </div>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; background: var(--bg); }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: saturate(160%) blur(14px);
      -webkit-backdrop-filter: saturate(160%) blur(14px);
      border-bottom: 1px solid var(--line);
    }
    .topbar-inner {
      max-width: 1440px;
      margin: 0 auto;
      height: 72px;
      padding: 0 28px;
      display: flex;
      align-items: center;
      gap: 28px;
    }

    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex: none; }
    .brand-icon { width: 34px; height: 34px; object-fit: contain; }
    .brand-word { font-family: var(--font-display); font-weight: 700; font-size: 20px; letter-spacing: -0.02em; color: var(--ink); }
    .w-two { color: var(--cold-strong); }
    .w-hot { color: var(--hot); }

    .nav { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; flex: 1; min-width: 0; }
    .nav::-webkit-scrollbar { display: none; }
    .nav-link {
      position: relative;
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line);
      background: var(--white);
      color: var(--ink-2);
      font-weight: 500;
      font-size: 14px;
      text-decoration: none;
      white-space: nowrap;
      transition: color .2s ease, background-color .2s ease;
    }
    .nav-link:hover { color: var(--ink); border-color: #CBD5E1; }
    .nav-link.active { color: var(--white); background: var(--ink); border-color: var(--ink); font-weight: 600; }
    .nav-badge {
      min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
      background: var(--danger); color: #fff; font-size: 11px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
    }

    .actions { display: flex; align-items: center; gap: 12px; flex: none; }

    .search {
      display: flex; align-items: center; gap: 8px;
      height: 42px; width: 240px; flex: none; padding: 0 16px;
      border: 1px solid var(--line); border-radius: var(--radius-pill);
      background: var(--white); color: var(--muted);
      transition: border-color .2s ease, box-shadow .2s ease, width .25s ease;
    }
    .search.focused { border-color: var(--cold); box-shadow: 0 0 0 4px var(--cold-bg); }
    .search input { border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: var(--ink); width: 100%; }
    .search input::placeholder { color: #94A3B8; }

    .icon-btn {
      position: relative; width: 44px; height: 44px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--ink-2); transition: background-color .2s ease;
    }
    .icon-btn:hover { background: var(--bg-alt); }
    .dot-badge {
      position: absolute; top: 6px; right: 6px; min-width: 17px; height: 17px; padding: 0 4px;
      border-radius: 9px; background: var(--danger); color: #fff; font-size: 10px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center; border: 2px solid #fff;
    }
    .divider { width: 1px; height: 28px; background: var(--line); }

    .profile { position: relative; }
    .profile-btn {
      display: flex; align-items: center; gap: 10px; border: 0; background: transparent;
      padding: 4px 8px 4px 4px; border-radius: var(--radius-pill); color: var(--muted); font: inherit;
      transition: background-color .2s ease; min-height: 44px;
    }
    .profile-btn:hover { background: var(--bg-alt); }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%; flex: none;
      background: var(--cold-strong);
      color: #fff; font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; justify-content: center;
    }
    .profile-meta { display: flex; flex-direction: column; text-align: left; line-height: 1.2; }
    .profile-name { color: var(--ink); font-weight: 600; font-size: 14px; }
    .profile-sub { font-size: 12px; }

    .menu {
      position: absolute; right: 0; top: calc(100% + 8px); width: 230px; padding: 8px;
      background: var(--white); border: 1px solid var(--line); border-radius: 16px;
      box-shadow: 0 18px 40px -12px rgba(14, 23, 38, 0.25);
      display: flex; flex-direction: column; gap: 2px;
      animation: menu-in .18s ease-out;
    }
    @keyframes menu-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    .menu a, .menu button {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
      color: var(--ink-2); text-decoration: none; font: inherit; font-size: 14px; border: 0; background: transparent; text-align: left;
    }
    .menu a:hover, .menu button:hover { background: var(--bg-alt); }
    .menu .danger { color: var(--danger-strong); }
    .menu-lang { display: flex; gap: 4px; padding: 4px; margin-bottom: 4px; background: var(--bg-alt); border-radius: 10px; }
    .menu-lang button { flex: 1; justify-content: center; padding: 6px; font-weight: 600; color: var(--muted); }
    .menu-lang button.on { background: var(--white); color: var(--ink); box-shadow: var(--shadow-sm); }

    .content { max-width: 1440px; margin: 0 auto; padding: 28px 28px 48px; }
    .page-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
    .page-title { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .page-head:has(.sr-only) { justify-content: flex-end; margin-bottom: 8px; }
    .live { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 4px var(--ok-bg); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 50% { box-shadow: 0 0 0 7px transparent; } }
    .conn-banner {
      display: flex; align-items: center; gap: 10px; background: var(--danger-bg); color: var(--danger-strong);
      padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 14px;
    }

    @media (max-width: 1480px) {
      .search { width: 44px; padding: 0; justify-content: center; }
      .search input { display: none; }
      .search.focused { width: 220px; padding: 0 14px; justify-content: flex-start; }
      .search.focused input { display: block; }
      .profile-meta { display: none; }
    }
    @media (max-width: 1240px) {
      .topbar-inner { gap: 16px; padding: 0 20px; }
      .nav { gap: 6px; }
      .nav-link { padding: 0 12px; }
      .nav-link app-icon { display: none; }
    }
    @media (max-width: 1040px) {
      .topbar-inner { flex-wrap: wrap; height: auto; padding: 10px 16px 0; gap: 8px 16px; }
      .actions { margin-left: auto; gap: 4px; }
      .nav { order: 3; flex-basis: 100%; padding-bottom: 10px; }
      .nav-link app-icon { display: inline-flex; }
    }
    @media (max-width: 860px) {
      .topbar-inner { flex-wrap: wrap; height: auto; padding: 10px 16px 0; gap: 8px 16px; }
      .actions { margin-left: auto; gap: 4px; }
      .divider, .profile-btn app-icon { display: none; }
      .brand-word { font-size: 18px; }
      .nav { order: 3; flex-basis: 100%; padding-bottom: 8px; }
      .content { padding: 20px 16px 40px; }
    }
  `]
})
export class MainLayoutComponent {
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private telemetryService = inject(TelemetryService);
  private router = inject(Router);

  readonly links: NavLink[] = [
    { path: '/dashboard/monitoring', label: 'nav_monitoring', icon: 'gauge' },
    { path: '/dashboard/alerts', label: 'nav_alerts', icon: 'bell' },
    { path: '/dashboard/history', label: 'nav_history', icon: 'history' },
    { path: '/dashboard/smartboxes', label: 'nav_smartboxes', icon: 'package' },
    { path: '/dashboard/operators', label: 'nav_operators', icon: 'users' }
  ];

  currentUser = this.authService.currentUser;
  currentLang = this.translationService.currentLang;
  criticalAlerts = this.telemetryService.criticalAlertsCount;
  connectionError = this.telemetryService.connectionError;
  searchTerm = this.telemetryService.searchTerm;
  searchFocused = signal(false);
  menuOpen = signal(false);

  initials = computed(() => {
    const name = this.currentUser()?.name || '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'C2H';
  });

  private url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url }
  );
  pageTitleKey = computed(() => {
    const u = this.url();
    if (u.includes('/alerts')) return 'nav_alerts';
    if (u.includes('/history')) return 'nav_history';
    if (u.includes('/smartboxes')) return 'nav_smartboxes';
    if (u.includes('/operators')) return 'nav_operators';
    if (u.includes('/settings')) return 'nav_settings';
    return 'nav_monitoring';
  });

  get landingPageUrl(): string {
    const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocal ? 'http://localhost:8000' : 'https://1asi0572-2620-8735-ioteam.github.io/cold2hot-landing-page/';
  }

  @HostListener('document:click', ['$event'])
  closeMenu(e: MouseEvent) {
    if (this.menuOpen() && !(e.target as HTMLElement).closest('.profile')) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
  }

  goToMonitoring() {
    if (!this.url().includes('/monitoring')) this.router.navigate(['/dashboard/monitoring']);
  }

  setLang(lang: Language) {
    this.translationService.setLanguage(lang);
  }

  logout() {
    this.menuOpen.set(false);
    this.authService.logout();
  }
}
