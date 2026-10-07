import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UserSession {
  email: string;
  name: string;
  restaurantName: string;
  role: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'c2h_auth_token';

  private userSignal = signal<UserSession | null>(this.getInitialUser());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = signal<boolean>(!!this.getInitialUser());

  constructor(private router: Router) {}

  private getInitialUser(): UserSession | null {
    const saved = localStorage.getItem(this.TOKEN_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default demo session for immediate preview
    return {
      email: 'admin@mirestaurante.pe',
      name: 'Diego R.',
      restaurantName: 'La Pergola Delivery',
      role: 'ADMINISTRATOR',
      token: 'jwt-demo-token-cold2hot'
    };
  }

  login(email: string, password: string):boolean {
    if (email && password) {
      const session: UserSession = {
        email,
        name: email.split('@')[0],
        restaurantName: 'La Pergola Delivery',
        role: 'ADMINISTRATOR',
        token: 'mock-jwt-token-' + Date.now()
      };
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(session));
      this.userSignal.set(session);
      this.isAuthenticated.set(true);
      this.router.navigate(['/dashboard/monitoring']);
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.userSignal.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
