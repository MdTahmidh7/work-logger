import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { WorkLogFormComponent } from './features/work-log/work-log-form.component';
import { WorkLogListPageComponent } from './features/work-log/work-log-list-page.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'work-log', component: WorkLogFormComponent },
  { path: 'logs', component: WorkLogListPageComponent },
  { path: 'edit/:id', component: WorkLogFormComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: 'dashboard' }
];
