import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './layout/main-layout.component';
import { MonitoringDashboardComponent } from './features/monitoring/monitoring-dashboard.component';
import { AlertsComponent } from './features/alerts/alerts.component';
import { SmartBoxesComponent } from './features/smartboxes/smartboxes.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    children: [
      {
        path: 'monitoring',
        component: MonitoringDashboardComponent
      },
      {
        path: 'alerts',
        component: AlertsComponent
      },
      {
        path: 'smartboxes',
        component: SmartBoxesComponent
      },
      {
        path: '',
        redirectTo: 'monitoring',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/dashboard/monitoring',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard/monitoring'
  }
];
