import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StatisticCardComponent } from '../../shared/components/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { TodayAttendanceCardComponent } from '../attendance/components/today-attendance-card.component';
import { AttendanceActionButtonComponent } from '../attendance/components/attendance-action-button.component';
import { db } from '../../core/database/database.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkLog } from '../../core/models/work-log.model';
import { Attendance } from '../attendance/models/attendance.model';
import { AttendanceService } from '../attendance/services/attendance.service';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule,
            StatisticCardComponent, ChartCardComponent, DateFilterComponent,
            TodayAttendanceCardComponent, AttendanceActionButtonComponent],
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard">
        <div class="page-header">
          <div>
            <h1>Dashboard</h1>
            <p class="subtitle">Overview of your work activity</p>
          </div>
          <div class="header-actions">
            @if (groupedLogs().length > 0) {
              <button class="download-btn" (click)="downloadExcel()">
                <mat-icon>download</mat-icon>
                Export Excel
              </button>
            }
            <a routerLink="/work-log" class="add-btn">
              <mat-icon>add</mat-icon>
              Add Work Log
            </a>
          </div>
        </div>

        <div class="attendance-section">
          <div class="attendance-action-wrapper">
            <app-attendance-action-button
              [attendance]="todayAttendance()"
              (action)="handleAttendanceAction()" />
          </div>
          <div class="attendance-card-wrapper">
            <app-today-attendance-card [attendance]="todayAttendance()" />
          </div>
        </div>

        <app-date-filter (rangeChange)="onFilterChange($event)" />

        <div class="stats-grid">
          <app-statistic-card [data]="statsData()[0]" />
          <app-statistic-card [data]="statsData()[1]" />
          <app-statistic-card [data]="statsData()[2]" />
        </div>

        <div class="charts-row">
          <app-chart-card title="Hours by Hour (Today)" type="bar"
                          [labels]="hourlyLabels()" [datasets]="hourlyDataset()"
                          chartColor="#6750a4" />
          <app-chart-card title="Hours by Day (Week)" type="bar"
                          [labels]="weeklyLabels()" [datasets]="weeklyDataset()"
                          chartColor="#0d9488" />
        </div>

        <div class="recent-section">
          <div class="section-header">
            <h2>Recent Activity</h2>
          </div>
          @if (groupedLogs().length === 0) {
            <div class="empty-state">
              <mat-icon>schedule</mat-icon>
              <h3>No logs yet</h3>
              <p>Start tracking your work activity.</p>
            </div>
          } @else {
            <div class="activity-table">
              <div class="table-header">
                <div class="th">Date</div>
                <div class="th">Day</div>
                <div class="th">Task Items</div>
                <div class="th">Log Hours</div>
                <div class="th">Total Hours</div>
                <div class="th"></div>
              </div>
              @for (group of pagedLogs(); track group.date) {
                <div class="table-row"
                     [class.friday]="group.isFriday"
                     [class.saturday]="group.isSaturday"
                     [class.workday]="!group.isFriday && !group.isSaturday">
                  <div class="td">{{ formatShortDate(group.date) }}</div>
                  <div class="td day-cell" [class.holiday]="group.isFriday || group.isSaturday">{{ group.dayName }}</div>
                  <div class="td tasks-cell">
                    @for (log of group.logs; track log.id) {
                      <div class="task-item">{{ log.title }}</div>
                    }
                  </div>
                  <div class="td hours-cell">
                    @for (log of group.logs; track log.id) {
                      <div class="hour-item">{{ formatDuration(log.durationMinutes) }}</div>
                    }
                  </div>
                  <div class="td total-cell">
                    <span class="total-badge" [class.friday-badge]="group.isFriday" [class.saturday-badge]="group.isSaturday">
                      {{ group.totalHours }}
                    </span>
                  </div>
                  <div class="td actions-cell">
                    <a [routerLink]="['/edit', group.logs[0].id]" class="edit-link">
                      <mat-icon class="edit-icon">edit</mat-icon>
                    </a>
                  </div>
                </div>
              }
            </div>
            @if (totalPages() > 1) {
              <div class="pagination">
                <button mat-icon-button class="page-btn" [disabled]="currentPage() === 0" (click)="prevPage()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="page-info">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
                <button mat-icon-button class="page-btn" [disabled]="currentPage() >= totalPages() - 1" (click)="nextPage()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            }
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
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .header-actions { display: flex; align-items: center; gap: 10px; }

    .download-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .download-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); border-color: var(--pwl-primary); }
    .download-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .add-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px;
      border-radius: 10px; background: var(--pwl-primary); color: white;
      font-weight: 600; font-size: 13px; text-decoration: none; transition: all 0.2s;
    }
    .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

    .attendance-section {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .attendance-action-wrapper {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .attendance-card-wrapper {
      min-width: 0;
    }

    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }

    .recent-section {
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider); overflow: hidden;
    }
    .section-header { padding: 14px 20px; border-bottom: 1px solid var(--pwl-divider); }
    .section-header h2 { font-size: 15px; font-weight: 600; }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--pwl-text-tertiary); margin-bottom: 10px; }
    .empty-state h3 { font-size: 14px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 4px; }
    .empty-state p { color: var(--pwl-text-secondary); font-size: 13px; }

    .activity-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 90px 80px 1fr 90px 90px 40px;
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
      grid-template-columns: 90px 80px 1fr 90px 90px 40px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.2s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.workday { background: rgba(13, 148, 136, 0.04); }
    .table-row.workday:hover { background: rgba(13, 148, 136, 0.08); }

    .table-row.friday { background: rgba(255, 204, 0, 0.06); }
    .table-row.friday:hover { background: rgba(255, 204, 0, 0.12); }

    .table-row.saturday { background: rgba(255, 107, 107, 0.06); }
    .table-row.saturday:hover { background: rgba(255, 107, 107, 0.12); }

    .td { font-size: 13px; color: var(--pwl-text-primary); }

    .day-cell { color: var(--pwl-text-secondary); font-size: 12px; }
    .day-cell.holiday { font-weight: 600; }

    .tasks-cell { display: flex; flex-direction: column; gap: 3px; }

    .task-item {
      font-size: 13px; font-weight: 500; color: var(--pwl-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .hours-cell { display: flex; flex-direction: column; gap: 3px; }

    .hour-item { font-size: 12px; color: var(--pwl-text-secondary); }

    .total-cell { text-align: center; }

    .total-badge {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 600;
      background: var(--pwl-primary-light); color: var(--pwl-primary);
    }
    .total-badge.friday-badge { background: rgba(255, 204, 0, 0.15); color: #b38600; }
    .total-badge.saturday-badge { background: rgba(255, 107, 107, 0.15); color: #cc3333; }

    .actions-cell { display: flex; justify-content: center; align-items: center; }

    .edit-link {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      color: var(--pwl-text-secondary); transition: all 0.2s;
      text-decoration: none;
    }
    .edit-link:hover { background: var(--pwl-primary-light); color: var(--pwl-primary); }
    .edit-icon { font-size: 18px; width: 18px; height: 18px; }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--pwl-divider);
    }
    .page-btn { width: 32px; height: 32px; color: var(--pwl-text-secondary); }
    .page-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .page-info { font-size: 13px; color: var(--pwl-text-secondary); font-weight: 500; }

    @media (max-width: 1024px) {
      .charts-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
      .header-actions { width: 100%; }
      .download-btn, .add-btn { flex: 1; justify-content: center; }
      .attendance-section { grid-template-columns: 1fr; }
      .table-header, .table-row {
        grid-template-columns: 70px 60px 1fr 70px 70px 36px;
        padding: 8px 14px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private dateUtils = inject(DateUtilsService);
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private readonly PAGE_SIZE = 7;

  logs = signal<WorkLog[]>([]);
  currentPage = signal(0);
  todayAttendance = signal<Attendance | null>(null);

  statsData = computed(() => {
    const all = this.logs();
    const totalMinutes = all.reduce((s, l) => s + l.durationMinutes, 0);
    const days = new Set(all.map(l => l.date));
    const avg = days.size > 0 ? totalMinutes / 60 / days.size : 0;

    const today = this.dateUtils.today();
    const todayMinutes = all.filter(l => l.date === today).reduce((s, l) => s + l.durationMinutes, 0);

    return [
      {
        icon: 'schedule',
        iconColor: '#6750a4',
        iconBg: 'rgba(103, 80, 164, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)',
        valueColor: '#6750a4',
        value: (totalMinutes / 60).toFixed(1) + 'h',
        label: 'Total Hours'
      },
      {
        icon: 'today',
        iconColor: '#0d9488',
        iconBg: 'rgba(13, 148, 136, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)',
        valueColor: '#0d9488',
        value: (todayMinutes / 60).toFixed(1) + 'h',
        label: 'Today\'s Hours'
      },
      {
        icon: 'trending_up',
        iconColor: '#d97706',
        iconBg: 'rgba(217, 119, 6, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)',
        valueColor: '#d97706',
        value: avg.toFixed(1) + 'h',
        label: 'Avg Hours/Day'
      }
    ];
  });

  hourlyLabels = computed(() => Array.from({ length: 24 }, (_, i) => `${i}:00`));

  hourlyDataset = computed(() => {
    const today = this.dateUtils.today();
    const todayLogs = this.logs().filter(l => l.date === today);
    const hourlyData = new Array(24).fill(0);
    for (const log of todayLogs) {
      const hour = new Date(log.createdAt).getHours();
      hourlyData[hour] += log.durationMinutes / 60;
    }
    return [{ label: 'Hours', data: hourlyData.map(h => +h.toFixed(1)), color: '#6750a4' }];
  });

  weeklyLabels = computed(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

  weeklyDataset = computed(() => {
    const weeklyData = new Array(7).fill(0);
    for (const log of this.logs()) {
      weeklyData[new Date(log.date).getDay()] += log.durationMinutes / 60;
    }
    return [{ label: 'Hours', data: weeklyData.map(h => +h.toFixed(1)), color: '#0d9488' }];
  });

  groupedLogs = computed(() => {
    const logs = this.logs().slice(-50);
    const groups: { [key: string]: WorkLog[] } = {};
    for (const log of logs) {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        logs: groups[date],
        dayName: this.dateUtils.getDayName(date),
        totalHours: this.dateUtils.formatDuration(groups[date].reduce((s, l) => s + l.durationMinutes, 0)),
        isFriday: this.dateUtils.isFriday(date),
        isSaturday: this.dateUtils.isSaturday(date)
      }));
  });

  totalPages = computed(() => Math.ceil(this.groupedLogs().length / this.PAGE_SIZE));

  pagedLogs = computed(() => {
    const start = this.currentPage() * this.PAGE_SIZE;
    return this.groupedLogs().slice(start, start + this.PAGE_SIZE);
  });

  async ngOnInit(): Promise<void> {
    const range = this.dateUtils.getDateRange('thisMonth');
    this.logs.set(await db.getLogsByRange(range.startDate, range.endDate));
    this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.currentPage.set(0);
    this.logs.set(await db.getLogsByRange(range.startDate, range.endDate));
  }

  async handleAttendanceAction(): Promise<void> {
    try {
      if (this.todayAttendance()) {
        await this.attendanceService.updatePunchOut();
        this.notify.success('Punch Out recorded successfully');
      } else {
        await this.attendanceService.createPunchIn();
        this.notify.success('Punch In recorded successfully');
      }
      this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to record attendance');
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) this.currentPage.update(p => p + 1);
  }

  downloadExcel(): void {
    const rows = this.groupedLogs().flatMap(group =>
      group.logs.map(log => ({
        'Date': group.date,
        'Day': group.dayName,
        'Task Item': log.title,
        'Details': log.details || '',
        'Log Hours': this.dateUtils.formatDuration(log.durationMinutes),
        'Log Minutes': log.durationMinutes,
        'Total Day Hours': group.totalHours
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Logs');

    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 30 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }
    ];

    const fileName = `work-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  formatShortDate(date: string): string {
    return this.dateUtils.formatShortDate(date);
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }
}