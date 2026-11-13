import { HttpClient } from '@angular/common/http';
import { RevealDirective } from '../../shared/reveal.directive';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { API } from '../../core/config/api.config';
import { Operator } from '../../core/models/shipment.model';
import { errorMessage } from '../../core/services/auth.service';

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [CommonModule, FormsModule, RevealDirective],
  template: `
    <div class="ops-container">
      <div class="ops-header">
        <div>
          <h2 class="section-title">Operadores de entrega</h2>
          <p class="section-sub">Repartidores asociados a tu restaurante</p>
        </div>
        <button class="btn btn-primary" (click)="showForm = !showForm">+ Nuevo operador</button>
      </div>

      <form *ngIf="showForm" class="card ops-form" (ngSubmit)="create()">
        <input class="ops-input" name="fullName" [(ngModel)]="fullName" placeholder="Nombre completo" required />
        <input class="ops-input" name="email" type="email" [(ngModel)]="email" placeholder="Correo electrónico" required />
        <input class="ops-input" name="password" type="password" minlength="8" [(ngModel)]="password" placeholder="Contraseña (mín. 8)" required />
        <button class="btn btn-primary" type="submit" [disabled]="saving">Crear</button>
        <span *ngIf="error" class="ops-error">{{ error }}</span>
      </form>

      <div class="card ops-table-card">
        <p *ngIf="loadError" class="ops-error pad">{{ loadError }}</p>
        <p *ngIf="!loadError && operators().length === 0" class="ops-empty">Aún no hay operadores registrados.</p>
        <table *ngIf="operators().length" class="ops-table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of operators(); let i = index" [appReveal]="i">
              <td>{{ o.name }}</td>
              <td>{{ o.email }}</td>
              <td class="right"><button class="btn btn-danger" (click)="remove(o)">Eliminar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .ops-container { display: flex; flex-direction: column; gap: 20px; }
    .ops-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .section-title { margin: 0; font-family: var(--font-display); font-size: 22px; }
    .section-sub { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
    .ops-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 16px; }
    .ops-input { flex: 1; min-width: 180px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-input); font-family: var(--font-body); }
    .ops-error { color: var(--danger-strong); font-size: 13px; }
    .ops-table-card { padding: 0; overflow: hidden; }
    .ops-table { width: 100%; border-collapse: collapse; }
    .ops-table th, .ops-table td { text-align: left; padding: 14px 18px; border-bottom: 1px solid var(--line); font-size: 14px; }
    .ops-table th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .right { text-align: right !important; }
    .ops-empty, .pad { padding: 24px; color: var(--muted); margin: 0; }
  `]
})
export class OperatorsComponent implements OnInit {
  private http = inject(HttpClient);

  operators = signal<Operator[]>([]);
  showForm = false;
  saving = false;
  fullName = '';
  email = '';
  password = '';
  error = '';
  loadError = '';

  ngOnInit() {
    this.load();
  }

  async load() {
    try {
      this.operators.set(await firstValueFrom(this.http.get<Operator[]>(`${API.iam}/operators`)));
      this.loadError = '';
    } catch (err) {
      this.loadError = errorMessage(err, 'No se pudieron cargar los operadores');
    }
  }

  async create() {
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(this.http.post(`${API.iam}/operators`, { fullName: this.fullName, email: this.email, password: this.password }));
      this.fullName = this.email = this.password = '';
      this.showForm = false;
      await this.load();
    } catch (err) {
      this.error = errorMessage(err, 'No se pudo crear el operador');
    }
    this.saving = false;
  }

  async remove(op: Operator) {
    if (!confirm(`¿Eliminar al operador ${op.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`${API.iam}/operators/${op.id}`));
      await this.load();
    } catch (err) {
      this.loadError = errorMessage(err, 'No se pudo eliminar el operador');
    }
  }
}
