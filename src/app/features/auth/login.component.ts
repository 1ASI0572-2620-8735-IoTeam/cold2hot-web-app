import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <!-- Columna Izquierda: Branding y propuesta de valor (Figma W01) -->
      <div class="login-brand-panel">
        <div class="brand-header">
          <div class="logo-box">
            <img class="brand-logo" src="brand/logo-full.png" alt="Cold2Hot" />
          </div>
          <div class="brand-badge">IoT Platform</div>
        </div>

        <div class="brand-content">
          <h1 class="brand-hero-title">
            Custodia térmica inteligente en cada kilómetro.
          </h1>
          <p class="brand-hero-desc">
            {{ t('login_tagline') }}
          </p>

          <div class="features-list">
            <div class="feature-item">
              <span class="feature-check">✓</span>
              <span>{{ t('login_feature_1') }}</span>
            </div>
            <div class="feature-item">
              <span class="feature-check">✓</span>
              <span>{{ t('login_feature_2') }}</span>
            </div>
            <div class="feature-item">
              <span class="feature-check">✓</span>
              <span>{{ t('login_feature_3') }}</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <span>Cold2Hot Platform v1.0 · Universidad Peruana de Ciencias Aplicadas</span>
        </div>
      </div>

      <!-- Columna Derecha: Formulario de inicio de sesión -->
      <div class="login-form-panel">
        <div class="login-card">
          <div class="form-header">
            <h2 class="form-title">{{ mode === 'login' ? t('login_title') : mode === 'register' ? 'Crear cuenta de restaurante' : mode === 'forgot' ? 'Recuperar contraseña' : 'Nueva contraseña' }}</h2>
            <p class="form-desc" *ngIf="mode === 'login'">Ingresa tus credenciales de administrador</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group" *ngIf="mode === 'register'">
              <label for="restaurant">Nombre del restaurante</label>
              <div class="input-wrapper">
                <input id="restaurant" type="text" [(ngModel)]="restaurantName" name="restaurant" required placeholder="La Pérgola" class="custom-input" />
              </div>
            </div>

            <div class="form-group" *ngIf="mode !== 'reset'">
              <label for="email">{{ t('login_email') }}</label>
              <div class="input-wrapper">
                <input id="email" type="email" [(ngModel)]="email" name="email" required placeholder="admin@mirestaurante.pe" class="custom-input" />
              </div>
            </div>

            <div class="form-group" *ngIf="mode === 'reset'">
              <label for="token">Código de recuperación</label>
              <div class="input-wrapper">
                <input id="token" type="text" [(ngModel)]="resetToken" name="token" required class="custom-input" />
              </div>
            </div>

            <div class="form-group" *ngIf="mode !== 'forgot'">
              <div class="label-row">
                <label for="password">{{ mode === 'reset' ? 'Nueva contraseña' : t('login_password') }}</label>
                <a href="#" class="forgot-link" *ngIf="mode === 'login'" (click)="$event.preventDefault(); setMode('forgot')">{{ t('login_forgot') }}</a>
              </div>
              <div class="input-wrapper">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  [attr.minlength]="mode === 'login' ? null : 8"
                  placeholder="••••••••"
                  class="custom-input"
                />
                <button type="button" class="toggle-pwd-btn" (click)="showPassword = !showPassword">
                  {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
            </div>

            <p *ngIf="error" class="msg msg-error" role="alert">{{ error }}</p>
            <p *ngIf="info" class="msg msg-ok">{{ info }}</p>

            <button type="submit" class="btn btn-primary btn-submit" [disabled]="loading">
              {{ mode === 'login' ? t('login_submit') : mode === 'register' ? 'Registrar restaurante' : mode === 'forgot' ? 'Enviar instrucciones' : 'Restablecer contraseña' }}
            </button>

            <button *ngIf="mode === 'login'" type="button" class="btn btn-secondary btn-demo" [disabled]="loading" (click)="loginDemo()">
              {{ t('login_demo') }}
            </button>

            <button *ngIf="mode === 'login'" type="button" class="btn btn-ghost btn-demo" (click)="setMode('register')">
              ¿Primera vez? Registra tu restaurante
            </button>
            <button *ngIf="mode !== 'login'" type="button" class="btn btn-ghost btn-demo" (click)="setMode('login')">
              Volver a iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .brand-logo { width: 170px; height: auto; display: block; }
    .form-logo { display: none; }

    .msg { font-size: 13px; margin: 0; padding: 10px 12px; border-radius: var(--radius-sm); }
    .msg-error { background: var(--danger-bg); color: var(--danger-strong); }
    .msg-ok { background: var(--ok-bg); color: var(--ok-strong); }

    .login-wrapper {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      min-height: 100vh;
      background-color: var(--white);

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    /* Panel izquierdo de marca */
    .login-brand-panel {
      background-color: var(--ink);
      color: var(--white);
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(255,107,61,0.2) 0%, rgba(14,23,38,0) 70%);
        pointer-events: none;
      }

      @media (max-width: 900px) {
        display: none;
      }
    }

    .brand-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      font-size: 24px;
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      color: var(--white);
      letter-spacing: -0.5px;
    }

    .brand-badge {
      background-color: rgba(255, 107, 61, 0.2);
      color: var(--hot);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .brand-content {
      max-width: 480px;
    }

    .brand-hero-title {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 20px;
      color: var(--white);
    }

    .brand-hero-desc {
      font-size: 16px;
      color: #94A3B8;
      line-height: 1.6;
      margin-bottom: 36px;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: #CBD5E1;
    }

    .feature-check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--ok);
      color: var(--white);
      font-size: 12px;
      font-weight: bold;
    }

    .brand-footer {
      font-size: 12px;
      color: #64748B;
    }

    /* Panel derecho */
    .login-form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background-color: var(--bg);
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background-color: var(--white);
      border-radius: var(--radius-card);
      padding: 40px;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--line);
    }

    .form-header {
      margin-bottom: 32px;
    }

    .form-title {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }

    .form-desc {
      font-size: 14px;
      color: var(--muted);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

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

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 12px;
      color: var(--hot);
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .custom-input {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius-input);
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--ink);
      background-color: var(--white);
      transition: border-color 0.2s ease;

      &:focus {
        border-color: var(--hot);
        outline: none;
      }
    }

    .toggle-pwd-btn {
      position: absolute;
      right: 14px;
      background: none;
      border: none;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        color: var(--ink);
      }
    }

    .btn-submit {
      width: 100%;
      margin-top: 8px;
    }

    .btn-demo {
      width: 100%;
    }
  `]
})
export class LoginComponent {
  mode: 'login' | 'register' | 'forgot' | 'reset' = 'login';
  email = '';
  password = '';
  restaurantName = '';
  resetToken = '';
  showPassword = false;
  loading = false;
  error = '';
  info = '';

  constructor(
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  t(key: string): string {
    return this.translationService.translate(key);
  }

  setMode(mode: 'login' | 'register' | 'forgot' | 'reset') {
    this.mode = mode;
    this.error = '';
    this.info = '';
    this.password = '';
  }

  async onSubmit() {
    this.loading = true;
    this.error = '';
    this.info = '';
    if (this.mode === 'login') {
      const res = await this.authService.login(this.email, this.password);
      if (!res.ok) this.error = res.error || 'No se pudo iniciar sesión';
    } else if (this.mode === 'register') {
      const res = await this.authService.register(this.restaurantName, this.email, this.password);
      if (res.ok) {
        this.setMode('login');
        this.info = 'Restaurante registrado. Ya puedes iniciar sesión.';
      } else {
        this.error = res.error || 'No se pudo registrar';
      }
    } else if (this.mode === 'forgot') {
      const res = await this.authService.forgotPassword(this.email);
      if (!res.ok) {
        this.error = res.error || 'No se pudo procesar la solicitud';
      } else if (res.devResetToken) {
        // Entorno sin servidor de correo: el backend devuelve el código directamente.
        this.resetToken = res.devResetToken;
        this.setMode('reset');
        this.info = 'Código de recuperación generado (entorno de desarrollo). Ingresa tu nueva contraseña.';
      } else {
        this.info = 'Si el correo existe, se enviaron instrucciones para restablecer la contraseña.';
      }
    } else {
      const res = await this.authService.resetPassword(this.resetToken, this.password);
      if (res.ok) {
        this.setMode('login');
        this.info = 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.';
      } else {
        this.error = res.error || 'No se pudo restablecer la contraseña';
      }
    }
    this.loading = false;
  }

  loginDemo() {
    this.email = 'admin@mirestaurante.pe';
    this.password = 'password123';
    this.onSubmit();
  }
}
