import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { SmartBox } from '../../core/models/shipment.model';

@Component({
  selector: 'app-smartboxes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smartboxes-container">
      <div class="smartboxes-header">
        <div>
          <h2 class="section-title">{{ t('boxes_title') }}</h2>
          <p class="section-sub">Parque de contenedores físicos y estado de microcontroladores ESP32 en ruta</p>
        </div>
        <button class="btn btn-primary" (click)="registerBoxPrompt()">
          {{ t('boxes_register_btn') }}
        </button>
      </div>

      <div class="boxes-grid">
        <div *ngFor="let box of smartBoxes()" class="box-card card">
          <div class="box-top">
            <div class="box-id-tag font-display">{{ box.id }}</div>
            <span
              class="status-chip"
              [ngClass]="box.status === 'AVAILABLE' ? 'chip-ok' : box.status === 'IN_TRANSIT' ? 'chip-cold' : 'chip-warn'"
            >
              <span class="chip-dot"></span>
              {{ box.status === 'AVAILABLE' ? t('box_status_avail') : box.status === 'IN_TRANSIT' ? t('box_status_transit') : t('box_status_maint') }}
            </span>
          </div>

          <div class="box-meta">
            <div class="meta-row">
              <span class="meta-label">Número de Serie:</span>
              <span class="meta-val">{{ box.serialNumber }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">{{ t('box_mac') }}:</span>
              <span class="meta-val code-text">{{ box.macAddress }}</span>
            </div>
            <div class="meta-row" *ngIf="box.assignedShipmentId">
              <span class="meta-label">Envío Asignado:</span>
              <span class="meta-val font-display text-hot">{{ box.assignedShipmentId }}</span>
            </div>
          </div>

          <div class="box-bottom">
            <div class="battery-indicator">
              <span class="battery-label">Batería:</span>
              <div class="battery-mini-bar">
                <div
                  class="battery-mini-fill"
                  [style.width.%]="box.batteryLevel"
                  [ngClass]="box.batteryLevel < 20 ? 'bg-danger' : box.batteryLevel < 50 ? 'bg-warn' : 'bg-ok'"
                ></div>
              </div>
              <span class="battery-pct">{{ box.batteryLevel }}%</span>
            </div>
            <span class="heartbeat-text">Latido: {{ box.lastHeartbeat }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .smartboxes-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .smartboxes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
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

    .boxes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .box-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-2px);
      }
    }

    .box-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .box-id-tag {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
    }

    .box-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .meta-label {
      color: var(--muted);
    }

    .meta-val {
      font-weight: 600;
      color: var(--ink);
    }

    .code-text {
      font-family: monospace;
      font-size: 11px;
      background-color: var(--bg-alt);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .text-hot {
      color: var(--hot);
    }

    .box-bottom {
      border-top: 1px solid var(--line);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .battery-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .battery-mini-bar {
      width: 32px;
      height: 6px;
      background-color: var(--bg-alt);
      border-radius: 3px;
      overflow: hidden;
    }

    .battery-mini-fill {
      height: 100%;
      border-radius: 3px;
      &.bg-ok { background-color: var(--ok); }
      &.bg-warn { background-color: var(--warn); }
      &.bg-danger { background-color: var(--danger); }
    }

    .battery-pct {
      font-weight: 600;
      color: var(--ink);
    }

    .heartbeat-text {
      color: var(--muted);
      font-size: 11px;
    }
  `]
})
export class SmartBoxesComponent {
  private translationService = inject(TranslationService);
  private telemetryService = inject(TelemetryService);

  smartBoxes = this.telemetryService.smartBoxes;

  t(key: string): string {
    return this.translationService.translate(key);
  }

  registerBoxPrompt() {
    alert('Función de emparejamiento con nuevo ESP32 NodeMCU disponible para registro.');
  }
}
