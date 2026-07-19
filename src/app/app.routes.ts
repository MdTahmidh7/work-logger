import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { WorkLogFormComponent } from './features/work-log/work-log-form.component';
import { WorkLogListPageComponent } from './features/work-log/work-log-list-page.component';
import { SettingsComponent } from './features/settings/settings.component';
import { AttendanceDashboardPageComponent } from './features/attendance/pages/attendance-dashboard.component';
import { AttendanceHistoryPageComponent } from './features/attendance/pages/attendance-history.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'work-log', component: WorkLogFormComponent },
  { path: 'logs', component: WorkLogListPageComponent },
  { path: 'edit/:id', component: WorkLogFormComponent },
  { path: 'attendance', component: AttendanceDashboardPageComponent },
  { path: 'attendance/history', component: AttendanceHistoryPageComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: 'dashboard' }
];