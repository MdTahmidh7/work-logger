import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [noAuthGuard],
  },

  { path: 'logs', redirectTo: 'work-log' },

  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'work-log',
    loadComponent: () => import('./features/work-log/work-log-form.component').then(m => m.WorkLogFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./features/work-log/work-log-form.component').then(m => m.WorkLogFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'attendance',
    loadComponent: () => import('./features/attendance/pages/attendance-dashboard.component').then(m => m.AttendanceDashboardPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'attendance/history',
    loadComponent: () => import('./features/attendance/pages/attendance-history.component').then(m => m.AttendanceHistoryPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'attendance/edit/:date',
    loadComponent: () => import('./features/attendance/pages/attendance-edit.component').then(m => m.AttendanceEditPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard],
  },

  { path: '**', redirectTo: 'dashboard' },
];
