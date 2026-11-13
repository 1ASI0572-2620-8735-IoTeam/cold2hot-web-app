import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API } from '../config/api.config';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  restaurantName: string;
  role: string;
  token: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Solo en entornos sin servidor de correo: token de recuperación devuelto por el backend. */
  devResetToken?: string;
}

export const errorMessage = (err: unknown, fallback = 'No se pudo conectar con el servidor'): string => {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return fallback;
    const body = err.error;
    if (body?.details) return Object.values(body.details).join('. ');
    if (body?.error) return body.error;
  }
  return fallback;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly SESSION_KEY = 'c2h_session';

  private userSignal = signal<UserSession | null>(this.readSession());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = () => this.userSignal() !== null;
  readonly token = () => this.userSignal()?.token ?? null;

  private readSession(): UserSession | null {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      return saved ? (JSON.parse(saved) as UserSession) : null;
    } catch {
      return null;
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await firstValueFrom(this.http.post<{ token: string; user: Omit<UserSession, 'token'> }>(`${API.iam}/auth/login`, { email, password }));
      const session: UserSession = { ...res.user, token: res.token };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      this.userSignal.set(session);
      this.router.navigate(['/dashboard/monitoring']);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  async register(restaurantName: string, email: string, password: string): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${API.iam}/auth/register`, { admin: { name: email.split('@')[0], email, password }, restaurant: { name: restaurantName } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  async forgotPassword(email: string): Promise<AuthResult> {
    try {
      const res = await firstValueFrom(this.http.post<{ devResetToken?: string }>(`${API.iam}/auth/forgot-password`, { email }));
      return { ok: true, devResetToken: res.devResetToken };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${API.iam}/auth/reset-password`, { token, newPassword }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }
}
