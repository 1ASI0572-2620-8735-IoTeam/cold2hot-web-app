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
            <span class="logo-icon">🔥❄️</span>
            <span class="brand-title">Cold2Hot</span>
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
            <h2 class="form-title">{{ t('login_title') }}</h2>
            <p class="form-desc">Ingresa tus credenciales de administrador</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email">{{ t('login_email') }}</label>
              <div class="input-wrapper">
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="admin@mirestaurante.pe"
                  class="custom-input"
                />
              </div>
            </div>

            <div class="form-group">
              <div class="label-row">
                <label for="password">{{ t('login_password') }}</label>
                <a href="#" class="forgot-link" (click)="$event.preventDefault()">{{ t('login_forgot') }}</a>
              </div>
              <div class="input-wrapper">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  class="custom-input"
                />
                <button
                  type="button"
                  class="toggle-pwd-btn"
                  (click)="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-submit">
              {{ t('login_submit') }}
            </button>

            <button
              type="button"
              class="btn btn-secondary btn-demo"
              (click)="loginDemo()"
            >
              {{ t('login_demo') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
  email = 'admin@mirestaurante.pe';
  password = 'password123';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  t(key: string): string {
    return this.translationService.translate(key);
  }

  onSubmit() {
    this.authService.login(this.email, this.password);
  }

  loginDemo() {
    this.authService.login('admin@mirestaurante.pe', 'demo1234');
  }
}
