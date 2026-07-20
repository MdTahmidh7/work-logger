import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule,
            StatisticCardComponent, ChartCardComponent, DateFilterComponent,
            TodayAttendanceCardComponent, AttendanceActionButtonComponent],
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard">
        <div class="attendance-section">
          <div class="attendance-action-wrapper" [class.bg-punch-in]="!todayAttendance()" [class.bg-punch-out]="todayAttendance()">
            <app-attendance-action-button
              [attendance]="todayAttendance()"
              (action)="handleAttendanceAction()" />
          </div>
          <div class="attendance-card-wrapper">
            <app-today-attendance-card [attendance]="todayAttendance()" />
          </div>
        </div>

        <div class="stats-row">
          <div class="stats-section">
            <div class="stats-section-header">
              <mat-icon>people</mat-icon>
              <span>Attendance Statistics</span>
              <span class="stats-period">(Last 30 Days)</span>
            </div>
            <div class="stats-cards">
              <div class="stat-card">
                <div class="stat-icon present-bg">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Present</span>
                  <span class="stat-value present-color">{{ attendanceStats().presentDays }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon absent-bg">
                  <mat-icon>person_off</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Absent</span>
                  <span class="stat-value absent-color">{{ attendanceStats().absentDays }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon nfoh-bg">
                  <mat-icon>description</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total NFOH</span>
                  <span class="stat-value nfoh-color">{{ attendanceStats().nfohDays }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="stats-section">
            <div class="stats-section-header">
              <mat-icon>analytics</mat-icon>
              <span>Work Log Statistics</span>
              <span class="stats-period">(Last 30 Days)</span>
            </div>
            <div class="stats-cards">
              <div class="stat-card">
                <div class="stat-icon total-hours-bg">
                  <mat-icon>schedule</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Log Hours</span>
                  <span class="stat-value primary-color">{{ workLogStats().totalHours }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon today-hours-bg">
                  <mat-icon>calendar_today</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Log Hours Today</span>
                  <span class="stat-value primary-color">{{ workLogStats().todayHours }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon avg-hours-bg">
                  <mat-icon>trending_up</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Avg Log Hours / Day</span>
                  <span class="stat-value primary-color">{{ workLogStats().avgHours }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <app-date-filter (rangeChange)="onFilterChange($event)" />

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

      <a routerLink="/work-log" class="fab-button" matTooltip="Add Work Log">
        <mat-icon>add</mat-icon>
      </a>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
      position: relative;
    }
    .dashboard { padding-top: 82px; }

    .attendance-section {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .attendance-action-wrapper {
      border-radius: 14px;
      padding: 24px;
      transition: background 0.3s;
    }

    .attendance-action-wrapper.bg-punch-in {
      background: rgba(13, 148, 136, 0.06);
      border: 1px solid rgba(13, 148, 136, 0.12);
    }

    .attendance-action-wrapper.bg-punch-out {
      background: rgba(220, 38, 38, 0.06);
      border: 1px solid rgba(220, 38, 38, 0.12);
    }

    .attendance-card-wrapper { min-width: 0; }

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .stats-section {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 20px;
    }

    .stats-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 15px;
      font-weight: 600;
      color: var(--pwl-text-primary);
    }

    .stats-section-header mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pwl-primary);
    }

    .stats-period {
      font-size: 12px;
      font-weight: 400;
      color: var(--pwl-text-secondary);
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 10px;
      background: var(--pwl-surface-variant);
      border: 1px solid var(--pwl-divider);
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .present-bg { background: rgba(13, 148, 136, 0.12); color: #0d9488; }
    .absent-bg { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
    .nfoh-bg { background: rgba(217, 119, 6, 0.12); color: #d97706; }
    .total-hours-bg { background: rgba(103, 80, 164, 0.12); color: #6750a4; }
    .today-hours-bg { background: rgba(13, 148, 136, 0.12); color: #0d9488; }
    .avg-hours-bg { background: rgba(217, 119, 6, 0.12); color: #d97706; }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .stat-label {
      font-size: 11px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
      white-space: nowrap;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
    }

    .present-color { color: #0d9488; }
    .absent-color { color: #dc2626; }
    .nfoh-color { color: #d97706; }
    .primary-color { color: var(--pwl-primary); }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

    .recent-section {
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider); overflow: hidden;
    }
    .section-header { padding: 14px 20px; border-bottom: 1px solid var(--pwl-divider); }
    .section-header h2 { font-size: 15px; font-weight: 600; margin: 0; }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--pwl-text-tertiary); margin-bottom: 10px; }
    .empty-state h3 { font-size: 14px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 4px; }
    .empty-state p { color: var(--pwl-text-secondary); font-size: 13px; }

    .activity-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 90px 80px 1fr 90px 90px;
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
      grid-template-columns: 90px 80px 1fr 90px 90px;
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

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--pwl-divider);
    }
    .page-btn { width: 32px; height: 32px; color: var(--pwl-text-secondary); }
    .page-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .page-info { font-size: 13px; color: var(--pwl-text-secondary); font-weight: 500; }

    .fab-button {
      position: fixed;
      bottom: 32px;
      right: 32px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--pwl-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(103, 80, 164, 0.35);
      text-decoration: none;
      transition: all 0.3s;
      z-index: 100;
    }

    .fab-button:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 6px 24px rgba(103, 80, 164, 0.45);
    }

    .fab-button mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    @media (max-width: 1024px) {
      .charts-row { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .attendance-section { grid-template-columns: 1fr; }
      .table-header, .table-row {
        grid-template-columns: 70px 60px 1fr 70px 70px;
        padding: 8px 14px;
      }
      .fab-button { bottom: 20px; right: 20px; width: 50px; height: 50px; }
      .fab-button mat-icon { font-size: 24px; width: 24px; height: 24px; }
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
  attendanceRecords = signal<Attendance[]>([]);

  statsData = computed(() => {
    const all = this.logs();
    const totalMinutes = all.reduce((s, l) => s + l.durationMinutes, 0);
    const days = new Set(all.map(l => l.date));
    const avg = days.size > 0 ? totalMinutes / 60 / days.size : 0;

    const today = this.dateUtils.today();
    const todayMinutes = all.filter(l => l.date === today).reduce((s, l) => s + l.durationMinutes, 0);

    return [
      {
        icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)',
        valueColor: '#6750a4', value: (totalMinutes / 60).toFixed(1) + 'h', label: 'Total Hours'
      },
      {
        icon: 'today', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)',
        valueColor: '#0d9488', value: (todayMinutes / 60).toFixed(1) + 'h', label: 'Today\'s Hours'
      },
      {
        icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)',
        valueColor: '#d97706', value: avg.toFixed(1) + 'h', label: 'Avg Hours/Day'
      }
    ];
  });

  attendanceStats = computed(() => {
    const records = this.attendanceRecords();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalDays = 30;
    let presentDays = 0;
    let nfohDays = 0;

    records.forEach((att) => {
      if (att.workingMinutes >= 420) {
        presentDays++;
      } else {
        nfohDays++;
      }
    });

    const absentDays = totalDays - presentDays - nfohDays;
    return { presentDays, absentDays, nfohDays };
  });

  workLogStats = computed(() => {
    const logs = this.logs();
    const today = this.dateUtils.today();
    const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);
    const todayMinutes = logs.filter(l => l.date === today).reduce((s, l) => s + l.durationMinutes, 0);
    const days = new Set(logs.map(l => l.date));
    const avgMinutes = days.size > 0 ? totalMinutes / days.size : 0;

    return {
      totalHours: (totalMinutes / 60).toFixed(1) + 'h',
      todayHours: this.formatWorkingHours(todayMinutes),
      avgHours: (avgMinutes / 60).toFixed(2) + 'h'
    };
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    this.attendanceRecords.set(await this.attendanceService.getAttendanceByDateRange(startDate, endDate));
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

  formatShortDate(date: string): string {
    return this.dateUtils.formatShortDate(date);
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }

  formatWorkingHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
