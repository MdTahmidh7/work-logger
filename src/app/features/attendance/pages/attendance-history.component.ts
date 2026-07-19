import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceFiltersComponent } from '../components/attendance-filters.component';
import { AttendanceHistoryTableComponent } from '../components/attendance-history-table.component';
import { AttendanceStatCardComponent } from '../components/attendance-stat-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-attendance-history',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule,
            AttendanceFiltersComponent, AttendanceHistoryTableComponent,
            AttendanceStatCardComponent],
  template: `
    <div class="history-wrapper">
      <div class="history-page">
        <div class="page-header">
          <div>
            <h1>Attendance History</h1>
            <p class="subtitle">{{ filteredRecords().length }} records</p>
          </div>
          <a routerLink="/attendance" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
            Dashboard
          </a>
        </div>

        <app-attendance-filters (rangeChange)="onFilterChange($event)" />

        <div class="stats-grid">
          <app-attendance-stat-card [data]="statsData()[0]" />
          <app-attendance-stat-card [data]="statsData()[1]" />
          <app-attendance-stat-card [data]="statsData()[2]" />
          <app-attendance-stat-card [data]="statsData()[3]" />
        </div>

        <div class="history-section">
          <app-attendance-history-table [records]="filteredRecords()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .history-page { padding-top: 82px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .back-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
      text-decoration: none; font-family: 'Inter', sans-serif;
    }
    .back-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); border-color: var(--pwl-primary); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

    .history-section {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      overflow: hidden;
    }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
    }
  `]
})
export class AttendanceHistoryPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);

  filteredRecords = signal<Attendance[]>([]);
  monthlyStats = signal<any>(null);

  statsData = computed(() => {
    const stats = this.monthlyStats();
    if (!stats) {
      return [
        { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '0', label: 'Present Days' },
        { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: '0h', label: 'Average Hours' },
        { icon: 'access_time', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '--', label: 'Earliest Punch In' },
        { icon: 'access_time', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: '--', label: 'Latest Punch Out' }
      ];
    }

    return [
      { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: stats.presentDays, label: 'Present Days' },
      { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: stats.averageWorkingHours.toFixed(1) + 'h', label: 'Average Hours' },
      { icon: 'access_time', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: this.formatTime(stats.earliestPunchIn), label: 'Earliest Punch In' },
      { icon: 'access_time', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: this.formatTime(stats.latestPunchOut), label: 'Latest Punch Out' }
    ];
  });

  async ngOnInit(): Promise<void> {
    const stats = await this.attendanceService.getMonthlyStatistics();
    this.monthlyStats.set(stats);
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    const records = await this.attendanceService.getAttendanceByDateRange(range.startDate, range.endDate);
    const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
    this.filteredRecords.set(sorted);

    const stats = await this.attendanceService.getMonthlyStatistics(range.startDate, range.endDate);
    this.monthlyStats.set(stats);
  }

  formatTime(time: string | null): string {
    if (!time || time === '--') return '--';
    if (time.includes(':') && time.length <= 5) {
      const [h, m] = time.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return time;
  }
}