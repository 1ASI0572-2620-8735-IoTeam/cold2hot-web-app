import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts unauthenticated and stores the session after a successful login', async () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    expect(auth.isAuthenticated()).toBe(false);

    const pending = auth.login('admin@mirestaurante.pe', 'password123');
    const req = http.expectOne(r => r.url.endsWith('/iam/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'jwt-token',
      user: { id: 'USR-001', email: 'admin@mirestaurante.pe', name: 'Diego R.', role: 'ADMINISTRATOR', restaurantName: 'La Pergola' }
    });

    expect((await pending).ok).toBe(true);
    expect(auth.token()).toBe('jwt-token');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('reports the backend error message when the login is rejected', async () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    const pending = auth.login('x@y.pe', 'bad');
    http.expectOne(r => r.url.endsWith('/iam/auth/login')).flush({ error: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    const res = await pending;
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Credenciales inválidas');
    expect(auth.isAuthenticated()).toBe(false);
  });
});
