import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './layout/main-layout.component';
import { MonitoringDashboardComponent } from './features/monitoring/monitoring-dashboard.component';
import { AlertsComponent } from './features/alerts/alerts.component';
import { SmartBoxesComponent } from './features/smartboxes/smartboxes.component';
import { HistoryComponent } from './features/history/history.component';
import { OperatorsComponent } from './features/operators/operators.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'monitoring', component: MonitoringDashboardComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'smartboxes', component: SmartBoxesComponent },
      { path: 'operators', component: OperatorsComponent },
      { path: '', redirectTo: 'monitoring', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/dashboard/monitoring', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard/monitoring' }
];
