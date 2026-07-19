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
import { format, subDays } from 'date-fns';

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
            Full History
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

        <div class="recent-section">
          <div class="section-header">
            <h2>Recent Attendance (Last 30 Days)</h2>
          </div>
          @if (recentRecords().length === 0) {
            <div class="empty-state">
              <mat-icon>event_busy</mat-icon>
              <h3>No attendance records</h3>
              <p>Start punching in to track your attendance.</p>
            </div>
          } @else {
            <div class="attendance-table">
              <div class="table-header">
                <div class="th">Date</div>
                <div class="th">Day</div>
                <div class="th">Punch In</div>
                <div class="th">Punch Out</div>
                <div class="th">Working Hour</div>
                <div class="th">Status</div>
              </div>
              @for (record of recentRecords(); track record.id) {
                <div class="table-row"
                     [class.workday]="!isWeekend(record.date)"
                     [class.friday]="isFriday(record.date)"
                     [class.saturday]="isSaturday(record.date)">
                  <div class="td">{{ formatDate(record.date) }}</div>
                  <div class="td day-cell" [class.holiday]="isFriday(record.date) || isSaturday(record.date)">
                    {{ getDayName(record.date) }}
                  </div>
                  <div class="td punch-in-cell">{{ formatTime(record.firstPunchIn) }}</div>
                  <div class="td punch-out-cell">
                    @if (record.lastPunchOut) {
                      {{ formatTime(record.lastPunchOut) }}
                    } @else {
                      --
                    }
                  </div>
                  <div class="td hours-cell">
                    <span class="hours-badge" [class.friday-badge]="isFriday(record.date)" [class.saturday-badge]="isSaturday(record.date)">
                      {{ formatWorkingHours(record.workingMinutes) }}
                    </span>
                  </div>
                  <div class="td">
                    <span class="status-badge" [class]="record.status">
                      {{ formatStatus(record.status) }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
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

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

    .recent-section {
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider); overflow: hidden;
    }
    .section-header { padding: 14px 20px; border-bottom: 1px solid var(--pwl-divider); }
    .section-header h2 { font-size: 15px; font-weight: 600; }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--pwl-text-tertiary); margin-bottom: 10px; }
    .empty-state h3 { font-size: 14px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 4px; }
    .empty-state p { color: var(--pwl-text-secondary); font-size: 13px; }

    .attendance-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 100px 90px 100px 100px 110px 100px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      background: var(--pwl-surface-variant);
    }

    .th {
      font-size: 11px;
      font-weight: 600;
      color: var(--pwl-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-row {
      display: grid;
      grid-template-columns: 100px 90px 100px 100px 110px 100px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.2s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.workday { background: rgba(13, 148, 136, 0.04); }
    .table-row.friday { background: rgba(255, 204, 0, 0.06); }
    .table-row.saturday { background: rgba(255, 107, 107, 0.06); }

    .td { font-size: 13px; color: var(--pwl-text-primary); }

    .day-cell { color: var(--pwl-text-secondary); font-size: 12px; }
    .day-cell.holiday { font-weight: 600; }

    .punch-in-cell { color: #0d9488; font-weight: 500; }
    .punch-out-cell { color: #dc2626; font-weight: 500; }

    .hours-badge {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 600;
      background: var(--pwl-primary-light); color: var(--pwl-primary);
    }
    .hours-badge.friday-badge { background: rgba(255, 204, 0, 0.15); color: #b38600; }
    .hours-badge.saturday-badge { background: rgba(255, 107, 107, 0.15); color: #cc3333; }

    .status-badge {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 600; text-transform: capitalize;
    }
    .status-badge.not_started { background: rgba(156, 163, 175, 0.15); color: #6b7280; }
    .status-badge.working { background: rgba(13, 148, 136, 0.15); color: #0d9488; }
    .status-badge.completed { background: rgba(34, 197, 94, 0.15); color: #16a34a; }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .main-content { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
      .table-header, .table-row {
        grid-template-columns: 80px 70px 80px 80px 90px 80px;
        padding: 8px 14px;
        font-size: 11px;
      }
    }
  `]
})
export class AttendanceDashboardPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);

  todayAttendance = signal<Attendance | null>(null);
  recentRecords = signal<Attendance[]>([]);
  monthlyStats = signal<any>(null);

  statsData = computed(() => {
    const stats = this.monthlyStats();
    if (!stats) {
      return [
        { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '0', label: 'Present Days' },
        { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: '0', label: 'Absent Days' },
        { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: '0h', label: 'Total Working Hours' },
        { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: '0%', label: 'Attendance %' }
      ];
    }

    return [
      { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: stats.presentDays, label: 'Present Days' },
      { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: stats.absentDays, label: 'Absent Days' },
      { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: stats.totalWorkingHours.toFixed(1) + 'h', label: 'Total Working Hours' },
      { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: stats.attendancePercentage.toFixed(0) + '%', label: 'Attendance %' }
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    const records = await this.attendanceService.getAttendanceByDateRange(startDate, endDate);
    this.recentRecords.set(records.sort((a, b) => b.date.localeCompare(a.date)));

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

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getDayName(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  formatWorkingHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ');
  }

  isWeekend(date: string): boolean {
    const day = new Date(date).getDay();
    return day === 0 || day === 5 || day === 6;
  }

  isFriday(date: string): boolean {
    return new Date(date).getDay() === 5;
  }

  isSaturday(date: string): boolean {
    return new Date(date).getDay() === 6;
  }
}