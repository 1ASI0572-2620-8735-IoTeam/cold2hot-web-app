import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { ThermalMode } from '../../core/models/shipment.model';

@Component({
  selector: 'app-new-shipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <!-- PANTALLA 1: FORMULARIO W06 -->
        <div *ngIf="!createdOtp" class="form-view">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">{{ t('modal_title') }}</h2>
              <p class="modal-subtitle">Asigna una SmartBox con control térmico garantizado</p>
            </div>
            <button class="close-x-btn" (click)="close()">✕</button>
          </div>

          <form (ngSubmit)="onSubmit()" class="modal-form">
            <!-- ID y Dirección -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>{{ t('modal_order_id') }}</label>
                <input
                  type="text"
                  [(ngModel)]="orderId"
                  name="orderId"
                  readonly
                  class="custom-input bg-disabled"
                />
              </div>

              <div class="form-group flex-2">
                <label>{{ t('modal_select_box') }}</label>
                <select [(ngModel)]="selectedBoxId" name="selectedBoxId" class="custom-select" required>
                  <option *ngFor="let box of availableBoxes" [value]="box.id">
                    {{ box.id }} · {{ box.serialNumber }} (Batería: {{ box.batteryLevel }}%)
                  </option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>{{ t('modal_address') }}</label>
              <input
                type="text"
                [(ngModel)]="deliveryAddress"
                name="deliveryAddress"
                required
                placeholder="Ej. Av. Primavera 120, Surco"
                class="custom-input"
              />
            </div>

            <!-- Perfil Térmico Visual -->
            <div class="form-group">
              <label>{{ t('modal_thermal_profile') }}</label>
              <div class="profile-cards-grid">
                <!-- Tarjeta Frío -->
                <div
                  class="profile-card"
                  [class.selected]="selectedMode === 'COLD'"
                  (click)="selectMode('COLD')"
                >
                  <div class="profile-icon cold-icon">❄️</div>
                  <div class="profile-info">
                    <div class="profile-name">Modo Frío</div>
                    <div class="profile-desc">{{ t('modal_cold_desc') }}</div>
                  </div>
                </div>

                <!-- Tarjeta Caliente -->
                <div
                  class="profile-card"
                  [class.selected]="selectedMode === 'HOT'"
                  (click)="selectMode('HOT')"
                >
                  <div class="profile-icon hot-icon">🔥</div>
                  <div class="profile-info">
                    <div class="profile-name">Modo Caliente</div>
                    <div class="profile-desc">{{ t('modal_hot_desc') }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ajuste de Rangos Min / Max -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>{{ t('modal_min_temp') }}</label>
                <input
                  type="number"
                  [(ngModel)]="minTemp"
                  name="minTemp"
                  class="custom-input"
                  step="0.5"
                />
              </div>

              <div class="form-group flex-1">
                <label>{{ t('modal_max_temp') }}</label>
                <input
                  type="number"
                  [(ngModel)]="maxTemp"
                  name="maxTemp"
                  class="custom-input"
                  step="0.5"
                />
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="close()">
                {{ t('modal_cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="!deliveryAddress || !selectedBoxId">
                {{ t('modal_create') }}
              </button>
            </div>
          </form>
        </div>

        <!-- PANTALLA 2: OTP GENERADO W07 -->
        <div *ngIf="createdOtp" class="otp-view">
          <div class="otp-icon-header">
            <span class="success-check">✓</span>
          </div>

          <h2 class="otp-dialog-title">{{ t('otp_dialog_title') }}</h2>
          <p class="otp-dialog-sub">{{ t('otp_subtitle') }}</p>

          <!-- Código OTP en tipografía Space Grotesk destacada -->
          <div class="otp-display-box">
            <span class="otp-digits">{{ createdOtp }}</span>
          </div>

          <p class="otp-expiry-hint">
            Válido para un solo uso · Se transmitirá al microcontrolador ESP32 de la caja {{ selectedBoxId }}
          </p>

          <div class="otp-actions">
            <button type="button" class="btn btn-secondary" (click)="copyOtp()">
              {{ copied ? t('otp_copied') : t('otp_copy') }}
            </button>
            <button type="button" class="btn btn-primary" (click)="finishAndClose()">
              {{ t('otp_done') }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(14, 23, 38, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 560px;
      background-color: var(--white);
      border-radius: var(--radius-card);
      box-shadow: 0 20px 40px -15px rgba(14, 23, 38, 0.3);
      padding: 32px;
      animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
    }

    .modal-subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-top: 4px;
    }

    .close-x-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--muted);
      cursor: pointer;
      padding: 4px;

      &:hover {
        color: var(--ink);
      }
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-row {
      display: flex;
      gap: 14px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }
    }

    .custom-input, .custom-select {
      height: 46px;
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius-input);
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--ink);
      background-color: var(--white);

      &:focus {
        border-color: var(--hot);
        outline: none;
      }

      &.bg-disabled {
        background-color: var(--bg-alt);
        color: var(--muted);
      }
    }

    /* Tarjetas selectoras de modo térmico */
    .profile-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .profile-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 2px solid var(--line);
      border-radius: var(--radius-card);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #CBD5E1;
      }

      &.selected {
        border-color: var(--hot);
        background-color: rgba(255, 107, 61, 0.04);
      }
    }

    .profile-icon {
      font-size: 24px;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.cold-icon {
        background-color: var(--cold-bg);
      }

      &.hot-icon {
        background-color: var(--hot-bg);
      }
    }

    .profile-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }

    .profile-desc {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.3;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }

    /* PANTALLA OTP W07 */
    .otp-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px 0;
    }

    .otp-icon-header {
      margin-bottom: 16px;
    }

    .success-check {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--ok);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
    }

    .otp-dialog-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }

    .otp-dialog-sub {
      font-size: 14px;
      color: var(--muted);
      max-width: 380px;
      margin-bottom: 24px;
    }

    .otp-display-box {
      background-color: var(--ink);
      padding: 18px 40px;
      border-radius: var(--radius-card);
      margin-bottom: 16px;
      box-shadow: 0 8px 20px rgba(14, 23, 38, 0.2);
    }

    .otp-digits {
      font-family: var(--font-display);
      font-size: 40px;
      font-weight: 700;
      color: var(--white);
      letter-spacing: 6px;
    }

    .otp-expiry-hint {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 28px;
    }

    .otp-actions {
      display: flex;
      gap: 14px;
      width: 100%;
      justify-content: center;
    }
  `]
})
export class NewShipmentModalComponent {
  @Output() closed = new EventEmitter<void>();

  orderId = '#C2H-' + Math.floor(10000 + Math.random() * 90000);
  deliveryAddress = '';
  selectedBoxId = 'SB-002';
  selectedMode: ThermalMode = 'HOT';
  minTemp = 65.0;
  maxTemp = 80.0;

  createdOtp: string | null = null;
  copied = false;

  get availableBoxes() {
    return this.telemetryService.smartBoxes().filter(b => b.status === 'AVAILABLE');
  }

  constructor(
    private translationService: TranslationService,
    private telemetryService: TelemetryService
  ) {}

  t(key: string): string {
    return this.translationService.translate(key);
  }

  selectMode(mode: ThermalMode) {
    this.selectedMode = mode;
    if (mode === 'HOT') {
      this.minTemp = 65.0;
      this.maxTemp = 80.0;
    } else {
      this.minTemp = 2.0;
      this.maxTemp = 8.0;
    }
  }

  onSubmit() {
    const res = this.telemetryService.createShipment({
      address: this.deliveryAddress,
      thermalMode: this.selectedMode,
      minTemp: this.minTemp,
      maxTemp: this.maxTemp,
      smartBoxId: this.selectedBoxId
    });

    this.createdOtp = res.otpCode;
  }

  copyOtp() {
    if (this.createdOtp) {
      navigator.clipboard.writeText(this.createdOtp);
      this.copied = true;
      setTimeout(() => this.copied = false, 2500);
    }
  }

  finishAndClose() {
    this.closed.emit();
  }

  close() {
    this.closed.emit();
  }
}
