import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceActionButtonComponent } from '../components/attendance-action-button.component';
import { TodayAttendanceCardComponent } from '../components/today-attendance-card.component';
import { AttendanceStatCardComponent } from '../components/attendance-stat-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-attendance-dashboard',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule,
            AttendanceActionButtonComponent, TodayAttendanceCardComponent,
            AttendanceStatCardComponent],
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard">
        <div class="page-header">
          <div>
            <h1>Attendance</h1>
            <p class="subtitle">Track your daily attendance</p>
          </div>
          <a routerLink="/attendance/history" class="history-btn">
            <mat-icon>history</mat-icon>
            History
          </a>
        </div>

        <div class="main-content">
          <div class="action-section">
            <app-attendance-action-button
              [attendance]="todayAttendance()"
              (action)="handleAction()" />
          </div>

          <div class="card-section">
            <app-today-attendance-card [attendance]="todayAttendance()" />
          </div>
        </div>

        <div class="stats-grid">
          <app-attendance-stat-card [data]="statsData()[0]" />
          <app-attendance-stat-card [data]="statsData()[1]" />
          <app-attendance-stat-card [data]="statsData()[2]" />
          <app-attendance-stat-card [data]="statsData()[3]" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .dashboard { padding-top: 82px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .history-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
      text-decoration: none; font-family: 'Inter', sans-serif;
    }
    .history-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); border-color: var(--pwl-primary); }
    .history-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .main-content {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .action-section {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 32px;
    }

    .card-section {
      min-width: 0;
    }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .main-content { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
    }
  `]
})
export class AttendanceDashboardPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);

  todayAttendance = signal<Attendance | null>(null);
  monthlyStats = signal<any>(null);

  statsData = computed(() => {
    const stats = this.monthlyStats();
    if (!stats) {
      return [
        { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '0', label: 'Present Days' },
        { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: '0', label: 'Absent Days' },
        { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: '0h', label: 'Total Working Hours' },
        { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: '0%', label: 'Attendance Percentage' }
      ];
    }

    return [
      { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: stats.presentDays, label: 'Present Days' },
      { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: stats.absentDays, label: 'Absent Days' },
      { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: stats.totalWorkingHours.toFixed(1) + 'h', label: 'Total Working Hours' },
      { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: stats.attendancePercentage.toFixed(0) + '%', label: 'Attendance Percentage' }
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);
    this.monthlyStats.set(await this.attendanceService.getMonthlyStatistics());
  }

  async handleAction(): Promise<void> {
    try {
      if (this.todayAttendance()) {
        await this.attendanceService.updatePunchOut();
        this.notify.success('Punch Out recorded successfully');
      } else {
        await this.attendanceService.createPunchIn();
        this.notify.success('Punch In recorded successfully');
      }
      await this.loadData();
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to record attendance');
    }
  }
}