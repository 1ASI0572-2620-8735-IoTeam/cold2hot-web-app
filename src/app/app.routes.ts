import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'monitoring', loadComponent: () => import('./features/monitoring/monitoring-dashboard.component').then(m => m.MonitoringDashboardComponent) },
      { path: 'alerts', loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'history', loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent) },
      { path: 'smartboxes', loadComponent: () => import('./features/smartboxes/smartboxes.component').then(m => m.SmartBoxesComponent) },
      { path: 'smartboxes/:id', loadComponent: () => import('./features/smartboxes/smartbox-detail.component').then(m => m.SmartBoxDetailComponent) },
      { path: 'operators', loadComponent: () => import('./features/operators/operators.component').then(m => m.OperatorsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
      { path: '', redirectTo: 'monitoring', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/dashboard/monitoring', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard/monitoring' }
];
