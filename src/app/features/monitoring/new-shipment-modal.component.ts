import { IconComponent } from '../../shared/icon.component';
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { ThermalMode } from '../../core/models/shipment.model';

@Component({
  selector: 'app-new-shipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <!-- PANTALLA 1: FORMULARIO W06 -->
        <div *ngIf="!createdOtp" class="form-view">
          <div class="modal-header">
            <h2 class="modal-title">Nuevo envío</h2>
            <button class="close-x-btn" (click)="close()" aria-label="Cerrar"><app-icon name="x" [size]="18" /></button>
          </div>

          <form (ngSubmit)="onSubmit()" class="modal-form">
            <div class="form-group">
              <label for="box">Caja</label>
              <select id="box" [(ngModel)]="selectedBoxId" name="selectedBoxId" class="custom-select" required>
                <option value="" disabled>Elige una caja libre</option>
                <option *ngFor="let box of availableBoxes" [value]="box.id">{{ box.id }} · {{ box.batteryLevel }}%</option>
              </select>
            </div>

            <div class="form-group">
              <label for="addr">Dirección</label>
              <input
                id="addr"
                type="text"
                [(ngModel)]="deliveryAddress"
                name="deliveryAddress"
                required
                placeholder="Av. Primavera 120, Surco"
                class="custom-input"
              />
            </div>

            <div class="form-group">
              <label id="mode-label">Temperatura</label>
              <div class="profile-cards-grid" role="radiogroup" aria-labelledby="mode-label">
                <button type="button" role="radio" class="profile-card cold" [class.selected]="selectedMode === 'COLD'" [attr.aria-checked]="selectedMode === 'COLD'" (click)="selectMode('COLD')">
                  <app-icon name="snow" [size]="20" />
                  <span class="profile-name">Frío</span>
                </button>
                <button type="button" role="radio" class="profile-card hot" [class.selected]="selectedMode === 'HOT'" [attr.aria-checked]="selectedMode === 'HOT'" (click)="selectMode('HOT')">
                  <app-icon name="flame" [size]="20" />
                  <span class="profile-name">Caliente</span>
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="tmin">Mínimo °C</label>
                <input id="tmin" type="number" [(ngModel)]="minTemp" name="minTemp" class="custom-input" [class.cold]="selectedMode === 'COLD'" step="0.5" />
              </div>
              <div class="form-group">
                <label for="tmax">Máximo °C</label>
                <input id="tmax" type="number" [(ngModel)]="maxTemp" name="maxTemp" class="custom-input" [class.cold]="selectedMode === 'COLD'" step="0.5" />
              </div>
            </div>

            <p *ngIf="errorMsg" class="modal-error">{{ errorMsg }}</p>

            <!-- Botones de Acción -->
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="close()">
                {{ t('modal_cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="!deliveryAddress || !selectedBoxId || submitting">
                {{ t('modal_create') }}
              </button>
            </div>
          </form>
        </div>

        <!-- PANTALLA 2: OTP GENERADO W07 -->
        <div *ngIf="createdOtp" class="otp-view">
          <div class="otp-icon-header">
            <span class="success-check"><app-icon name="check" [size]="26" [stroke]="2.4" /></span>
          </div>

          <h2 class="otp-dialog-title">Envío creado</h2>
          <p class="otp-dialog-sub">Código de apertura para el receptor</p>

          <!-- Código OTP en tipografía Space Grotesk destacada -->
          <div class="otp-display-box">
            <span class="otp-digits">{{ createdOtp }}</span>
          </div>

          <p class="otp-expiry-hint">
            Un solo uso · Caja {{ selectedBoxId }}
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
    .modal-error { color: var(--danger-strong); font-size: 13px; margin: 8px 0 0; }

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
      max-width: 480px;
      background-color: var(--white);
      border-radius: var(--radius-card);
      box-shadow: 0 20px 40px -15px rgba(14, 23, 38, 0.3);
      padding: 28px;
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

    .modal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .form-group label { font-size: 13px; font-weight: 500; color: var(--muted); }

    .custom-input, .custom-select {
      width: 100%; min-width: 0; height: 46px; padding: 0 14px;
      border: 1px solid var(--line); border-radius: var(--radius-input);
      font-family: var(--font-body); font-size: 14px; color: var(--ink); background-color: var(--white);
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .custom-input:focus, .custom-select:focus { border-color: var(--ink); outline: none; box-shadow: 0 0 0 3px var(--bg-alt); }
    .custom-input.cold:focus { border-color: var(--cold-strong); }

    .profile-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .profile-card {
      display: flex; align-items: center; justify-content: center; gap: 10px; height: 48px;
      border: 1px solid var(--line); border-radius: var(--radius-input); background: var(--white);
      color: var(--ink-2); font: inherit; cursor: pointer; transition: all .2s ease;
    }
    .profile-card:hover { border-color: #CBD5E1; }
    .profile-card.hot.selected { border-color: var(--hot); background: var(--hot-bg); color: var(--hot-strong); }
    .profile-card.cold.selected { border-color: var(--cold); background: var(--cold-bg); color: var(--cold-strong); }
    .profile-name { font-size: 14px; font-weight: 600; }

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

  orderId = 'Se asigna al confirmar';
  deliveryAddress = '';
  selectedBoxId = '';
  selectedMode: ThermalMode = 'HOT';
  minTemp = 65;
  maxTemp = 80;

  createdOtp: string | null = null;
  copied = false;

  get availableBoxes() {
    return this.telemetryService.smartBoxes().filter(b => b.status === 'AVAILABLE' && b.batteryLevel >= 15);
  }

  constructor(
    private translationService: TranslationService,
    private telemetryService: TelemetryService,
    private prefs: PreferencesService
  ) {
    this.selectMode('HOT');
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  selectMode(mode: ThermalMode) {
    this.selectedMode = mode;
    const d = this.prefs.thermalDefaults();
    if (mode === 'HOT') {
      this.minTemp = d.hotMin;
      this.maxTemp = d.hotMax;
    } else {
      this.minTemp = d.coldMin;
      this.maxTemp = d.coldMax;
    }
  }

  submitting = false;
  errorMsg = '';

  async onSubmit() {
    this.submitting = true;
    this.errorMsg = '';
    const res = await this.telemetryService.createShipment({
      address: this.deliveryAddress,
      thermalMode: this.selectedMode,
      minTemp: this.minTemp,
      maxTemp: this.maxTemp,
      smartBoxId: this.selectedBoxId
    });

    this.submitting = false;
    if (res.ok && res.otpCode) {
      this.orderId = '#' + res.shipmentId;
      this.createdOtp = res.otpCode;
    } else {
      this.errorMsg = res.error || 'No se pudo crear el despacho';
    }
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
