import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslationService, Language } from '../core/services/translation.service';
import { AuthService } from '../core/services/auth.service';
import { TelemetryService } from '../core/services/telemetry.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-layout">
      <!-- SIDEBAR LATERAL (Figma W04: #0E1726) -->
      <aside class="app-sidebar" aria-label="Navegación principal">
        <div class="sidebar-header">
          <div class="logo-container">
            <span class="logo-emoji">🔥❄️</span>
            <div class="logo-text">
              <span class="brand-name">Cold2Hot</span>
              <span class="brand-sub">IoT Custody</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <!-- SECCIÓN OPERACIÓN -->
          <div class="nav-section-title">{{ t('nav_operation') }}</div>
          
          <a
            routerLink="/dashboard/monitoring"
            routerLinkActive="active"
            class="nav-item"
          >
            <span class="nav-icon">📊</span>
            <span class="nav-label">{{ t('nav_monitoring') }}</span>
          </a>

          <a
            routerLink="/dashboard/alerts"
            routerLinkActive="active"
            class="nav-item"
          >
            <span class="nav-icon">⚠️</span>
            <span class="nav-label">{{ t('nav_alerts') }}</span>
            <span class="alert-badge" *ngIf="criticalAlerts() > 0">{{ criticalAlerts() }}</span>
          </a>

          <!-- SECCIÓN AUDITORÍA -->
          <div class="nav-section-title">{{ t('nav_audit') }}</div>
          
          <a
            routerLink="/dashboard/smartboxes"
            routerLinkActive="active"
            class="nav-item"
          >
            <span class="nav-icon">📦</span>
            <span class="nav-label">{{ t('nav_smartboxes') }}</span>
          </a>

          <!-- SECCIÓN ADMINISTRACIÓN -->
          <div class="nav-section-title">{{ t('nav_admin') }}</div>

          <a
            href="#"
            (click)="$event.preventDefault()"
            class="nav-item nav-item-disabled"
            title="Disponible en TB2"
          >
            <span class="nav-icon">👥</span>
            <span class="nav-label">{{ t('nav_operators') }}</span>
          </a>

          <a
            href="#"
            (click)="$event.preventDefault()"
            class="nav-item nav-item-disabled"
            title="Disponible en TB2"
          >
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">{{ t('nav_settings') }}</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="iot-status-badge">
            <span class="live-pulse"></span>
            <span>ESP32 Gateway: ONLINE</span>
          </div>
        </div>
      </aside>

      <!-- CONTENEDOR PRINCIPAL -->
      <div class="app-main-content">
        <!-- TOPBAR SUPERIOR -->
        <header class="app-topbar">
          <div class="topbar-left">
            <h1 class="page-title">{{ t('nav_monitoring') }}</h1>
            <span class="tag-version">Sprint 1 / TB1</span>
          </div>

          <div class="topbar-right">
            <!-- Selector de Idioma (i18n: es_419 y en_US) -->
            <div class="lang-selector" aria-label="Selector de idioma">
              <button
                type="button"
                class="lang-btn"
                [class.active]="currentLang() === 'es'"
                (click)="setLang('es')"
              >
                ES
              </button>
              <span class="lang-divider">/</span>
              <button
                type="button"
                class="lang-btn"
                [class.active]="currentLang() === 'en'"
                (click)="setLang('en')"
              >
                EN
              </button>
            </div>

            <!-- Perfil del Administrador -->
            <div class="user-profile">
              <div class="user-avatar">AD</div>
              <div class="user-meta">
                <span class="user-name">{{ currentUser()?.name }}</span>
                <span class="user-restaurant">{{ currentUser()?.restaurantName }}</span>
              </div>
            </div>

            <!-- Botón Salir -->
            <button
              type="button"
              class="logout-icon-btn"
              (click)="logout()"
              title="Cerrar sesión"
            >
              ⎋
            </button>
          </div>
        </header>

        <!-- CONTENIDO DE PÁGINA -->
        <main class="content-body">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
      background-color: var(--bg);

      @media (max-width: 960px) {
        grid-template-columns: 80px 1fr;
      }
    }

    /* SIDEBAR */
    .app-sidebar {
      background-color: var(--sidebar-bg);
      color: var(--white);
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-emoji {
      font-size: 24px;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .brand-sub {
      font-size: 10px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.8px;
      padding: 12px 12px 6px;
      margin-top: 8px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      color: #CBD5E1;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      position: relative;

      &:hover:not(.nav-item-disabled) {
        background-color: var(--sidebar-hover);
        color: var(--white);
      }

      &.active {
        background-color: var(--sidebar-active);
        color: var(--hot);
        font-weight: 600;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background-color: var(--hot);
          border-radius: 0 4px 4px 0;
        }
      }

      &.nav-item-disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .nav-icon {
      font-size: 16px;
    }

    .alert-badge {
      margin-left: auto;
      background-color: var(--danger);
      color: var(--white);
      font-size: 11px;
      font-weight: bold;
      padding: 2px 7px;
      border-radius: var(--radius-pill);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .iot-status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--ok);
      background-color: rgba(16, 185, 129, 0.12);
      padding: 6px 10px;
      border-radius: var(--radius-pill);
    }

    .live-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--ok);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* TOPBAR */
    .app-main-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .app-topbar {
      height: 70px;
      background-color: var(--white);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
    }

    .tag-version {
      background-color: var(--bg-alt);
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-pill);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    /* Selector de idioma i18n */
    .lang-selector {
      display: flex;
      align-items: center;
      gap: 4px;
      background-color: var(--bg-alt);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line);
    }

    .lang-btn {
      background: none;
      border: none;
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      cursor: pointer;
      padding: 2px 4px;

      &.active {
        color: var(--hot);
        font-weight: 700;
      }
    }

    .lang-divider {
      color: var(--line);
      font-size: 12px;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--ink);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.2;
    }

    .user-restaurant {
      font-size: 11px;
      color: var(--muted);
    }

    .logout-icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--line);
      background-color: var(--white);
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background-color: var(--danger-bg);
        color: var(--danger);
        border-color: var(--danger);
      }
    }

    .content-body {
      padding: 32px;
      flex: 1;
    }
  `]
})
export class MainLayoutComponent {
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private telemetryService = inject(TelemetryService);

  currentUser = this.authService.currentUser;
  currentLang = this.translationService.currentLang;
  criticalAlerts = this.telemetryService.criticalAlertsCount;

  t(key: string): string {
    return this.translationService.translate(key);
  }

  setLang(lang: Language) {
    this.translationService.setLanguage(lang);
  }

  logout() {
    this.authService.logout();
  }
}
