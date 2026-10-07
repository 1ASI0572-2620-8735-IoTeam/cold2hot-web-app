import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { AlertItem } from '../../core/models/shipment.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-container">
      <div class="alerts-header">
        <div>
          <h2 class="section-title">{{ t('alerts_title') }}</h2>
          <p class="section-sub">Eventos de seguridad y anomalías térmicas reportadas por los sensores</p>
        </div>
      </div>

      <div class="alerts-list">
        <div *ngIf="alerts().length === 0" class="empty-card card">
          <span class="empty-icon">✓</span>
          <p>{{ t('alerts_empty') }}</p>
        </div>

        <div
          *ngFor="let alert of alerts()"
          class="alert-card card"
          [class.resolved]="alert.resolved"
          [class.critical-border]="alert.severity === 'CRITICAL' && !alert.resolved"
        >
          <div class="alert-icon-box" [ngClass]="alert.severity === 'CRITICAL' ? 'bg-danger-icon' : 'bg-warn-icon'">
            {{ alert.severity === 'CRITICAL' ? '🚨' : '⚠️' }}
          </div>

          <div class="alert-content">
            <div class="alert-top">
              <div class="alert-badges">
                <span
                  class="status-chip"
                  [ngClass]="alert.severity === 'CRITICAL' ? 'chip-danger' : 'chip-warn'"
                >
                  {{ alert.severity === 'CRITICAL' ? t('status_critical') : 'Advertencia' }}
                </span>
                <span class="chip-order">{{ alert.shipmentId }}</span>
                <span class="chip-box">{{ alert.smartBoxId }}</span>
              </div>
              <span class="alert-time">{{ alert.timestamp }}</span>
            </div>

            <p class="alert-message">{{ alert.message }}</p>

            <div class="alert-footer">
              <div *ngIf="alert.resolved" class="resolved-tag">
                ✓ {{ t('alert_resolved_badge') }}
              </div>
              <button
                *ngIf="!alert.resolved"
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="resolveAlert(alert.id)"
              >
                {{ t('alert_resolve') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alerts-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .alerts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--ink);
    }

    .section-sub {
      font-size: 14px;
      color: var(--muted);
      margin-top: 4px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .alert-card {
      display: flex;
      gap: 20px;
      padding: 20px 24px;
      transition: all 0.2s ease;

      &.critical-border {
        border-left: 5px solid var(--danger);
      }

      &.resolved {
        opacity: 0.6;
        background-color: #F8FAFC;
      }
    }

    .alert-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;

      &.bg-danger-icon { background-color: var(--danger-bg); }
      &.bg-warn-icon { background-color: var(--warn-bg); }
    }

    .alert-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alert-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chip-order, .chip-box {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 12px;
      background-color: var(--bg-alt);
      color: var(--ink-2);
      padding: 3px 8px;
      border-radius: 6px;
    }

    .alert-time {
      font-size: 12px;
      color: var(--muted);
    }

    .alert-message {
      font-size: 14px;
      color: var(--ink);
      line-height: 1.4;
    }

    .alert-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .resolved-tag {
      font-size: 12px;
      font-weight: 600;
      color: var(--ok);
      background-color: var(--ok-bg);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
    }

    .btn-sm {
      height: 34px;
      padding: 0 16px;
      font-size: 12px;
    }

    .empty-card {
      text-align: center;
      padding: 48px;
      color: var(--muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon {
      font-size: 36px;
      color: var(--ok);
    }
  `]
})
export class AlertsComponent {
  private translationService = inject(TranslationService);
  private telemetryService = inject(TelemetryService);

  alerts = this.telemetryService.alerts;

  t(key: string): string {
    return this.translationService.translate(key);
  }

  resolveAlert(id: string) {
    this.telemetryService.resolveAlert(id);
  }
}
