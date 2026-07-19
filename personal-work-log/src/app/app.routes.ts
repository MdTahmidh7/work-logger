import { Route } from '@angular/router';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { WorkLogFormComponent } from '../features/work-log/work-log-form.component';
import { SettingsComponent } from '../features/settings/settings.component';

export const routes: Route[] = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, title: 'Dashboard' },
  { path: 'work-log', component: WorkLogFormComponent, title: 'Add Work Log' },
  { path: 'edit/:id', component: WorkLogFormComponent, title: 'Edit Work Log' },
  { path: 'settings', component: SettingsComponent, title: 'Settings' }
];
